import OrderModel from "../models/order.model.js";

class CleanupService {
  static async cleanupOldOrders() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await OrderModel.deleteMany({
        "status.current": { $in: ["cancelled", "rejected"] },
        "status.history": {
          $elemMatch: {
            status: { $in: ["cancelled", "rejected"] },
            timestamp: { $lt: thirtyDaysAgo },
          },
        },
      });

      console.log(`Cleaned up ${result.deletedCount} old orders`);
      return result.deletedCount;
    } catch (error) {
      console.error("Error cleaning up old orders:", error);
      throw error;
    }
  }
}

export default CleanupService;
