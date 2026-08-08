import { Router } from 'express';
import {
  AdminAssignBriefInputSchema,
  AdminBriefsListQuerySchema,
  AdminEngagementsListQuerySchema,
  AdminPatchEngagementStatusInputSchema,
  AdminReviewProfessionalInputSchema,
} from '@inyalink/shared';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { getAuth } from '../../middleware/requireAuth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';
import * as adminService from './admin.service.js';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

function uuidParam(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', `Invalid ${name}`);
  }
  return value;
}

/** GET /api/v1/admin/dashboard */
adminRouter.get('/dashboard', async (_req, res, next) => {
  try {
    res.json(await adminService.getDashboard());
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/admin/professionals/pending */
adminRouter.get('/professionals/pending', async (_req, res, next) => {
  try {
    res.json(await adminService.listPendingProfessionals());
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/admin/professionals/:id/review */
adminRouter.post(
  '/professionals/:id/review',
  validateBody(AdminReviewProfessionalInputSchema),
  async (req, res, next) => {
    try {
      const id = uuidParam(req.params['id'], 'id');
      const auth = getAuth(req);
      res.json(
        await adminService.reviewProfessional(id, req.body, auth.userId),
      );
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/admin/briefs */
adminRouter.get(
  '/briefs',
  validateQuery(AdminBriefsListQuerySchema),
  async (req, res, next) => {
    try {
      const query = AdminBriefsListQuerySchema.parse(req.query);
      res.json(await adminService.listBriefs(query));
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/admin/briefs/:id/assign */
adminRouter.post(
  '/briefs/:id/assign',
  validateBody(AdminAssignBriefInputSchema),
  async (req, res, next) => {
    try {
      const id = uuidParam(req.params['id'], 'id');
      const auth = getAuth(req);
      res.json(await adminService.assignBrief(id, req.body, auth.userId));
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/admin/engagements */
adminRouter.get(
  '/engagements',
  validateQuery(AdminEngagementsListQuerySchema),
  async (req, res, next) => {
    try {
      const query = AdminEngagementsListQuerySchema.parse(req.query);
      res.json(await adminService.listEngagements(query));
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/v1/admin/engagements/:id/status */
adminRouter.patch(
  '/engagements/:id/status',
  validateBody(AdminPatchEngagementStatusInputSchema),
  async (req, res, next) => {
    try {
      const id = uuidParam(req.params['id'], 'id');
      const auth = getAuth(req);
      res.json(
        await adminService.patchEngagementStatus(id, req.body, auth.userId),
      );
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/admin/metrics */
adminRouter.get('/metrics', async (_req, res, next) => {
  try {
    res.json(await adminService.getOpsMetrics());
  } catch (err) {
    next(err);
  }
});
