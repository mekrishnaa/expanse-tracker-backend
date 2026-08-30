import { z } from 'zod'
import { memberRole } from '../common/enums'

export const updateFamilySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    currency: z.string().min(1).max(8).optional(),
  }),
})

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    role: memberRole.optional(),
  }),
})

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    role: memberRole.optional(),
  }),
})
