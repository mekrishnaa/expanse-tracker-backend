import type { Request } from 'express'
import { createCrudRouter } from '../../utils/crudFactory'
import {
  createTransactionSchema,
  listTransactionQuerySchema,
  updateTransactionSchema,
} from './transactions.schema'

export const transactionsRouter = createCrudRouter({
  model: 'transaction',
  createSchema: createTransactionSchema,
  updateSchema: updateTransactionSchema,
  listQuerySchema: listTransactionQuerySchema,
  defaultOrderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  listWhere: (req: Request) => {
    const q = req.query as Record<string, string | undefined>
    const where: Record<string, unknown> = {}

    if (q.month) where.date = { startsWith: q.month }
    if (q.from || q.to) {
      where.date = {
        ...(typeof where.date === 'object' ? where.date : {}),
        ...(q.from ? { gte: q.from } : {}),
        ...(q.to ? { lte: q.to } : {}),
      }
    }
    if (q.type) where.type = q.type
    if (q.categoryId) where.categoryId = q.categoryId
    if (q.memberId) where.memberId = q.memberId
    if (q.accountId) where.accountId = q.accountId
    if (q.tag) where.tags = { has: q.tag }
    if (q.search) {
      where.OR = [
        { description: { contains: q.search, mode: 'insensitive' } },
        { merchant: { contains: q.search, mode: 'insensitive' } },
        { notes: { contains: q.search, mode: 'insensitive' } },
      ]
    }
    return where
  },
})
