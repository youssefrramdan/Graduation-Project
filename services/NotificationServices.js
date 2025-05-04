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
      // Save notifications to database
      const notifications = await Promise.all(
        deviceTokens.map((token, index) => {
          if (!data.userIds || !data.userIds[index]) {
            console.warn(`No userId found for index ${index}`);
            return null;
          }
          return UserNotification.create({
            userId: data.userIds[index],
            title,
            body,
            imageUrl,
            type,
            actionUrl,
            data,
            isRead: false,
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        })
      );

      // Filter out null notifications
      const validNotifications = notifications.filter((n) => n !== null);

      // Prepare Firebase messages
      const messages = deviceTokens.map((token) => ({
        notification: { title, body, imageUrl },
        token,
      }));

      // Send push notifications
      const response = await admin.messaging().sendEach(messages);
      return {
        ...response,
        notificationIds: validNotifications.map((n) => n._id),
      };
    } catch (error) {
      console.error("Error sending multiple notifications:", error);
      throw error;
    }
  }
}

export default NotificationService;

// controller ---> database
