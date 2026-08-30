import { Router, type Request } from 'express'
import { z, type ZodTypeAny } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { asyncHandler } from './asyncHandler'
import { buildMeta, getPagination } from './pagination'
import { ApiError } from './ApiError'

// Prisma model delegate keys that expose the standard CRUD methods.
type ModelName =
  | 'familyMember'
  | 'category'
  | 'account'
  | 'transaction'
  | 'budget'
  | 'savingsGoal'
  | 'bill'
  | 'shoppingList'
  | 'note'
  | 'template'

interface CrudConfig {
  model: ModelName
  createSchema: ZodTypeAny
  updateSchema: ZodTypeAny
  listQuerySchema?: ZodTypeAny
  defaultOrderBy?: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[]
  /** Build additional `where` filters from validated req.query. */
  listWhere?: (req: Request) => Record<string, unknown>
}

const emptyQuerySchema = z.object({ query: z.record(z.any()).optional() })

export function createCrudRouter(config: CrudConfig): Router {
  const router = Router()
  router.use(authenticate)

  // Cast once: the factory intentionally works across model delegates.
  const delegate = () =>
    (prisma as unknown as Record<string, any>)[config.model]

  const scoped = (req: Request, extra: Record<string, unknown> = {}) => ({
    familyId: req.user!.familyId,
    ...extra,
  })

  router.get(
    '/',
    validate(config.listQuerySchema ?? emptyQuerySchema),
    asyncHandler(async (req, res) => {
      const { page, pageSize, skip, take } = getPagination(req)
      const where = scoped(req, config.listWhere?.(req) ?? {})
      const [items, total] = await Promise.all([
        delegate().findMany({
          where,
          orderBy: config.defaultOrderBy,
          skip,
          take,
        }),
        delegate().count({ where }),
      ])
      res.json({ data: items, meta: buildMeta(page, pageSize, total) })
    }),
  )

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const item = await delegate().findFirst({ where: scoped(req, { id: req.params.id }) })
      if (!item) throw ApiError.notFound()
      res.json({ data: item })
    }),
  )

  router.post(
    '/',
    validate(config.createSchema),
    asyncHandler(async (req, res) => {
      const item = await delegate().create({
        data: { ...req.body, familyId: req.user!.familyId },
      })
      res.status(201).json({ data: item })
    }),
  )

  router.patch(
    '/:id',
    validate(config.updateSchema),
    asyncHandler(async (req, res) => {
      const existing = await delegate().findFirst({
        where: scoped(req, { id: req.params.id }),
      })
      if (!existing) throw ApiError.notFound()
      const item = await delegate().update({
        where: { id: req.params.id },
        data: req.body,
      })
      res.json({ data: item })
    }),
  )

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const existing = await delegate().findFirst({
        where: scoped(req, { id: req.params.id }),
      })
      if (!existing) throw ApiError.notFound()
      await delegate().delete({ where: { id: req.params.id } })
      res.status(204).send()
    }),
  )

  return router
}
