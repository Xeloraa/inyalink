import { Router } from 'express';
import { NotificationIdParamsSchema } from '@inyalink/shared';
import { AppError } from '../../middleware/errors.js';
import { attachSession, getAuth } from '../../middleware/requireAuth.js';
import * as notificationsService from './notifications.service.js';

export const notificationsRouter = Router();

notificationsRouter.use(attachSession);

notificationsRouter.get('/', async (req, res, next) => {
  try {
    const list = await notificationsService.listNotifications(
      getAuth(req).userId,
    );
    res.json(list);
  } catch (err) {
    next(err);
  }
});

notificationsRouter.get('/unread-count', async (req, res, next) => {
  try {
    const count = await notificationsService.getUnreadCount(
      getAuth(req).userId,
    );
    res.json(count);
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/:id/read', async (req, res, next) => {
  try {
    const params = NotificationIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid notification id');
    }
    const notification = await notificationsService.markNotificationRead(
      params.data.id,
      getAuth(req).userId,
    );
    res.json(notification);
  } catch (err) {
    next(err);
  }
});
