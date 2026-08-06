import { Router } from 'express';
import {
  ProfessionalApplyInputSchema,
  ProfessionalIdParamsSchema,
  ProfessionalsListQuerySchema,
} from '@inyalink/shared';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';
import { getAuth, requireAuth } from '../../middleware/requireAuth.js';
import * as professionalsService from './professionals.service.js';

export const professionalsRouter = Router();

/*
 * Public directory — no auth middleware on these GETs.
 * Do not add attachSession / requireAuth at router level.
 */
professionalsRouter.get('/categories', async (_req, res, next) => {
  try {
    const result = await professionalsService.listCategories();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

professionalsRouter.get('/skills', async (_req, res, next) => {
  try {
    const result = await professionalsService.listSkills();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

professionalsRouter.get(
  '/',
  validateQuery(ProfessionalsListQuerySchema),
  async (req, res, next) => {
    try {
      const query = ProfessionalsListQuerySchema.parse(req.query);
      const result = await professionalsService.listProfessionals({
        categories: query.category,
        minBudget: query.minBudget,
        maxBudget: query.maxBudget,
        acceptingOnly: query.acceptingOnly,
        skills: query.skill,
        q: query.q,
        sort: query.sort,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/** Mutating — signed-in user only. */
professionalsRouter.post(
  '/apply',
  requireAuth,
  validateBody(ProfessionalApplyInputSchema),
  async (req, res, next) => {
    try {
      const body = ProfessionalApplyInputSchema.parse(req.body);
      const result = await professionalsService.applyAsProfessional(
        body,
        getAuth(req).userId,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

/** Public profile by id. */
professionalsRouter.get('/:id', async (req, res, next) => {
  try {
    const params = ProfessionalIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid professional id');
    }
    const profile = await professionalsService.getPublicProfile(params.data.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});
