import asyncHandler from "express-async-handler";
import CartModel from "../models/Cart.model.js";
import UserModel from "../models/User.model.js";
import OrderModel from "../models/order.model.js";
import ApiError from "../utils/apiError.js";
import DrugModel from "../models/Drug.model.js";

/**
 * @desc    Create cash order
 * @route   POST /api/v1/orders/cardId
 * @access  Protected/User
 */
const createCashOrder = asyncHandler(async (req, res, next) => {
  const { cartId } = req.params;
  const { inventoryId } = req.body;

  // 1) Get cart and specific inventory items
  const cart = await CartModel.findOne({
    _id: cartId,
    pharmacy: req.user._id,
  });

  if (!cart) {
    return next(new ApiError("Cart not found", 404));
  }

  // Find the specific inventory items in cart
  const inventoryItems = cart.items.find(
    (item) => item.inventory.toString() === inventoryId
  );

  if (!inventoryItems) {
    return next(new ApiError("This inventory is not in your cart", 404));
  }

  // Get inventory details for shipping and tax
  const inventory = await UserModel.findById(inventoryId).select(
    "shippingPrice taxRate minimumOrderAmount"
  );
  if (!inventory) {
    return next(new ApiError("Inventory not found", 404));
  }

  // Validate stock availability before creating order
  const drugsAvailability = await DrugModel.find(
    { _id: { $in: inventoryItems.drugs.map((d) => d.drug) } },
    "quantity sold"
  );

  const insufficientDrugs = inventoryItems.drugs.filter((cartDrug) => {
    const drug = drugsAvailability.find((d) => d._id.equals(cartDrug.drug));
    return drug.quantity < cartDrug.quantity;
  });

  if (insufficientDrugs.length > 0) {
    return next(new ApiError("Some drugs are out of stock", 400));
  }

  // 2) Calculate order totals
  // Step 1: Calculate total before tax and shipping
  const totalBeforeTaxAndShipping =
    inventoryItems.totalInventoryPriceAfterDiscount;
  // Step 2: Calculate tax price
  const taxPrice = (totalBeforeTaxAndShipping * (inventory.taxRate || 0)) / 100;
  // Step 3: Get shipping price
  const shippingPrice = inventory.shippingPrice || 0;
  // Step 4: Calculate total order price
  const totalOrderPrice = totalBeforeTaxAndShipping + taxPrice + shippingPrice;

  // Check minimum order amount
  if (totalOrderPrice < inventory.minimumOrderAmount) {
    return next(
      new ApiError(
        `Minimum order amount is ${inventory.minimumOrderAmount}`,
        400
      )
    );
  }

  // Prepare inventory cart details
  const InventoryCart = {
    inventory: inventoryItems.inventory,
    drugs: inventoryItems.drugs,
    taxPrice,
    shippingPrice,
    totalOrderPriceAfterDiscount: totalOrderPrice,
  };

  // 3) Create order with default payment method cash
  try {
    const order = await OrderModel.create({
      pharmacy: req.user._id,
      inventory: inventoryId,
      drugs: inventoryItems.drugs,
      taxPrice,
      shippingPrice,
      totalOrderPrice,
    });

    // 4) Update drug quantities and sales count
    const bulkOptions = InventoryCart.drugs.map((drug) => ({
      updateOne: {
        filter: { _id: drug.drug },
        update: {
          $inc: {
            stock: -drug.quantity,
            sold: +drug.quantity,
          },
        },
      },
    }));
    JSON.stringify(bulkOptions, null, 2);
    await DrugModel.bulkWrite(bulkOptions);
    //await DrugModel.bulkWrite(bulkOptions);

    // 5) Remove inventory items from cart and update totals
    const updatedCart = await CartModel.findOneAndUpdate(
      { _id: cartId },
      {
        $pull: {
          items: { inventory: inventoryId },
        },
        $inc: {
          totalCartPrice: -totalBeforeTaxAndShipping,
          totalCartPriceAfterDiscount: -totalOrderPrice,
        },
      },
      { new: true }
    );

    // Delete cart if it becomes empty
    if (updatedCart.items.length === 0) {
      await CartModel.findByIdAndDelete(cartId);
    }

    // 6) Return order details
    res.status(201).json({
      status: "success",
      data: order,
    });
  } catch (error) {
    // If updating inventory or cart fails, rollback the order
    if (order) {
      await OrderModel.findByIdAndDelete(order._id);
    }
    return next(new ApiError("Failed to process order", 500));
  }
});

