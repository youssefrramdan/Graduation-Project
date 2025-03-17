import asyncHandler from "express-async-handler";
import CartModel from "../models/Cart.model.js";
import OrderModel from "../models/order.model.js";
import ApiError from "../utils/apiError.js";
import DrugModel from "../models/Drug.model.js";
import ApiFeatures from "../utils/apiFeatures.js";
import { calcTotalCartPrice } from "./cart.controller.js";

import Stripe from "stripe";
const stripe = new Stripe("sk_test_51R3f6tFPDv2cgTSdmron4H5v02fkkLi1Bz2gXM14kAPBOeKsEz5SQEFNAlfMJuavSi4Ohu0ikZlGX49fu8ijsxnp00jrymXkBn");

// Shared transform function for order responses
const transformOrder = (order) => ({
  _id: order._id,
  orderNumber: order.orderNumber,
  status: order.status.current,
  statusHistory: order.status.history,
  paymentStatus: order.payment?.status,
  paymentMethod: order.payment?.method,
  paymentPaidAt: order.payment?.paidAt,
  inventory: order.inventory && {
    _id: order.inventory._id,
    name: order.inventory.name,
  },
  pharmacy: order.pharmacy && {
    _id: order.pharmacy._id,
    name: order.pharmacy.name,
    phone: order.pharmacy.phone,
  },
  pricing: {
    subtotal: order.pricing.subtotal,
    discountedSubtotal: order.pricing.discountedSubtotal,
    shippingCost: order.pricing.shippingCost,
    total: order.pricing.total,
  },
  drugs: order.drugs.map((drug) => ({
    drug: {
      _id: drug.drug._id,
      name: drug.drug.name,
      price: drug.drug.price,
      discountedPrice: drug.drug.discountedPrice,
    },
    quantity: drug.quantity,
    totalPrice: drug.quantity * drug.drug.price,
    totalAfterDiscount: drug.quantity * drug.drug.discountedPrice,
  })),
  delivery: {
    address: order.delivery.address,
    location: order.delivery.location,
    contactPhone: order.delivery.contactPhone,
    actualDeliveryDate: order.delivery.actualDeliveryDate,
  },
  createdAt: order.createdAt,
});

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
  const cart = await CartModel.findOne({
    _id: cartId,
    pharmacy: req.user._id,
    "items.inventory": inventoryId,
  }).populate([
    {
      path: "items.inventory",
      select: "name shippingPrice location",
    },
    {
      path: "items.drugs.drug",
      select: "name price discountedPrice stock",
    },
  ]);

  if (!cart) {
    return next(new ApiError("Cart not found or inventory not in cart", 404));
  }
  // Step 2: Extract inventory items from cart
  const inventoryItems = cart.items.find(
    (item) => item.inventory._id.toString() === inventoryId
  );

  if (!inventoryItems) {
    return next(new ApiError("Inventory not found in cart", 404));
  }
  // Calculate cart totals before creating order
  calcTotalCartPrice(cart);

  // Step 3: Validate stock availability for all drugs
  const stockCheck = await Promise.all(
    inventoryItems.drugs.map(async (item) => {
      const drug = await DrugModel.findById(item.drug._id).select("stock name");
      return {
        drug: item.drug._id,
        name: drug.name,
        requested: item.quantity,
        available: drug.stock,
      };
    })
  );

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
    drugs: inventoryItems.drugs.map((drug) => ({
      drug: drug.drug._id,
      quantity: drug.quantity,
      price: drug.price,
      discountedPrice: drug.discountedPrice,
    })),
    pricing: {
      subtotal: inventoryItems.totalInventoryPrice,
      discountedSubtotal: inventoryItems.totalInventoryPriceAfterDiscount,
      shippingCost: inventoryItems.inventory.shippingPrice || 0,
      total:
        inventoryItems.totalInventoryPriceAfterDiscount +
        (inventoryItems.inventory.shippingPrice || 0),
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
    // Remove ordered items from cart
    CartModel.updateOne(
      { _id: cartId },
      { $pull: { items: { inventory: inventoryId } } }
    ),
  ]);

  // Recalculate cart totals after removing items
  const updatedCart = await CartModel.findById(cartId);
  if (updatedCart && updatedCart.items.length > 0) {
    calcTotalCartPrice(updatedCart);
    await updatedCart.save();
  } else if (updatedCart) {
    await CartModel.findByIdAndDelete(cartId);
  }
  // Return populated order with all necessary details
  const populatedOrder = await OrderModel.findById(order._id)
    .populate("inventory", "name location")
    .populate("pharmacy", "name phone location")
    .populate("drugs.drug", "name price discountedPrice");

  res.status(201).json({
    status: "success",
    data: transformOrder(populatedOrder),
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
  const documentCount = await OrderModel.countDocuments({
    pharmacy: req.user._id,
  });

  const features = new ApiFeatures(
    OrderModel.find({ pharmacy: req.user._id }),
    req.query
  )
    .filter()
    .search(["orderNumber", "status.current"])
    .sort()
    .limitFields();

  // Apply pagination after other operations
  await features.paginate(documentCount);
  // Get orders with populated data - include all necessary fields
  const orders = await features.mongooseQuery
    .select("orderNumber status payment pricing delivery drugs createdAt")
    .populate({
      path: "inventory",
      select: "name location",
    })
    .populate({
      path: "drugs.drug",
      select: "name price discountedPrice",
    })
    .lean();
  // Use shared transform function
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
 * @param   {string} id - Order ID
 * @returns {Object} Order details
 */
const getOrder = asyncHandler(async (req, res, next) => {
  // Get order with related data
  const order = await OrderModel.findById(req.params.id)
    .populate("inventory", "name location")
    .populate("pharmacy", "name phone location")
    .populate("drugs.drug", "name price discountedPrice");

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
  const populatedOrder = await OrderModel.findById(order._id)
    .populate("inventory", "name location")
    .populate("pharmacy", "name phone location")
    .populate("drugs.drug", "name price discountedPrice");

  res.status(200).json({
    status: "success",
    data: transformOrder(populatedOrder),
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
  const populatedOrder = await OrderModel.findById(order._id)
    .populate("inventory", "name location")
    .populate("pharmacy", "name phone location")
    .populate("drugs.drug", "name price discountedPrice");

  res.status(200).json({
    status: "success",
    data: transformOrder(populatedOrder),
  });
});

/**
 * @desc    Get checkout session from stripe and send it as response
 * @route   GET /api/v1/orders/checkout-session/cardId
 * @access  Private/Pharmacy
 */

const checkoutSession = asyncHandler(async (req, res, next) => {
  const { inventoryId } = req.body;
  // 1) Get cart depend on cartId
  const cart = await CartModel.findById(req.params.cartId);
  if(!cart){
    return next(new ApiError("Cart not found or inventory not in cart", 404));
  }
  const inventoryItems = cart.items.find(
    (item) => item.inventory._id.toString() === inventoryId
  );
  const shippingCost = inventoryItems.inventory.shippingPrice || 0;
  const totalAmount = inventoryItems.totalInventoryPriceAfterDiscount + shippingCost;

  // 2) Create stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "egp",
        product_data: {
          name: "Product Name",
        },
        unit_amount: Math.round(totalAmount * 100), 
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${req.protocol}://${req.get('host')}/orders`,
    cancel_url: `${req.protocol}://${req.get('host')}/cart`,
    customer_email: req.user.email,
    client_reference_id: req.params.cartId,
  });

  res.status(200).json({
    status: "success",
    session,
  });

});
export { createOrder, getMyOrders, getOrder, updateOrderStatus, cancelOrder, checkoutSession };
