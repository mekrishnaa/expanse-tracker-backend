import { z } from 'zod'

export const registerSchema = z.object({
  body: z.object({
    familyName: z.string().min(1).max(100),
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    currency: z.string().min(1).max(8).optional(),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
})

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
})

export type RegisterInput = z.infer<typeof registerSchema>['body']
export type LoginInput = z.infer<typeof loginSchema>['body']
