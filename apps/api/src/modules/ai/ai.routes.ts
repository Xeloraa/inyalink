import { Router } from 'express';
import {
  ConverseBriefInputSchema,
  GenerateRoadmapInputSchema,
} from '@inyalink/shared';
import { validateBody } from '../../middleware/validate.js';
import { demoAuth, getAuth } from '../../lib/demoUser.js';
import * as aiService from './ai.service.js';

export const aiRouter = Router();

aiRouter.use(demoAuth);

aiRouter.post(
  '/brief/converse',
  (req, _res, next) => {
    console.log('[ai] converse route hit', {
      method: req.method,
      path: req.originalUrl ?? req.url,
    });
    next();
  },
  validateBody(ConverseBriefInputSchema),
  async (req, res, next) => {
    console.log('[ai] converse handler entered');
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
      const result = await aiService.createRoadmap(body, getAuth(req).userId);
      res.status(result.retryable ? 200 : 201).json(result);
    } catch (err) {
      next(err);
    }
  },
);
