import dotenv from "dotenv";
import admin from "./firebase/firebase.js";

dotenv.config({ path: "./config/config.env" });

const testToken =
  "dsmSn-as6ok1-fjY1Ak8Tq:APA91bHVvwO2qjKSBwYXgx_txuV73oIqbMlUpCC3gRAR8jYnOpVxLWkrCt6aiuat6xv423hhOZARsSLcP4WPE1sviyCrmOn2MZIIFyIq-wMrJ5WaSpSXtmg";
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