/**
 * @desc    Get all orders
 * @route   GET /api/v1/orders
 * @access  Protected/User-Admin
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const filter = { pharmacy: req.user._id };

  if (req.query.keyword) {
    filter.$or = [
      { orderStatus: { $regex: req.query.keyword, $options: "i" } },
      { "drugs.drug.name": { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const countDocuments = await OrderModel.countDocuments(filter);

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const pagination = {
    currentPage: page,
    resultsPerPage: limit,
    totalPages: Math.ceil(countDocuments / limit),
  };

  if (page * limit < countDocuments) pagination.nextPage = page + 1;
  if (page > 1) pagination.previousPage = page - 1;

  let mongooseQuery = OrderModel.find(filter)
    .skip(skip)
    .limit(limit)
    .lean();
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    mongooseQuery = mongooseQuery.sort(sortBy);
  } else {
    mongooseQuery = mongooseQuery.sort("-createdAt");
  }

  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    mongooseQuery = mongooseQuery.select(fields);

    if (fields.includes("pharmacy")) {
      mongooseQuery = mongooseQuery.populate("pharmacy", "name city governorate");
    }
    if (fields.includes("inventory")) {
      mongooseQuery = mongooseQuery.populate("inventory", "name location");
    }
    if (fields.includes("drugs")) {
      mongooseQuery = mongooseQuery.populate("drugs.drug", "name price");
    }
  } else {
      mongooseQuery = mongooseQuery
      .populate("pharmacy", "name city governorate")
      .populate("inventory", "name location")
      .populate("drugs.drug", "name price");
  }

  const orders  = await mongooseQuery;

  res.status(200).json({
    message: "success",
    pagination,
    result: orders.length,
    users: orders,
  });
});

const getSpecificOrder = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const order = await OrderModel.findById(id)
  .populate("pharmacy", "name city governorate") 
  .populate("inventory", "name location") 
  .populate({
    path: "drugs.drug",
    model: "Drug",
    select: "name price stock",
  }); 

  if (!order) {
    return next(new ApiError(`TThere isn't an order for this ID: ${id}`, 404));
  }

  res.status(200).json({ message: "success", order});
});

const getOrdersByPharmacy  = asyncHandler(async (req, res) => {
  const { pharmacyId } = req.params;
  const filter = { pharmacy: pharmacyId };
  if (req.query.keyword) {
    filter.$or = [
      { orderStatus: { $regex: req.query.keyword, $options: "i" } },
      { "drugs.drug.name": { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const countDocuments = await OrderModel.countDocuments(filter);

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const pagination = {
    currentPage: page,
    resultsPerPage: limit,
    totalPages: Math.ceil(countDocuments / limit),
  };

  if (page * limit < countDocuments) pagination.nextPage = page + 1;
  if (page > 1) pagination.previousPage = page - 1;

  let mongooseQuery = OrderModel.find(filter)
    .skip(skip)
    .limit(limit)
    .lean();
    
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    mongooseQuery = mongooseQuery.sort(sortBy);
  } else {
    mongooseQuery = mongooseQuery.sort("-createdAt");
  }

  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    mongooseQuery = mongooseQuery.select(fields);
  }
  
  mongooseQuery = mongooseQuery
    .populate("pharmacy", "name city governorate")
    .populate("inventory", "name location")
    .populate("drugs.drug", "name price");
  const orders  = await mongooseQuery;

  res.status(200).json({
    message: "success",
    pagination,
    result: orders.length,
    users: orders,
  });
});


/*
const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const { status, note } = req.body;

  // 1) Check if order exists
  const order = await OrderModel.findById(orderId);
  if (!order) {
    return next(new ApiError("Order not found", 404));
  }

  // 2) Check authorization
  // Inventory can only update their own orders
  if (req.user.role === "inventory" && !order.inventory.equals(req.user._id)) {
    return next(new ApiError("You can only update your own orders", 403));
  }

  // 3) Validate status transition
  if (!isValidStatusTransition(order.orderStatus, status)) {
    return next(
      new ApiError(
        `Cannot change status from ${order.orderStatus} to ${status}`,
        400
      )
    );
  }

  order.orderStatus = status;

  // Add status change to history with note
  order.statusHistory.push({
    status,
    timestamp: new Date(),
    note: note || getDefaultNote(status), // Use default note if none provided
  });

  // Update delivery status if order is delivered
  if (status === "delivered") {
    order.isDelivered = true;
    order.deliveredAt = new Date();
  }

  await order.save();

  res.status(200).json({
    status: "success",
    data: order,
  });
});

// Helper function to validate status transitions
const isValidStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    pending: ["accepted", "rejected", "cancelled"],
    accepted: ["delivered", "cancelled"],
    rejected: [], // No further transitions allowed after rejection
    delivered: [], // No further transitions allowed after delivery
    cancelled: [], // No further transitions allowed after cancellation
  };

  return validTransitions[currentStatus]?.includes(newStatus);
};

// Helper function to provide default notes
const getDefaultNote = (status) => {
  const defaultNotes = {
    pending: "Order has been created",
    accepted: "Order has been accepted by inventory",
    rejected: "Order has been rejected",
    delivered: "Order has been delivered",
    cancelled: "Order has been cancelled",
  };

  return defaultNotes[status];
};
*/
const updateOrderToPaid = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await OrderModel.findById(orderId);
  if (!order) {
    return next(new ApiError("Order not found", 404));
  }

  order.isPaid = true;
  order.paidAt = new Date();
  order.orderStatus = "accepted";

  const updatedata =await order.save();

  res.status(200).json({
    status: "success",
    updatedata
  });
});


const updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await OrderModel.findById(orderId);
  if (!order) {
    return next(new ApiError("Order not found", 404));
  }

  order.isDelivered = true;
  order.deliveredAt = new Date();
  order.orderStatus = "delivered";

  const updatedata =await order.save();

  res.status(200).json({
    status: "success",
    updatedata
  });
});
export {
  createCashOrder,
  updateOrderToPaid,
  updateOrderToDelivered,
  getAllOrders,
  getSpecificOrder,
  getOrdersByPharmacy 
}
