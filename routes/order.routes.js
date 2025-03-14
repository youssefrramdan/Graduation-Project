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
// allowTo("pharmacy")
// طرق الطلبات للصيدلية
orderRouter.route("/cart/:cartId").post(createOrder);
// allowTo("pharmacy")
orderRouter.route("/my-orders").get(getMyOrders);
// allowTo("pharmacy", "inventory"),
// طرق الطلب المحدد
orderRouter.route("/:id").get(getOrder);
// allowTo("pharmacy")
// تحديث حالة الطلب
orderRouter.route("/:id/status").patch(updateOrderStatus);
// allowTo("pharmacy"),
// إلغاء الطلب
orderRouter.route("/:id/cancel").patch(cancelOrder);

export default orderRouter;
