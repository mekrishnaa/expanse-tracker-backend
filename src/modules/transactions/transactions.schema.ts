import { z } from 'zod'
import { hhmm, isoDate, txnType, uuid } from '../common/enums'

const base = {
  type: txnType,
  amount: z.number().positive(),
  categoryId: uuid.optional(),
  budgetId: uuid.optional(),
  memberId: uuid.optional(),
  accountId: uuid.optional(),
  toAccountId: uuid.optional(),
  description: z.string().max(500).optional(),
  merchant: z.string().max(200).optional(),
  paymentMethod: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).optional(),
  notes: z.string().max(2000).optional(),
  receipt: z.string().max(2_000_000).optional(),
  date: isoDate,
  time: hhmm.optional(),
}

export const createTransactionSchema = z.object({ body: z.object(base) })
export const updateTransactionSchema = z.object({
  body: z.object(base).partial(),
})

export const listTransactionQuerySchema = z.object({
  query: z
    .object({
      month: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      type: txnType.optional(),
      categoryId: uuid.optional(),
      memberId: uuid.optional(),
      accountId: uuid.optional(),
      tag: z.string().optional(),
      search: z.string().optional(),
      page: z.coerce.number().optional(),
      pageSize: z.coerce.number().optional(),
    })
    .passthrough(),
})
