import { z } from 'zod'
import { monthKey, uuid } from '../common/enums'

const base = {
  categoryId: uuid,
  month: monthKey,
  limit: z.number().nonnegative(),
  name: z.string().max(100).optional(),
  rollover: z.boolean().optional(),
}

export const createBudgetSchema = z.object({ body: z.object(base) })
export const updateBudgetSchema = z.object({
  body: z.object(base).partial(),
})

export const listBudgetQuerySchema = z.object({
  query: z
    .object({
      month: z.string().optional(),
      categoryId: uuid.optional(),
      page: z.coerce.number().optional(),
      pageSize: z.coerce.number().optional(),
    })
    .passthrough(),
})
