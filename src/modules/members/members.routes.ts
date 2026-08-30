import { createCrudRouter } from '../../utils/crudFactory'
import { createMemberSchema, updateMemberSchema } from './members.schema'

export const membersRouter = createCrudRouter({
  model: 'familyMember',
  createSchema: createMemberSchema,
  updateSchema: updateMemberSchema,
  defaultOrderBy: { createdAt: 'asc' },
})
