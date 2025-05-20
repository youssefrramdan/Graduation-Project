// import cron from "node-cron";
// import CleanupService from "../services/cleanupService.js";
// import NotificationService from "../services/NotificationServices.js";

// const setupCleanupJob = () => {
//   cron.schedule("0 3 * * *", async () => {
//     console.log("Starting daily cleanup of old orders...");
//     try {
//       const deletedCount = await CleanupService.cleanupOldOrders();
//       console.log(`Successfully cleaned up ${deletedCount} old orders`);
//     } catch (error) {
//       console.error("Error in cleanup job:", error);
//     }
//   });
// };

// const setupExpiryCheckJob = () => {
//   cron.schedule("0 0 * * *", async () => {
//     console.log("Running drug expiration check...");
//     try {
//       const count = await NotificationService.checkAndNotifyExpiringDrugs();
//       console.log(`Found and processed ${count} expiring drugs`);
//     } catch (error) {
//       console.error("Error in drug expiration check:", error);
//     }
//   });
// };

// export const testExpirationCheck = async () => {
//   try {
//     console.log("Running test drug expiration check...");
//     const count = await NotificationService.checkAndNotifyExpiringDrugs();
//     console.log(`Found and processed ${count} expiring drugs`);
//   } catch (error) {
//     console.error("Error in test drug expiration check:", error);
//   }
// };

// const initCronJobs = () => {
//   setupCleanupJob();
//   setupExpiryCheckJob();
//   console.log("Cron jobs initialized");
// };

// export default initCronJobs;
