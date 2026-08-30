import type { Request } from 'express'
import { createCrudRouter } from '../../utils/crudFactory'
import {
  createCategorySchema,
  listCategoryQuerySchema,
  updateCategorySchema,
} from './categories.schema'

export const categoriesRouter = createCrudRouter({
  model: 'category',
  createSchema: createCategorySchema,
  updateSchema: updateCategorySchema,
  listQuerySchema: listCategoryQuerySchema,
  defaultOrderBy: { order: 'asc' },
  listWhere: (req: Request) => {
    const where: Record<string, unknown> = {}
    if (req.query.type) where.type = req.query.type
    if (req.query.archived !== undefined)
      where.archived = req.query.archived === 'true'
    return where
  },
})
