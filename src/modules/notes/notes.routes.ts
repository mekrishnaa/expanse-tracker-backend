import type { Request } from 'express'
import { createCrudRouter } from '../../utils/crudFactory'
import {
  createNoteSchema,
  listNoteQuerySchema,
  updateNoteSchema,
} from './notes.schema'

export const notesRouter = createCrudRouter({
  model: 'note',
  createSchema: createNoteSchema,
  updateSchema: updateNoteSchema,
  listQuerySchema: listNoteQuerySchema,
  defaultOrderBy: { updatedAt: 'desc' },
  listWhere: (req: Request) => {
    const q = req.query as Record<string, string | undefined>
    const where: Record<string, unknown> = {}
    if (q.pinned !== undefined) where.pinned = q.pinned === 'true'
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { content: { contains: q.search, mode: 'insensitive' } },
      ]
    }
    return where
  },
})
