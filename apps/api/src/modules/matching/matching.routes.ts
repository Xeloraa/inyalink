import { Router } from 'express';
import {
  BriefInterestParamsSchema,
  MatchExplanationParamsSchema,
  MatchExplanationQuerySchema,
  MatchingCandidatesQuerySchema,
} from '@inyalink/shared';
import { validateQuery } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';
import { demoAuth, getAuth } from '../../lib/demoUser.js';
import { getCandidateExplanation } from './matching.explain.js';
import * as matchingService from './matching.service.js';

export const matchingRouter = Router();

matchingRouter.use(demoAuth);

/** GET /api/v1/matching/feed — open briefs for the acting professional */
matchingRouter.get('/feed', async (req, res, next) => {
  try {
    const result = await matchingService.getFeed(getAuth(req).userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/matching/candidates?briefId=
 * Top 3 after interest window / demo resolve. Never the full pool.
 */
matchingRouter.get(
  '/candidates',
  validateQuery(MatchingCandidatesQuerySchema),
  async (req, res, next) => {
    try {
      const { briefId } = MatchingCandidatesQuerySchema.parse(req.query);
      const result = await matchingService.getCandidates(
        briefId,
        getAuth(req).userId,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

matchingRouter.get(
  '/candidates/:professionalId/explanation',
  validateQuery(MatchExplanationQuerySchema),
  async (req, res, next) => {
    try {
      const params = MatchExplanationParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid professional id');
      }
      const { briefId, locale } = MatchExplanationQuerySchema.parse(req.query);
      const result = await getCandidateExplanation(
        briefId,
        params.data.professionalId,
        locale,
        getAuth(req).userId,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

matchingRouter.get('/briefs/:briefId/interest', async (req, res, next) => {
  try {
    const params = BriefInterestParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid brief id');
    }
    const result = await matchingService.getMyInterest(
      params.data.briefId,
      getAuth(req).userId,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

matchingRouter.post('/briefs/:briefId/interest', async (req, res, next) => {
  try {
    const params = BriefInterestParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid brief id');
    }
    const result = await matchingService.expressInterest(
      params.data.briefId,
      getAuth(req).userId,
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

matchingRouter.delete('/briefs/:briefId/interest', async (req, res, next) => {
  try {
    const params = BriefInterestParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid brief id');
    }
    const result = await matchingService.withdrawInterest(
      params.data.briefId,
      getAuth(req).userId,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});
