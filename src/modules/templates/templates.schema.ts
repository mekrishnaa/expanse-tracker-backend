import { z } from 'zod'
import { txnType, uuid } from '../common/enums'

const base = {
  label: z.string().min(1).max(100),
  emoji: z.string().max(16).optional(),
  type: txnType,
  amount: z.number().positive().optional(),
  categoryId: uuid.optional(),
  budgetId: uuid.optional(),
  memberId: uuid.optional(),
  accountId: uuid.optional(),
  paymentMethod: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).optional(),
}

export const createTemplateSchema = z.object({ body: z.object(base) })
export const updateTemplateSchema = z.object({
  body: z.object(base).partial(),
})
