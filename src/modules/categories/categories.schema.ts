import { z } from 'zod'
import { txnType } from '../common/enums'

const base = {
  name: z.string().min(1).max(100),
  type: txnType,
  icon: z.string().min(1).max(64),
  color: z.string().min(1).max(32),
  emoji: z.string().max(16).optional(),
  budget: z.number().nonnegative().optional(),
  order: z.number().int(),
  archived: z.boolean().optional(),
}

export const createCategorySchema = z.object({ body: z.object(base) })
export const updateCategorySchema = z.object({
  body: z.object(base).partial(),
})

export const listCategoryQuerySchema = z.object({
  query: z
    .object({
      type: txnType.optional(),
      archived: z.enum(['true', 'false']).optional(),
      page: z.coerce.number().optional(),
      pageSize: z.coerce.number().optional(),
    })
    .passthrough(),
})
