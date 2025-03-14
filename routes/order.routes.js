import express from "express";
import { protectedRoutes } from "../controllers/auth.controller.js";
import { createCashOrder, getAllOrders, getOrdersByPharmacy, getSpecificOrder, updateOrderToDelivered, updateOrderToPaid} from "../controllers/order.controller.js";

const orderRouter = express.Router();

// Create cash order
orderRouter.route("/:cartId").post(protectedRoutes, createCashOrder);
orderRouter.route("/").get(protectedRoutes, getAllOrders);
orderRouter.route("/:id").get(protectedRoutes, getSpecificOrder);
//orderRouter.route("/:orderId/status").patch(protectedRoutes, updateOrderStatus);
orderRouter.route("/:orderId/pay").patch(protectedRoutes,updateOrderToPaid);
orderRouter.route("/:orderId/delive").patch(protectedRoutes,updateOrderToDelivered);
orderRouter.route("/pharmacy/:pharmacyId").get(getOrdersByPharmacy);

// TODO: Add more routes like:
// Get all orders
// Get specific order
// Get pharmacy orders
// Cancel order

export default orderRouter;
