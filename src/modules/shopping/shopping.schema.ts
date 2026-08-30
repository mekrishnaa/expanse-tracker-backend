import { z } from 'zod'

export const createListSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    emoji: z.string().max(16),
  }),
})

export const updateListSchema = z.object({
  body: createListSchema.shape.body.partial(),
})

export const createItemSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    qty: z.number().int().positive().optional(),
    estimatedCost: z.number().nonnegative().optional(),
    purchased: z.boolean().optional(),
  }),
})

export const updateItemSchema = z.object({
  body: createItemSchema.shape.body.partial(),
})
