import asyncHandler from "express-async-handler";
import CartModel from "../models/Cart.model.js";
import UserModel from "../models/User.model.js";
import OrderModel from "../models/order.model.js";
import ApiError from "../utils/apiError.js";
import DrugModel from "../models/Drug.model.js";
import ApiFeatures from "../utils/apiFeatures.js";

/**
 * @desc    Create a new order from cart items for a specific inventory
 * @route   POST /api/v1/orders/cart/:cartId
 * @access  Private/Pharmacy
 * @param   {string} cartId - The ID of the cart
 * @param   {string} inventoryId - The ID of the inventory to order from
 * @returns {Object} Created order with status and data
 */
const createOrder = asyncHandler(async (req, res, next) => {
  const { cartId } = req.params;
  const { inventoryId } = req.body;

  // Step 1: Find cart and validate ownership
  // Populate inventory details and drug information in one query
  const cart = await CartModel.findOne({
    _id: cartId,
    pharmacy: req.user._id,
    "items.inventory": inventoryId,
  })
    .populate({
      path: "items.inventory",
      select: "name shippingPrice location",
    })
    .populate({
      path: "items.drugs.drug",
      select: "name price stock",
    });

  if (!cart) {
    return next(new ApiError("Cart not found or inventory not in cart", 404));
  }

  // Step 2: Extract inventory items from cart
  const inventoryItems = cart.items.find(
    (item) => item.inventory._id.toString() === inventoryId
  );

  // Step 3: Validate stock availability for all drugs
  const stockCheck = await Promise.all(
    inventoryItems.drugs.map(async (item) => {
      const drug = await DrugModel.findById(item.drug._id).select("stock");
      return {
        drug: item.drug._id,
        name: item.drug.name,
        requested: item.quantity,
        available: drug.stock,
      };
    })
  );

  // Check if any items are out of stock
  const unavailableItems = stockCheck.filter(
    (item) => item.requested > item.available
  );
  if (unavailableItems.length > 0) {
    return next(
      new ApiError(
        `Some items are out of stock: ${unavailableItems.map((i) => i.name).join(", ")}`,
        400
      )
    );
  }

  // Step 4: Create the order with all necessary information
  const order = await OrderModel.create({
    pharmacy: req.user._id,
    inventory: inventoryId,
    drugs: inventoryItems.drugs,
    pricing: {
      subtotal: inventoryItems.totalInventoryPrice,
      shippingCost: inventoryItems.inventory.shippingPrice,
      total:
        inventoryItems.totalInventoryPrice +
        inventoryItems.inventory.shippingPrice,
    },
    delivery: {
      address: req.user.address,
      location: req.user.location,
      contactPhone: req.user.phone,
    },
  });

  // Step 5: Update inventory stock and cart in parallel
  await Promise.all([
    // Update drug stock levels
    ...inventoryItems.drugs.map((item) =>
      DrugModel.updateOne(
        { _id: item.drug._id },
        { $inc: { stock: -item.quantity } }
      )
    ),
    // Remove ordered items from cart and update totals
    CartModel.updateOne(
      { _id: cartId },
      {
        $pull: { items: { inventory: inventoryId } },
        $inc: {
          totalCartPrice: -inventoryItems.totalInventoryPrice,
          totalPriceAfterDiscount: -(
            inventoryItems.totalInventoryPrice +
            inventoryItems.inventory.shippingPrice
          ),
        },
      }
    ),
  ]);

  res.status(201).json({
    status: "success",
    data: order,
  });
});

/**
 * @desc    Get all orders for the logged-in pharmacy
 * @route   GET /api/v1/orders/my-orders
 * @access  Private/Pharmacy
 * @returns {Object} Orders list with pagination
 */
const getMyOrders = asyncHandler(async (req, res) => {
  // Initialize API features for filtering, sorting, and pagination
  const features = new ApiFeatures(
    OrderModel.find({ pharmacy: req.user._id }),
    req.query
  )
    .filter()
    .search(["orderNumber", "status.current"])
    .sort()
    .limitFields()
    .populate([
      { path: "inventory", select: "name location" },
      { path: "drugs.drug", select: "name price" },
    ]);

  await features.paginate();

  const orders = await features.mongooseQuery;
  const paginationResult = features.getPaginationResult();

  res.status(200).json({
    status: "success",
    pagination: paginationResult,
    data: orders,
  });
});

/**
 * @desc    Get specific order details
 * @route   GET /api/v1/orders/:id
 * @access  Private/Pharmacy-Inventory
 * @param   {string} id - Order ID
 * @returns {Object} Order details
 */
const getOrder = asyncHandler(async (req, res, next) => {
  // Get order with related data
  const order = await OrderModel.findById(req.params.id)
    .populate("inventory", "name location")
    .populate("pharmacy", "name phone location")
    .populate("drugs.drug", "name price");

  if (!order) {
    return next(new ApiError("Order not found", 404));
  }

  // Verify authorization
  if (
    (req.user.role === "pharmacy" &&
      order.pharmacy.toString() !== req.user._id.toString()) ||
    (req.user.role === "inventory" &&
      order.inventory.toString() !== req.user._id.toString())
  ) {
    return next(new ApiError("Not authorized to access this order", 403));
  }

  res.status(200).json({
    status: "success",
    data: order,
  });
});

/**
 * @desc    Update order status
 * @route   PATCH /api/v1/orders/:id/status
 * @access  Private/Inventory
 * @param   {string} id - Order ID
 * @param   {string} status - New status
 * @param   {string} note - Status change note
 * @returns {Object} Updated order
 */
const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const order = await OrderModel.findById(id);
  if (!order) {
    return next(new ApiError("Order not found", 404));
  }

  // Verify authorization
  if (
    (req.user.role === "pharmacy" &&
      order.pharmacy.toString() !== req.user._id.toString()) ||
    (req.user.role === "inventory" &&
      order.inventory.toString() !== req.user._id.toString())
  ) {
    return next(new ApiError("Not authorized to update this order", 403));
  }

  // Validate status transition
  if (!order.canTransitionTo(status)) {
    return next(
      new ApiError(
        `Cannot change status from ${order.status.current} to ${status}`,
        400
      )
    );
  }

  // Update order status and handle related changes
  order.updateStatus(status, note, req.user._id);

  if (status === "delivered") {
    order.delivery.actualDeliveryDate = new Date();
    if (order.payment.method === "cash") {
      order.payment.status = "paid";
      order.payment.paidAt = new Date();
    }
  }

  await order.save();

  res.status(200).json({
    status: "success",
    data: order,
  });
});

/**
 * @desc    Cancel an order
 * @route   PATCH /api/v1/orders/:id/cancel
 * @access  Private/Pharmacy
 * @param   {string} id - Order ID
 * @param   {string} reason - Cancellation reason
 * @returns {Object} Updated order
 */
const cancelOrder = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  // Find order that can be cancelled
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

  // Update order status to cancelled
  order.updateStatus("cancelled", reason, req.user._id);

  // Restore inventory stock
  await Promise.all(
    order.drugs.map((item) =>
      DrugModel.updateOne(
        { _id: item.drug },
        { $inc: { stock: item.quantity } }
      )
    )
  );

  await order.save();

  res.status(200).json({
    status: "success",
    data: order,
  });
});

export { createOrder, getMyOrders, getOrder, updateOrderStatus, cancelOrder };
