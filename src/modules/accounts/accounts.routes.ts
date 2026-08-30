import { createCrudRouter } from '../../utils/crudFactory'
import { createAccountSchema, updateAccountSchema } from './accounts.schema'

export const accountsRouter = createCrudRouter({
  model: 'account',
  createSchema: createAccountSchema,
  updateSchema: updateAccountSchema,
  defaultOrderBy: { createdAt: 'asc' },
})
