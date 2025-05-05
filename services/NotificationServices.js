import admin from "../firebase/firebase.js";
import UserNotification from "../models/UserNotification.model.js";
import Drug from "../models/Drug.model.js";
import User from "../models/User.model.js";

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
      token,
      notification: {
        title,
        body,
        image: imageUrl,
      },
    }));

    // Send push notifications
    const response = await admin.messaging().sendEach(messages);
    return {
      ...response,
      notificationIds: validNotifications.map((n) => n._id),
    };
  }

  static async checkAndNotifyExpiringDrugs() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringDrugs = await Drug.find({
      expirationDate: { $lte: thirtyDaysFromNow },
    });

    // Process all drugs in parallel
    await Promise.all(
      expiringDrugs.map(async (drug) => {
        const inventory = await User.findById(drug.createdBy);
        if (!inventory?.fcmToken) return;

        // Send notification
        await this.sendNotification(
          inventory.fcmToken,
          "Drug Expiration Alert",
          `The drug ${drug.name} will expire on ${drug.expirationDate.toLocaleDateString("en-US")}`,
          drug.imageCover[0],
          "warning",
          `/drugs/${drug._id}`,
          {
            userId: inventory._id,
            drugId: drug._id,
          }
        );

        // Update drug visibility
        drug.isVisible = false;
        await drug.save();
      })
    );

    return expiringDrugs.length;
  }
}

export default NotificationService;
