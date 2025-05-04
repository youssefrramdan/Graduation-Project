import dotenv from "dotenv";
import admin from "./firebase/firebase.js";

dotenv.config({ path: "./config/config.env" });

const testToken =
  "cpxejH2vK1RwXoumhrtwKG:APA91bExzMeZD9sXLX4rF3FDnyBNsINTzDAWqw_zXloyVw6Fiz9mUVVfBtPp2-moLnVnZnW7rQ_xId3Pdsc0JCiG92i6aWkJpLzPQZtxwd69B4s3Il6ZLbQ";
async function testFirebase() {
  try {
    console.log("starting Firebase...");
    console.log(`fcm token: ${testToken}`);

    const message = {
      notification: {
        title: "test notification",
        body: "hi youssef!",
        image:
          "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png",
      },
      token: testToken,
    };

    console.log("sending...");
    const response = await admin.messaging().send(message);

    console.log("success");
    console.log(":", response);
  } catch (error) {
    console.error("error:", error);
  }
}

testFirebase();
