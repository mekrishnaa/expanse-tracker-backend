import type { Request } from 'express'
import { createCrudRouter } from '../../utils/crudFactory'
import {
  createBudgetSchema,
  listBudgetQuerySchema,
  updateBudgetSchema,
} from './budgets.schema'

export const budgetsRouter = createCrudRouter({
  model: 'budget',
  createSchema: createBudgetSchema,
  updateSchema: updateBudgetSchema,
  listQuerySchema: listBudgetQuerySchema,
  defaultOrderBy: { month: 'desc' },
  listWhere: (req: Request) => {
    const where: Record<string, unknown> = {}
    if (req.query.month) where.month = req.query.month
    if (req.query.categoryId) where.categoryId = req.query.categoryId
    return where
  },
})
