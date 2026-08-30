import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { pinoHttp } from 'pino-http'
import { env } from './config/env'
import { logger } from './lib/logger'
import { apiRouter } from './routes'
import { notFound } from './middleware/notFound'
import { errorHandler } from './middleware/error'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '10mb' }))
  app.use(pinoHttp({ logger }))

  // Global light rate limit.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1000,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )

  // Stricter limit on auth endpoints.
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 50,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )

  app.use('/api', apiRouter)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
