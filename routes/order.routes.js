import express from "express";
import { protectedRoutes, allowTo } from "../controllers/auth.controller.js";
import {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  checkoutSession,
  
} from "../controllers/order.controller.js";

const orderRouter = express.Router();

// Protect all routes
orderRouter.use(protectedRoutes);

orderRouter.route("/checkout-session/:cartId").get(checkoutSession);
// Pharmacy order routes
orderRouter.route("/cart/:cartId").post(createOrder);
orderRouter.route("/my-orders").get(getMyOrders);

// Specific order routes
orderRouter.route("/:id").get(getOrder);

// Update order status
orderRouter.route("/:id/status").patch(updateOrderStatus);

// Cancel order
orderRouter.route("/:id/cancel").patch(cancelOrder);

// reject order
//orderRouter.route("/:id/reject").patch(rejectOrder);

export default orderRouter;
