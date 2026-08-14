import express from 'express';
import { HealthResponseSchema } from '@inyalink/shared';
import { config } from './lib/config.js';
import { isOriginAllowed, parseCorsOrigins } from './lib/cors.js';
import { startRetentionScheduler } from './lib/retention.js';
import { errorMiddleware } from './middleware/errors.js';
import { messageSendRateLimit } from './middleware/rateLimit.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { aiRouter } from './modules/ai/ai.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { briefsRouter } from './modules/briefs/briefs.routes.js';
import { conversationsRouter } from './modules/conversations/conversations.routes.js';
import { matchingRouter } from './modules/matching/matching.routes.js';
import { engagementsRouter } from './modules/engagements/engagements.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { professionalsRouter } from './modules/professionals/professionals.routes.js';

const app = express();

const corsAllowlist = parseCorsOrigins(process.env['CORS_ORIGIN']);

/** Browser calls from Vercel → Railway need CORS; Vite proxy does not. */
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  const matched = isOriginAllowed(requestOrigin, corsAllowlist);

  if (corsAllowlist === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (matched && requestOrigin) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Demo-User-Id',
  );
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  const body = HealthResponseSchema.parse({ status: 'ok' });
  res.json(body);
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/briefs', briefsRouter);
app.use('/api/v1/conversations', conversationsRouter);
app.use('/api/v1/matching', matchingRouter);
/**
 * Message-send rate limit lives here so it applies as soon as a messages
 * route is mounted under /engagements (path-based, independent of router).
 */
app.post(
  '/api/v1/engagements/:id/messages',
  messageSendRateLimit,
  (_req, _res, next) => next(),
);
app.use('/api/v1/engagements', engagementsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/professionals', professionalsRouter);
app.use('/api/v1/admin', adminRouter);

app.use(errorMiddleware);

app.listen(config.port, () => {
  console.log(`api listening on :${config.port}`);
  startRetentionScheduler();
});
