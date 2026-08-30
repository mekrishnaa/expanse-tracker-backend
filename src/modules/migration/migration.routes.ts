import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { asyncHandler } from '../../utils/asyncHandler'
import { importSchema } from './migration.schema'
import { exportBackup, importBackup } from './migration.service'

export const migrationRouter = Router()
migrationRouter.use(authenticate)

migrationRouter.post(
  '/import',
  validate(importSchema),
  asyncHandler(async (req, res) => {
    const mode = req.query.mode === 'replace' ? 'replace' : 'append'
    const result = await importBackup(req.user!.familyId, req.body, mode)
    res.status(200).json({ data: result })
  }),
)

migrationRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    const backup = await exportBackup(req.user!.familyId)
    res.status(200).json(backup)
  }),
)
