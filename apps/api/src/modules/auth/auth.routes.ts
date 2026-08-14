import { Router } from 'express';
import {
  AuthMeResponseSchema,
  LogoutResponseSchema,
  RequestOtpInputSchema,
  VerifyOtpInputSchema,
} from '@inyalink/shared';
import { validateBody } from '../../middleware/validate.js';
import { getAuth, requireAuth } from '../../middleware/requireAuth.js';
import {
  otpRequestRateLimit,
  otpVerifyRateLimit,
} from '../../middleware/rateLimit.js';
import * as authService from './auth.service.js';

export const authRouter = Router();

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const session = getAuth(req);
    res.json(AuthMeResponseSchema.parse({ session }));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const session = getAuth(req);
    const result = await authService.logout(session.userId);
    res.json(LogoutResponseSchema.parse(result));
  } catch (err) {
    next(err);
  }
});

/**
 * TODO(post-hackathon): phone OTP — needs SMS provider + Myanmar delivery tests.
 */
authRouter.post(
  '/otp/request',
  otpRequestRateLimit,
  validateBody(RequestOtpInputSchema),
  async (req, res, next) => {
    try {
      const body = RequestOtpInputSchema.parse(req.body);
      const result = await authService.requestOtp(body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/otp/verify',
  otpVerifyRateLimit,
  validateBody(VerifyOtpInputSchema),
  async (req, res, next) => {
    try {
      const body = VerifyOtpInputSchema.parse(req.body);
      const result = await authService.verifyOtp(body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
