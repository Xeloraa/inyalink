import { Router } from 'express';
import {
  BriefIdParamsSchema,
  CreateBriefInputSchema,
  SubmitBriefInputSchema,
  UpdateBriefInputSchema,
} from '@inyalink/shared';
import { validateBody } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';
import { briefCreateRateLimit } from '../../middleware/rateLimit.js';
import { attachSession, getAuth } from '../../middleware/requireAuth.js';
import * as briefsService from './briefs.service.js';

export const briefsRouter = Router();

briefsRouter.use(attachSession);

briefsRouter.post(
  '/',
  briefCreateRateLimit,
  validateBody(CreateBriefInputSchema),
  async (req, res, next) => {
    try {
      const body = CreateBriefInputSchema.parse(req.body);
      const brief = await briefsService.createBrief(body, getAuth(req).userId);
      res.status(201).json(brief);
    } catch (err) {
      next(err);
    }
  },
);

briefsRouter.post(
  '/:id/submit',
  validateBody(SubmitBriefInputSchema),
  async (req, res, next) => {
    try {
      const params = BriefIdParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid brief id');
      }
      const body = SubmitBriefInputSchema.parse(req.body);
      const brief = await briefsService.submitBrief(
        params.data.id,
        body,
        getAuth(req).userId,
      );
      res.json(brief);
    } catch (err) {
      next(err);
    }
  },
);

briefsRouter.get('/:id', async (req, res, next) => {
  try {
    const params = BriefIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid brief id');
    }
    const brief = await briefsService.getBrief(
      params.data.id,
      getAuth(req).userId,
    );
    res.json(brief);
  } catch (err) {
    next(err);
  }
});

briefsRouter.patch(
  '/:id',
  validateBody(UpdateBriefInputSchema),
  async (req, res, next) => {
    try {
      const params = BriefIdParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid brief id');
      }
      const body = UpdateBriefInputSchema.parse(req.body);
      const brief = await briefsService.updateBrief(
        params.data.id,
        body,
        getAuth(req).userId,
      );
      res.json(brief);
    } catch (err) {
      next(err);
    }
  },
);
