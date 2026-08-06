import { Router } from 'express';
import { demoAuth } from '../../lib/demoUser.js';
import * as adminService from './admin.service.js';

export const adminRouter = Router();

adminRouter.use(demoAuth);

/** GET /api/v1/admin/metrics — includes interest-matching fallback rate */
adminRouter.get('/metrics', async (_req, res, next) => {
  try {
    const metrics = await adminService.getMetrics();
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});
