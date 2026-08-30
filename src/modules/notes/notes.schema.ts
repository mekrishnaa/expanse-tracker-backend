import { z } from 'zod'

const base = {
  title: z.string().min(1).max(200),
  content: z.string().max(50_000),
  pinned: z.boolean().optional(),
  color: z.string().max(32).optional(),
}

export const createNoteSchema = z.object({ body: z.object(base) })
export const updateNoteSchema = z.object({ body: z.object(base).partial() })

export const listNoteQuerySchema = z.object({
  query: z
    .object({
      pinned: z.enum(['true', 'false']).optional(),
      search: z.string().optional(),
      page: z.coerce.number().optional(),
      pageSize: z.coerce.number().optional(),
    })
    .passthrough(),
})
