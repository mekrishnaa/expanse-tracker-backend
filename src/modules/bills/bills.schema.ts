import { z } from 'zod'
import { billFrequency, isoDate, uuid } from '../common/enums'

const base = {
  name: z.string().min(1).max(100),
  amount: z.number().nonnegative(),
  categoryId: uuid.optional(),
  dueDate: isoDate,
  frequency: billFrequency,
  isEmi: z.boolean().optional(),
  emiTotalMonths: z.number().int().positive().optional(),
  emiPaidMonths: z.number().int().nonnegative().optional(),
  autoRepeat: z.boolean().optional(),
  paid: z.boolean().optional(),
  reminderDays: z.number().int().nonnegative().optional(),
}

export const createBillSchema = z.object({ body: z.object(base) })
export const updateBillSchema = z.object({ body: z.object(base).partial() })

export const listBillQuerySchema = z.object({
  query: z
    .object({
      dueBefore: z.string().optional(),
      paid: z.enum(['true', 'false']).optional(),
      page: z.coerce.number().optional(),
      pageSize: z.coerce.number().optional(),
    })
    .passthrough(),
})
