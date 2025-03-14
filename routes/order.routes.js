import express from "express";
import { protectedRoutes, allowTo } from "../controllers/auth.controller.js";
import {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
} from "../controllers/order.controller.js";

const orderRouter = express.Router();

// حماية جميع الطرق
orderRouter.use(protectedRoutes);

// طرق الطلبات للصيدلية
orderRouter.route("/cart/:cartId").post(allowTo("pharmacy"), createOrder);

orderRouter.route("/my-orders").get(allowTo("pharmacy"), getMyOrders);

// طرق الطلب المحدد
orderRouter.route("/:id").get(allowTo("pharmacy", "inventory"), getOrder);

// تحديث حالة الطلب
orderRouter
  .route("/:id/status")
  .patch(allowTo("inventory"), updateOrderStatus);

// إلغاء الطلب
orderRouter.route("/:id/cancel").patch(allowTo("pharmacy"), cancelOrder);

export default orderRouter;
