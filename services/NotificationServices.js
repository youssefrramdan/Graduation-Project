import admin from "../firebase/firebase.js";

class NotificationServices {
  static async sendNotification(deviceToken, title, body, imageUrl = null) {
    const message = {
      notification: {
        title,
        body,
      },
      token: deviceToken,
    };
    if (imageUrl) {
      message.notification.imageUrl = imageUrl;
    }

    const response = await admin.messaging().send(message);
    return response;
  }

  static async sendMultipleNotification(deviceTokens, title, body, imageUrl) {
    const messages = deviceTokens.map((token) => ({
      notification: {
        title,
        body,
        imageUrl,
      },
      token: token,
    }));
    const response = await admin.messaging().sendEach(messages);
    return response;
  }
}

export default NotificationServices;
