import dotenv from "dotenv";
import admin from "./firebase/firebase.js";

dotenv.config({ path: "./config/config.env" });

const testToken =
  "eYwrENvXSzQkkzrPN22oR0:APA91bEQNkDa2bfksMdfnI75Jaudr11BdvtbDxopphOGJgrHeyJJ4MYpDePG0OLl8nOr6PYf_18uC3Jll5lg4nmHUI_8aBHsNFELJaRgNVH27Gx2wAAM9Jw";

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
