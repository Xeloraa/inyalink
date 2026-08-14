import { Router } from 'express';
import {
  CreateDirectEngagementInputSchema,
  CreateEngagementInputSchema,
  DeclineEngagementInputSchema,
  EngagementIdParamsSchema,
  EngagementListQuerySchema,
  EngagementMessagesParamsSchema,
  SendMessageInputSchema,
} from '@inyalink/shared';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';
import { attachSession, getAuth } from '../../middleware/requireAuth.js';
import {
  briefCreateRateLimit,
  messageSendRateLimit,
} from '../../middleware/rateLimit.js';
import * as engagementsService from './engagements.service.js';

export const engagementsRouter = Router();

engagementsRouter.use(attachSession);

/** GET /api/v1/engagements/threads — open message threads for the current user */
engagementsRouter.get('/threads', async (req, res, next) => {
  try {
    const result = await engagementsService.listThreads(getAuth(req).userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/engagements/inbox — professional's proposed engagements */
engagementsRouter.get('/inbox', async (req, res, next) => {
  try {
    const result = await engagementsService.listInbox(getAuth(req).userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/engagements?briefId= — client's engagements for a brief */
engagementsRouter.get(
  '/',
  validateQuery(EngagementListQuerySchema),
  async (req, res, next) => {
    try {
      const { briefId } = EngagementListQuerySchema.parse(req.query);
      const result = await engagementsService.listForBrief(
        briefId,
        getAuth(req).userId,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/engagements — client proposes to a top-3 candidate */
engagementsRouter.post(
  '/',
  validateBody(CreateEngagementInputSchema),
  async (req, res, next) => {
    try {
      const body = CreateEngagementInputSchema.parse(req.body);
      const result = await engagementsService.createEngagement(
        body,
        getAuth(req).userId,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

engagementsRouter.post('/:id/accept', async (req, res, next) => {
  try {
    const params = EngagementIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid engagement id');
    }
    const result = await engagementsService.acceptEngagement(
      params.data.id,
      getAuth(req).userId,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

engagementsRouter.post(
  '/:id/decline',
  validateBody(DeclineEngagementInputSchema),
  async (req, res, next) => {
    try {
      const params = EngagementIdParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid engagement id');
      }
      const body = DeclineEngagementInputSchema.parse(req.body);
      const result = await engagementsService.declineEngagement(
        params.data.id,
        getAuth(req).userId,
        body,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/v1/engagements/direct — client messages a professional they
 * haven't been matched with yet (Browse, profile). No brief required.
 */
engagementsRouter.post(
  '/direct',
  briefCreateRateLimit,
  validateBody(CreateDirectEngagementInputSchema),
  async (req, res, next) => {
    try {
      const body = CreateDirectEngagementInputSchema.parse(req.body);
      const result = await engagementsService.startDirectConversation(
        getAuth(req).userId,
        body,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/engagements/:id/messages — thread + pinned brief */
engagementsRouter.get('/:id/messages', async (req, res, next) => {
  try {
    const params = EngagementMessagesParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid engagement id');
    }
    const result = await engagementsService.listThread(
      params.data.id,
      getAuth(req).userId,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/engagements/:id/messages — send (accepted+ only) */
engagementsRouter.post(
  '/:id/messages',
  messageSendRateLimit,
  validateBody(SendMessageInputSchema),
  async (req, res, next) => {
    try {
      const params = EngagementMessagesParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid engagement id');
      }
      const body = SendMessageInputSchema.parse(req.body);
      const result = await engagementsService.sendMessage(
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
