import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import studiesRoutes from './routes/studies';
import businessValuesRoutes from './routes/businessValues';
import supportingAssetsRoutes from './routes/supportingAssets';
import fearEventsRoutes from './routes/fearEvents';
import securityBaselinesRoutes from './routes/securityBaselines';
import riskSourcesRoutes from './routes/riskSources';
import targetObjectivesRoutes from './routes/targetObjectives';
import riskSourceObjectivePairsRoutes from './routes/riskSourceObjectivePairs';
import stakeholdersRoutes from './routes/stakeholders';
import strategicScenariosRoutes from './routes/strategicScenarios';
import operationalScenariosRoutes from './routes/operationalScenarios';
import risksRoutes from './routes/risks';
import securityMeasuresRoutes from './routes/securityMeasures';
import logger from './utils/logger';
import { requestIdMiddleware } from './middleware/requestId';

dotenv.config();

function getAllowedOrigins(): string[] {
  const configuredOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (process.env.NODE_ENV === 'development') {
    return [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ];
  }

  return ['http://localhost:5173'];
}

// Sentry — init conditionné par DSN
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.GIT_SHA ?? 'local',
    tracesSampleRate: 0.1,
  });
}

const prismaHealth = new PrismaClient();

const app = express();
const PORT = process.env.PORT ?? 3001;
const START_TIME = Date.now();

// Request ID
app.use(requestIdMiddleware);

// Structured HTTP logger (pino)
app.use(
  pinoHttp({
    logger,
    customProps: (req) => ({
      requestId: (req as express.Request & { requestId?: string }).requestId,
    }),
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        requestId: req.raw.requestId,
      }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
);

// Sécurité HTTP headers
app.use(helmet());

// CORS strict
const allowedOrigins = getAllowedOrigins();
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Cookie parser
app.use(cookieParser());

// Rate limiting global : 100 req/min par IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// Rate limiting renforcé sur l'auth : 10 req/min par IP
app.use('/api/auth', rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts.' },
}));

app.use(express.json());

app.get('/health', async (_req, res) => {
  const uptimeMs = Date.now() - START_TIME;
  let dbStatus: 'ok' | 'error' = 'error';
  try {
    await prismaHealth.$queryRaw`SELECT 1`;
    dbStatus = 'ok';
  } catch {
    // db unreachable
  }
  res.json({
    status: 'ok',
    app: 'Prosper API',
    version: process.env.GIT_SHA ?? '0.1.0',
    environment: process.env.NODE_ENV ?? 'development',
    uptimeMs,
    db: dbStatus,
  });
});

app.get('/api/health', async (_req, res) => {
  const uptimeMs = Date.now() - START_TIME;
  let dbStatus: 'ok' | 'error' = 'error';
  try {
    await prismaHealth.$queryRaw`SELECT 1`;
    dbStatus = 'ok';
  } catch {
    // db unreachable
  }
  res.json({
    ok: true,
    version: process.env.GIT_SHA ?? '0.1.0',
    environment: process.env.NODE_ENV ?? 'development',
    uptimeMs,
    db: dbStatus,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/studies', studiesRoutes);
app.use('/api/studies/:studyId/business-values', businessValuesRoutes);
app.use('/api/studies/:studyId/supporting-assets', supportingAssetsRoutes);
app.use('/api/studies/:studyId/fear-events', fearEventsRoutes);
app.use('/api/studies/:studyId/security-baselines', securityBaselinesRoutes);
app.use('/api/studies/:studyId/risk-sources', riskSourcesRoutes);
app.use('/api/studies/:studyId/target-objectives', targetObjectivesRoutes);
app.use('/api/studies/:studyId/risk-source-objective-pairs', riskSourceObjectivePairsRoutes);
app.use('/api/studies/:studyId/stakeholders', stakeholdersRoutes);
app.use('/api/studies/:studyId/strategic-scenarios', strategicScenariosRoutes);
// Atelier 4
app.use('/api/studies/:studyId/operational-scenarios', operationalScenariosRoutes);
// Atelier 5
app.use('/api/studies/:studyId/risks', risksRoutes);
app.use('/api/studies/:studyId/security-measures', securityMeasuresRoutes);

app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV ?? 'development' }, 'Prosper API started');
});

// Handler d'erreur global
app.use((err: Error, req: import('express').Request, res: import('express').Response, _next: import('express').NextFunction) => {
  logger.error({ err, requestId: req.requestId }, 'Unhandled error');
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
