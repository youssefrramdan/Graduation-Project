import admin from "../firebase/firebase.js";
import UserNotification from "../models/UserNotification.model.js";

class NotificationService {
  static async sendNotification(
    deviceToken,
    title,
    body,
    imageUrl = null,
    type = "info",
    actionUrl = null,
    data = {}
  ) {
    try {
      if (!deviceToken) return null;
      if (!data.userId) throw new Error("userId is required");

      // Save notification to database
      const notification = await UserNotification.create({
        userId: data.userId,
        title,
        body,
        imageUrl,
        type,
        actionUrl,
        data,
        isRead: false,
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });

      // Prepare Firebase message
      const message = {
        notification: { title, body },
        token: deviceToken,
      };

      if (imageUrl) message.notification.imageUrl = imageUrl;

      // Send push notification
      const response = await admin.messaging().send(message);
      return { ...response, notificationId: notification._id };
    } catch (error) {
      console.error("Error sending notification:", error);
      throw error;
    }
  }

  static async sendMultipleNotification(
    deviceTokens,
    title,
    body,
    imageUrl,
    type = "info",
    actionUrl = null,
    data = {}
  ) {
    try {
      if (!Array.isArray(deviceTokens) || deviceTokens.length === 0)
        return null;
      if (!data.userId) throw new Error("userId is required");

      // Save notifications to database
      const notifications = await Promise.all(
        deviceTokens.map((token) =>
          UserNotification.create({
            userId: data.userId,
            title,
            body,
            imageUrl,
            type,
            actionUrl,
            data,
            isRead: false,
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })
        )
      );

      // Prepare Firebase messages
      const messages = deviceTokens.map((token) => ({
        notification: { title, body, imageUrl },
        token,
      }));

      // Send push notifications
      const response = await admin.messaging().sendEach(messages);
      return { ...response, notificationIds: notifications.map((n) => n._id) };
    } catch (error) {
      console.error("Error sending multiple notifications:", error);
      throw error;
    }
  }
}

export default NotificationService;

// controller ---> database 
