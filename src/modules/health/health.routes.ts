import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { asyncHandler } from '../../utils/asyncHandler'

export const healthRouter = Router()

healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() })
  }),
)
