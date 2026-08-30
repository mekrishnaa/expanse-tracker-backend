import type { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { ApiError } from '../utils/ApiError'
import { logger } from '../lib/logger'
import { env } from '../config/env'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // next is required for Express to recognize this as an error handler
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten(),
      },
    })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'A record with these values already exists',
            details: err.meta,
          },
        })
        return
      case 'P2025':
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Resource not found' },
        })
        return
      case 'P2003':
        res.status(400).json({
          error: {
            code: 'BAD_REFERENCE',
            message: 'Referenced record does not exist',
          },
        })
        return
    }
  }

  logger.error({ err }, 'Unhandled error')
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.isProd ? 'Internal server error' : String(err),
    },
  })
}
