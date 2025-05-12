// routes/cron.routes.js
import express from 'express';
import CleanupService from '../services/cleanupService.js';
import NotificationService from '../services/NotificationServices.js';

const router = express.Router();


router.get('/run-cleanup', async (req, res) => {
  try {
    const deleted = await CleanupService.cleanupOldOrders();
    res.json({ message: `Deleted ${deleted} old orders.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

router.get('/check-expiry', async (req, res) => {
  try {
    const count = await NotificationService.checkAndNotifyExpiringDrugs();
    res.json({ message: `Processed ${count} expiring drugs.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Expiration check failed' });
  }
});

export default router;
