import express from "express";
import { protectedRoutes } from "../controllers/auth.controller.js";
import { createCashOrder, updateOrderToDelivered, updateOrderToPaid} from "../controllers/order.controller.js";

const orderRouter = express.Router();

// Create cash order
orderRouter.route("/:cartId").post(protectedRoutes, createCashOrder);
//orderRouter.route("/:orderId/status").patch(protectedRoutes, updateOrderStatus);
orderRouter.route("/:orderId/pay").patch(protectedRoutes,updateOrderToPaid);
orderRouter.route("/:orderId/delive").patch(protectedRoutes,updateOrderToDelivered);


// TODO: Add more routes like:
// Get all orders
// Get specific order
// Get pharmacy orders
// Cancel order

export default orderRouter;
