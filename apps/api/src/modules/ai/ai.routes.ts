import { Router } from 'express';
import {
  ConverseBriefInputSchema,
  GenerateRoadmapInputSchema,
} from '@inyalink/shared';
import { validateBody } from '../../middleware/validate.js';
import { aiRateLimit } from '../../middleware/rateLimit.js';
import { aiDailyCap } from '../../middleware/aiDailyCap.js';
import {
  attachOptionalSession,
  getOptionalAuth,
} from '../../middleware/requireAuth.js';
import * as aiService from './ai.service.js';

export const aiRouter = Router();

/**
 * Anonymous is a first-class caller here, not an error case: describing a
 * problem and getting a roadmap/matches must work with no account — sign-in
 * is only required later, to message someone. See ai.service.ts's
 * createRoadmap for what "no identity" means for persistence.
 */
aiRouter.use(attachOptionalSession);
aiRouter.use(aiRateLimit);
aiRouter.use(aiDailyCap);

aiRouter.post(
  '/brief/converse',
  validateBody(ConverseBriefInputSchema),
  async (req, res, next) => {
    try {
      const body = ConverseBriefInputSchema.parse(req.body);
      const result = await aiService.converseBrief(body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

aiRouter.post(
  '/roadmap',
  validateBody(GenerateRoadmapInputSchema),
  async (req, res, next) => {
    try {
      const body = GenerateRoadmapInputSchema.parse(req.body);
      const userId = getOptionalAuth(req)?.userId ?? null;
      const result = await aiService.createRoadmap(body, userId);
      res.status(result.retryable ? 200 : 201).json(result);
    } catch (err) {
      next(err);
    }
  },
);
