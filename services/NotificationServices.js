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

        // Calculate days until expiration
        const daysUntilExpiration = Math.ceil(
          (drug.expirationDate - new Date()) / (1000 * 60 * 60 * 24)
        );

        // Send notification
        await this.sendNotification(
          inventory.fcmToken,
          "Drug Expiration Alert",
          `The drug ${drug.name} will expire in ${daysUntilExpiration} days`,
          drug.imageCover[0],
          "warning",
          `/drugs/${drug._id}`,
          {
            userId: inventory._id,
            drugId: drug._id,
          }
        );

        // If drug is expired or about to expire (less than 7 days), make it invisible
        if (daysUntilExpiration <= 7) {
          drug.isVisible = false;
          await drug.save();
        }
      })
    );

    return expiringDrugs.length;
  }

  static async notifyOrderStatusChange(order, pharmacy) {
    const fcmToken = pharmacy.fcmToken;
    console.log("Preparing to send FCM notification to:", fcmToken);
    if (!pharmacy?.fcmToken) return;
  
    const statusMessage = {
      pending: "Your order is pending confirmation.",
      processing: "Your order is now being processed.",
      shipped: "Your order has been shipped.",
      delivered: "Your order has been delivered.",
      cancelled: "Your order has been cancelled.",
    };
  
    const body = statusMessage[order.status] || `Order status changed to ${order.status}`;
  
    return await this.sendNotification(
      pharmacy.fcmToken,
      "Order Status Updated",
      body,
      null,
      "info",
      `/orders/${order._id}`,
      {
        userId: pharmacy._id,
        orderId: order._id,
        status: order.status,
      }
    );
  }






  static async notifyInventoryOrderCancelled(order, cancelledByPharmacy, reason) {
    const inventory = await User.findById(order.inventory);
  
    if (!inventory?.fcmToken) return;
  
    const body = `Order #${order.orderNumber} was cancelled by pharmacy ${cancelledByPharmacy.name}. Reason: ${reason || "No reason provided."}`;
  
    return await this.sendNotification(
      inventory.fcmToken,
      "Order Cancelled",
      body,
      null,
      "warning",
      `/orders/${order._id}`,
      {
        userId: inventory._id,
        orderId: order._id,
        cancelledBy: cancelledByPharmacy._id,
      }
    );
  }
  
}



export default NotificationService;
