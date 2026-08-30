import { createCrudRouter } from '../../utils/crudFactory'
import { createGoalSchema, updateGoalSchema } from './goals.schema'

export const goalsRouter = createCrudRouter({
  model: 'savingsGoal',
  createSchema: createGoalSchema,
  updateSchema: updateGoalSchema,
  defaultOrderBy: { createdAt: 'desc' },
})
