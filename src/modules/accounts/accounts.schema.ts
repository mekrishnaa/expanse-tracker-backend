import { z } from 'zod'
import { accountType } from '../common/enums'

const base = {
  name: z.string().min(1).max(100),
  type: accountType,
  balance: z.number(),
  color: z.string().min(1).max(32),
  icon: z.string().min(1).max(64),
}

export const createAccountSchema = z.object({ body: z.object(base) })
export const updateAccountSchema = z.object({
  body: z.object(base).partial(),
})
