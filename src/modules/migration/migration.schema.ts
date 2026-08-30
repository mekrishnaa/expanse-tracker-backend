import { z } from 'zod'

// Bulk payloads are loosely typed; per-record validation happens in the service.
export const importSchema = z.object({
  body: z
    .object({
      version: z.number().optional(),
      exportedAt: z.number().optional(),
      data: z.record(z.array(z.record(z.any()))).optional(),
    })
    .passthrough(),
  query: z
    .object({ mode: z.enum(['append', 'replace']).optional() })
    .passthrough(),
})
