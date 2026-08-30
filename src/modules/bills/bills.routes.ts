import type { Request } from 'express'
import { createCrudRouter } from '../../utils/crudFactory'
import {
  createBillSchema,
  listBillQuerySchema,
  updateBillSchema,
} from './bills.schema'

export const billsRouter = createCrudRouter({
  model: 'bill',
  createSchema: createBillSchema,
  updateSchema: updateBillSchema,
  listQuerySchema: listBillQuerySchema,
  defaultOrderBy: { dueDate: 'asc' },
  listWhere: (req: Request) => {
    const where: Record<string, unknown> = {}
    if (req.query.dueBefore) where.dueDate = { lte: req.query.dueBefore }
    if (req.query.paid !== undefined) where.paid = req.query.paid === 'true'
    return where
  },
})
