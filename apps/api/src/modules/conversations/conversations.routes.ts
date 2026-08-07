import { Router } from 'express';
import {
  ConversationIdParamsSchema,
  UpsertConversationInputSchema,
} from '@inyalink/shared';
import { validateBody } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';
import { attachSession, getAuth } from '../../middleware/requireAuth.js';
import * as conversationsService from './conversations.service.js';

export const conversationsRouter = Router();

conversationsRouter.use(attachSession);

conversationsRouter.get('/', async (req, res, next) => {
  try {
    const list = await conversationsService.listConversations(
      getAuth(req).userId,
    );
    res.json(list);
  } catch (err) {
    next(err);
  }
});

conversationsRouter.post(
  '/',
  validateBody(UpsertConversationInputSchema),
  async (req, res, next) => {
    try {
      const body = UpsertConversationInputSchema.parse(req.body);
      const conversation = await conversationsService.createConversation(
        body,
        getAuth(req).userId,
      );
      res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  },
);

conversationsRouter.get('/:id', async (req, res, next) => {
  try {
    const params = ConversationIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid conversation id');
    }
    const conversation = await conversationsService.getConversation(
      params.data.id,
      getAuth(req).userId,
    );
    res.json(conversation);
  } catch (err) {
    next(err);
  }
});

conversationsRouter.put(
  '/:id',
  validateBody(UpsertConversationInputSchema),
  async (req, res, next) => {
    try {
      const params = ConversationIdParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid conversation id');
      }
      const body = UpsertConversationInputSchema.parse(req.body);
      const conversation = await conversationsService.updateConversation(
        params.data.id,
        body,
        getAuth(req).userId,
      );
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },
);
