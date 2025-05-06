/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/prefer-default-export */
import cron from "node-cron";
import NotificationService from "../services/NotificationServices.js";

// Test function to run the check immediately
export const testExpirationCheck = async () => {
  try {
    console.log("Running test drug expiration check...");
    const count = await NotificationService.checkAndNotifyExpiringDrugs();
    console.log(`Found and processed ${count} expiring drugs`);
  } catch (error) {
    console.error("Error in test drug expiration check:", error);
  }
};

// Run every day at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Running drug expiration check...");
    const count = await NotificationService.checkAndNotifyExpiringDrugs();
    console.log(`Found and processed ${count} expiring drugs`);
  } catch (error) {
    console.error("Error in drug expiration check:", error);
  }
});
