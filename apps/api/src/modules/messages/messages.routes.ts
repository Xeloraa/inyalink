import { Router } from 'express';
import {
  EngagementMessagesParamsSchema,
  SendMessageInputSchema,
} from '@inyalink/shared';
import { validateBody } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';
import { attachSession, getAuth } from '../../middleware/requireAuth.js';
import * as messagesService from './messages.service.js';

export const messagesRouter = Router();

messagesRouter.use(attachSession);

/** GET /api/v1/engagements/threads — open message threads for the current user */
messagesRouter.get('/threads', async (req, res, next) => {
  try {
    const result = await messagesService.listThreads(getAuth(req).userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/engagements/:id/messages — thread + pinned brief */
messagesRouter.get('/:id/messages', async (req, res, next) => {
  try {
    const params = EngagementMessagesParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid engagement id');
    }
    const result = await messagesService.listThread(
      params.data.id,
      getAuth(req).userId,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/engagements/:id/messages — send (accepted+ only) */
messagesRouter.post(
  '/:id/messages',
  validateBody(SendMessageInputSchema),
  async (req, res, next) => {
    try {
      const params = EngagementMessagesParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid engagement id');
      }
      const body = SendMessageInputSchema.parse(req.body);
      const result = await messagesService.sendMessage(
        params.data.id,
        getAuth(req).userId,
        body,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);
