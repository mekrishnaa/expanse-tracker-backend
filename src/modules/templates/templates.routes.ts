import { createCrudRouter } from '../../utils/crudFactory'
import { createTemplateSchema, updateTemplateSchema } from './templates.schema'

export const templatesRouter = createCrudRouter({
  model: 'template',
  createSchema: createTemplateSchema,
  updateSchema: updateTemplateSchema,
  defaultOrderBy: { createdAt: 'asc' },
})
