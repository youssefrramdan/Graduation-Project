import asyncHandler from "express-async-handler";
import CartModel from "../models/Cart.model.js";
import OrderModel from "../models/order.model.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import {
  transformOrder,
  validateStockAvailability,
  updateDrugStock,
  getPopulatedOrder,
  handleCartCleanup,
} from "../services/orderService.js";

/**
 * @desc    Create a new order from cart items for a specific inventory
 * @route   POST /api/v1/orders/cart/:cartId
 * @access  Private/Pharmacy
 */
const createOrder = asyncHandler(async (req, res, next) => {
  const { cartId } = req.params;
  const { inventoryId } = req.body;

  // Find cart and validate ownership
  const cart = await CartModel.findOne({
    _id: cartId,
    pharmacy: req.user._id,
    "inventories.inventory": inventoryId,
  }).populate([
    {
      path: "inventories.inventory",
      select: "name shippingPrice",
    },
    {
      path: "inventories.drugs.drug",
      select: "name price promotion",
    },
  ]);

  if (!cart) {
    return next(new ApiError("Cart not found or inventory not in cart", 404));
  }

  // Extract inventory items from cart
  const inventoryItems = cart.inventories.find(
    (item) => item.inventory._id.toString() === inventoryId
  );

  if (!inventoryItems) {
    return next(new ApiError("Inventory not found in cart", 404));
  }

  // Validate stock availability
  const { isValid, unavailableItems } = await validateStockAvailability(
    inventoryItems.drugs
  );

  if (!isValid) {
    return next(
      new ApiError(
        `Some items are out of stock: ${unavailableItems
          .map((i) => i.name)
          .join(", ")}`,
        400
      )
    );
  }

  // Create the order
  const order = await OrderModel.create({
    pharmacy: req.user._id,
    inventory: inventoryId,
    drugs: inventoryItems.drugs.map((drug) => ({
      drug: drug.drug._id,
      quantity: drug.totalDelivered,
      paidQuantity: drug.paidQuantity,
      freeItems: drug.freeItems,
      totalDelivered: drug.totalDelivered,
      price: drug.Price,
      totalPrice: drug.totalDrugPrice,
    })),
    pricing: {
      subtotal: inventoryItems.totalInventoryPrice,
      shippingCost: inventoryItems.inventory.shippingPrice || 0,
      total:
        inventoryItems.totalInventoryPrice +
        (inventoryItems.inventory.shippingPrice || 0),
    },
    delivery: {
      address: req.user.address,
      location: req.user.location,
      contactPhone: req.user.phone,
    },
  });

  // Update inventory stock and cart in parallel
  await Promise.all([
    updateDrugStock(inventoryItems.drugs),
    CartModel.updateOne(
      { _id: cartId },
      { $pull: { inventories: { inventory: inventoryId } } }
    ),
  ]);

  // Handle cart cleanup
  await handleCartCleanup(cartId);

  // Return populated order
  const populatedOrder = await getPopulatedOrder(order._id);

  res.status(201).json({
    status: "success",
    data: transformOrder(populatedOrder),
  });
});

/**
 * @desc    Get all orders for the logged-in pharmacy
 * @route   GET /api/v1/orders/my-orders
 * @access  Private/Pharmacy
 */
const getMyOrders = asyncHandler(async (req, res) => {
  let query;
  if (req.user.role === "inventory") {
    query = OrderModel.find({ inventory: req.user._id });
  } else {
    query = OrderModel.find({ pharmacy: req.user._id });
  }

  const documentCount = await OrderModel.countDocuments(query.getQuery());
  const features = new ApiFeatures(query, req.query)
    .filter()
    .search(["orderNumber", "status.current"])
    .sort()
    .limitFields();

  await features.paginate(documentCount);

  const orders = await features.mongooseQuery
    .select("orderNumber status payment pricing delivery drugs createdAt")
    .populate({
      path: "inventory",
      select: "name location",
    })
    .populate({
      path: "drugs.drug",
      select: "name price promotion",
    })
    .lean();

  const transformedOrders = orders.map(transformOrder);
  const paginationResult = features.getPaginationResult();

  res.status(200).json({
    status: "success",
    pagination: paginationResult,
    data: transformedOrders,
  });
});

/**
 * @desc    Get specific order details
 * @route   GET /api/v1/orders/:id
 * @access  Private/Pharmacy-Inventory
 */
const getOrder = asyncHandler(async (req, res, next) => {
  const order = await getPopulatedOrder(req.params.id);

  if (!order) {
    return next(new ApiError("Order not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: transformOrder(order),
  });
});

/**
 * @desc    Update order status
 * @route   PATCH /api/v1/orders/:id/status
 * @access  Private/Inventory
 */
const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const order = await OrderModel.findById(id);
  if (!order) {
    return next(new ApiError("Order not found", 404));
  }

  if (!order.canTransitionTo(status)) {
    return next(
      new ApiError(
        `Cannot change status from ${order.status.current} to ${status}`,
        400
      )
    );
  }

  order.updateStatus(status, note, req.user._id);

  if (status === "delivered") {
    order.delivery.actualDeliveryDate = new Date();
    if (order.payment.method === "cash") {
      order.payment.status = "paid";
      order.payment.paidAt = new Date();
    }
  }

  await order.save();
  const populatedOrder = await getPopulatedOrder(order._id);

  res.status(200).json({
    status: "success",
    data: transformOrder(populatedOrder),
  });
});

/**
 * @desc    Cancel an order
 * @route   PATCH /api/v1/orders/:id/cancel
 * @access  Private/Pharmacy
 */
const cancelOrder = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (req.user.role === "inventory") {
    return next(new ApiError("You can't do this action ..."));
  }

  const order = await OrderModel.findOne({
    _id: id,
    pharmacy: req.user._id,
    "status.current": { $in: ["pending", "confirmed"] },
  });

  if (!order) {
    return next(
      new ApiError(
        "Order not found or cannot be cancelled at current status",
        404
      )
    );
  }

  order.updateStatus("cancelled", reason, req.user._id);
  await updateDrugStock(order.drugs, true);
  await order.save();

  const populatedOrder = await getPopulatedOrder(order._id);

  res.status(200).json({
    status: "success",
    data: transformOrder(populatedOrder),
  });
});

/**
 * @desc    Reject an order
 * @route   PATCH /api/v1/orders/:id/reject
 * @access  Private/Inventory
 */
const rejectOrder = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (req.user.role === "pharmacy") {
    return next(new ApiError("You can't do this action ..."));
  }

  const order = await OrderModel.findOne({
    _id: id,
    "status.current": { $in: ["pending", "confirmed"] },
  });

  if (!order) {
    return next(
      new ApiError(
        "Order not found or cannot be rejected at current status",
        404
      )
    );
  }

  order.updateStatus("rejected", reason, req.user._id);
  await updateDrugStock(order.drugs, true);
  await order.save();

  const populatedOrder = await getPopulatedOrder(order._id);

  res.status(200).json({
    status: "success",
    data: transformOrder(populatedOrder),
  });
});

export {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  rejectOrder,
};
