import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { env } from '../../config/env'
import { authenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { asyncHandler } from '../../utils/asyncHandler'
import { ApiError } from '../../utils/ApiError'
import { subscribeSchema, unsubscribeSchema } from './push.schema'
import { runReminders } from './push.service'

export const pushRouter = Router()

// Public: the VAPID public key the browser needs to subscribe.
pushRouter.get(
  '/vapid-public-key',
  asyncHandler(async (_req, res) => {
    if (!env.pushEnabled) throw ApiError.notFound('Push is not configured')
    res.json({ data: { publicKey: env.VAPID_PUBLIC_KEY } })
  }),
)

// Secured trigger for an external scheduler (cron-job.org, GitHub Actions, etc.)
pushRouter.post(
  '/run',
  asyncHandler(async (req, res) => {
    if (!env.CRON_SECRET) throw ApiError.notFound('Reminder runner disabled')
    const provided = req.header('x-cron-secret')
    if (provided !== env.CRON_SECRET) throw ApiError.unauthorized()
    const result = await runReminders()
    res.json({ data: result })
  }),
)

pushRouter.use(authenticate)

pushRouter.post(
  '/subscribe',
  validate(subscribeSchema),
  asyncHandler(async (req, res) => {
    const { endpoint, keys } = req.body
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        familyId: req.user!.familyId,
        userId: req.user!.userId,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        familyId: req.user!.familyId,
        userId: req.user!.userId,
      },
    })
    res.status(201).json({ data: { id: sub.id } })
  }),
)

pushRouter.post(
  '/unsubscribe',
  validate(unsubscribeSchema),
  asyncHandler(async (req, res) => {
    await prisma.pushSubscription
      .delete({ where: { endpoint: req.body.endpoint } })
      .catch(() => undefined)
    res.status(204).send()
  }),
)
