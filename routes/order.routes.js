import express from "express";
import { protectedRoutes, allowTo } from "../controllers/auth.controller.js";
import {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  rejectOrder,
} from "../controllers/order.controller.js";
import {
  createOrderValidator,
  updateOrderStatusValidator,
  cancelOrderValidator,
  rejectOrderValidator,
} from "../utils/validators/orderValidation.js";

const orderRouter = express.Router();

// Protect all routes
orderRouter.use(protectedRoutes);

// Create order from cart
orderRouter.post(
  "/cart/:cartId",
  createOrderValidator,
  createOrder
);

// Get all orders for logged-in user
orderRouter.get("/my-orders", allowTo("pharmacy", "inventory"), getMyOrders);

// Get specific order
orderRouter.get("/:id", allowTo("pharmacy", "inventory"), getOrder);

// Update order status
orderRouter.patch(
  "/:id/status",
  allowTo("inventory"),
  updateOrderStatusValidator,
  updateOrderStatus
);

// Cancel order
orderRouter.patch(
  "/:id/cancel",
  allowTo("pharmacy"),
  cancelOrderValidator,
  cancelOrder
);

// Reject order
orderRouter.patch(
  "/:id/reject",
  allowTo("inventory"),
  rejectOrderValidator,
  rejectOrder
);

export default orderRouter;
