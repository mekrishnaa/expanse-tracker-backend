import { z } from 'zod'
import { memberRole } from '../common/enums'

const base = {
  name: z.string().min(1).max(100),
  role: memberRole,
  color: z.string().min(1).max(32),
  avatar: z.string().max(200_000).optional(),
  monthlyBudget: z.number().nonnegative().optional(),
}

export const createMemberSchema = z.object({ body: z.object(base) })
export const updateMemberSchema = z.object({
  body: z.object(base).partial(),
})
