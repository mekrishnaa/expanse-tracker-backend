import { z } from 'zod'
import { isoDate } from '../common/enums'

const base = {
  name: z.string().min(1).max(100),
  emoji: z.string().max(16),
  targetAmount: z.number().positive(),
  currentAmount: z.number().nonnegative().optional(),
  deadline: isoDate.optional(),
  color: z.string().min(1).max(32),
  completedAt: z.coerce.date().optional(),
}

export const createGoalSchema = z.object({ body: z.object(base) })
export const updateGoalSchema = z.object({ body: z.object(base).partial() })
