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
    const { fcmToken } = pharmacy;
    console.log("Preparing to send FCM notification to:", fcmToken);
    if (!pharmacy?.fcmToken) return null;

    const statusMessages = {
      pending: "Your order is pending confirmation",
      confirmed: "Your order has been confirmed and is being prepared",
      processing: "Your order is now being processed",
      shipped: "Your order has been shipped and is on its way",
      delivered: "Your order has been delivered successfully",
      cancelled: "Your order has been cancelled",
      rejected: "Your order has been rejected",
    };

    const currentStatus = order.status.current;
    const lastHistoryEntry = order.status.history[order.status.history.length - 1];
    const note = lastHistoryEntry?.note;

    let body = statusMessages[currentStatus] || `Order status changed to ${currentStatus}`;
    if (note) {
      body += `\nNote: ${note}`;
    }

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
        status: currentStatus,
      }
    );
  }

  static async notifyInventoryOrderCancelled(
    order,
    cancelledByPharmacy,
    reason
  ) {
    try {
      const inventory = await User.findById(order.inventory);

      if (!inventory?.fcmToken) {
        console.log(`No FCM token found for inventory ${order.inventory}`);
        return null;
      }

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
    } catch (error) {
      console.error("Error sending cancellation notification:", error);
      return null;
    }
  }

  static async notifyPharmacyOrderRejected(order, rejectedByInventory, reason) {
    const { pharmacy } = order;

    if (!pharmacy?.fcmToken) {
      console.log("Pharmacy has no FCM token.");
      return null;
    }

    const body = `Order #${order.orderNumber} was rejected by inventory ${rejectedByInventory.name}. Reason: ${reason || "No reason provided."}`;

    return await this.sendNotification(
      pharmacy.fcmToken,
      "Order Rejected",
      body,
      null,
      "danger",
      `/orders/${order._id}`,
      {
        userId: pharmacy._id,
        orderId: order._id,
        rejectedBy: rejectedByInventory._id,
      }
    );
  }

  static async notifyInventoryNewOrder(order, pharmacy) {
    try {
      const inventory = await User.findById(order.inventory);

      if (!inventory?.fcmToken) {
        console.log(`No FCM token found for inventory ${order.inventory}`);
        return null;
      }

      const body = `New order #${order.orderNumber} received from pharmacy ${pharmacy.name}. Total amount: ${order.pricing.total} EGP`;

      return await this.sendNotification(
        inventory.fcmToken,
        "New Order Received",
        body,
        null,
        "info",
        `/orders/${order._id}`,
        {
          userId: inventory._id,
          orderId: order._id,
          pharmacyId: pharmacy._id,
          type: "new_order",
        }
      );
    } catch (error) {
      console.error("Error sending new order notification:", error);
      return null;
    }
  }

  static async notifyPharmaciesForNewDrug(inventoryId, drugId) {
    const inventory = await User.findById(inventoryId);
    if (!inventory) return;

    const pharmacies = await User.find({
      favourite: inventoryId,
      role: "pharmacy",
      fcmToken: { $ne: null },
    });

    if (!pharmacies.length) return;

    const deviceTokens = pharmacies.map((ph) => ph.fcmToken);
    const userIds = pharmacies.map((ph) => ph._id);

    const actionUrl = `/users/${inventoryId}`;

    await NotificationService.sendMultipleNotification(
      deviceTokens,
      "A inventory has added new drugs 💊",
      `Inventory ${inventory.name} has added new drugs. Browse them now!`,
      inventory.profileImage,
      "info",
      actionUrl,
      {
        userIds,
        inventoryId,
        drugId,
      }
    );
  }

}

export default NotificationService;
