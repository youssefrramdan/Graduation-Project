import express from "express";
import {
  createNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  getAllNotifications,
  getNotification,
} from "../controllers/notification.controller.js";
import { protectedRoutes, allowTo } from "../controllers/auth.controller.js";

const router = express.Router();

router.use(protectedRoutes);

// Admin routes
router.get("/", getAllNotifications);

// Get user's notifications with filters
router.get("/me", getMyNotifications);

// Get unread notifications count
router.get("/unread-count", getUnreadCount);

// Mark all notifications as read
router.patch("/read-all", markAllAsRead);

// Create a new notification
router.post("/", createNotification);

// Public routes (for authenticated users)
router.get("/:id", getNotification);

// Mark a notification as read
router.patch("/:notificationId/read", markAsRead);

// Delete a notification
router.delete("/:notificationId", deleteNotification);

export default router;
