import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { asyncHandler } from '../../utils/asyncHandler'

export const settingsRouter = Router()
settingsRouter.use(authenticate)

const upsertSchema = z.object({
  body: z.object({ data: z.record(z.any()) }),
})

settingsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const setting = await prisma.setting.findUnique({
      where: { userId: req.user!.userId },
    })
    res.json({ data: setting?.data ?? null })
  }),
)

settingsRouter.put(
  '/',
  validate(upsertSchema),
  asyncHandler(async (req, res) => {
    const setting = await prisma.setting.upsert({
      where: { userId: req.user!.userId },
      create: {
        userId: req.user!.userId,
        familyId: req.user!.familyId,
        data: req.body.data,
      },
      update: { data: req.body.data },
    })
    res.json({ data: setting.data })
  }),
)
