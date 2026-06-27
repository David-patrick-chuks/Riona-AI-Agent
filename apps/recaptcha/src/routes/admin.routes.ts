import express from 'express';
import controller from '@/controllers/admin.controller';

const router = express.Router();

router.get('/stats', controller.getStats);
router.delete('/logs', controller.clearLogs);

export default router;
