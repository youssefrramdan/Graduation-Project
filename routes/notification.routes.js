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
import admin from "../firebase/firebase.js";

const router = express.Router();

// @desc    Send test notification
// @route   POST /api/v1/notifications/test
// @access  Public
router.post("/test", async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        status: "error",
        message: "FCM token is required",
      });
    }

    const message = {
      notification: {
        title: "Test Notification",
        body: "This is a test notification!",
        image:
          "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png",
      },
      token: fcmToken,
    };

    const response = await admin.messaging().send(message);

    res.status(200).json({
      status: "success",
      message: "Notification sent successfully",
      data: response,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to send notification",
      error: error.message,
    });
  }
});

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
