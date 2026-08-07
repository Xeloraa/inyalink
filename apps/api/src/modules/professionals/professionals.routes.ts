import { Router } from 'express';
import {
  PortfolioItemIdParamsSchema,
  PortfolioUploadItemSchema,
  ProfessionalApplyInputSchema,
  ProfessionalIdParamsSchema,
  ProfessionalUpdateInputSchema,
  ProfessionalsListQuerySchema,
  WorkLinkCreateInputSchema,
  WorkLinkIdParamsSchema,
} from '@inyalink/shared';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';
import { getAuth, attachSession } from '../../middleware/requireAuth.js';
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

/** Own profile — must be registered before /:id. */
professionalsRouter.get('/me', attachSession, async (req, res, next) => {
  try {
    const profile = await professionalsService.getMyProfessional(
      getAuth(req).userId,
    );
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

professionalsRouter.patch(
  '/me',
  attachSession,
  validateBody(ProfessionalUpdateInputSchema),
  async (req, res, next) => {
    try {
      const body = ProfessionalUpdateInputSchema.parse(req.body);
      const profile = await professionalsService.updateMyProfessional(
        getAuth(req).userId,
        body,
      );
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },
);

professionalsRouter.post(
  '/me/portfolio',
  attachSession,
  validateBody(PortfolioUploadItemSchema),
  async (req, res, next) => {
    try {
      const body = PortfolioUploadItemSchema.parse(req.body);
      const item = await professionalsService.addMyPortfolioItem(
        getAuth(req).userId,
        body,
      );
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  },
);

professionalsRouter.delete(
  '/me/portfolio/:itemId',
  attachSession,
  async (req, res, next) => {
    try {
      const params = PortfolioItemIdParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid portfolio item id');
      }
      await professionalsService.deleteMyPortfolioItem(
        getAuth(req).userId,
        params.data.itemId,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

professionalsRouter.post(
  '/me/work-links',
  attachSession,
  validateBody(WorkLinkCreateInputSchema),
  async (req, res, next) => {
    try {
      const body = WorkLinkCreateInputSchema.parse(req.body);
      const item = await professionalsService.addMyWorkLink(
        getAuth(req).userId,
        body,
      );
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  },
);

professionalsRouter.delete(
  '/me/work-links/:linkId',
  attachSession,
  async (req, res, next) => {
    try {
      const params = WorkLinkIdParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid work link id');
      }
      await professionalsService.deleteMyWorkLink(
        getAuth(req).userId,
        params.data.linkId,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

/** Mutating — session required (DEMO_MODE falls back to demo identity). */
professionalsRouter.post(
  '/apply',
  attachSession,
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
