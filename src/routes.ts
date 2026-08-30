import { Router } from 'express'
import { authRouter } from './modules/auth/auth.routes'
import { familiesRouter } from './modules/families/families.routes'
import { membersRouter } from './modules/members/members.routes'
import { categoriesRouter } from './modules/categories/categories.routes'
import { accountsRouter } from './modules/accounts/accounts.routes'
import { transactionsRouter } from './modules/transactions/transactions.routes'
import { budgetsRouter } from './modules/budgets/budgets.routes'
import { goalsRouter } from './modules/goals/goals.routes'
import { billsRouter } from './modules/bills/bills.routes'
import { shoppingRouter } from './modules/shopping/shopping.routes'
import { notesRouter } from './modules/notes/notes.routes'
import { templatesRouter } from './modules/templates/templates.routes'
import { settingsRouter } from './modules/settings/settings.routes'
import { migrationRouter } from './modules/migration/migration.routes'
import { healthRouter } from './modules/health/health.routes'

export const apiRouter = Router()

apiRouter.use('/health', healthRouter)
apiRouter.use('/auth', authRouter)
apiRouter.use('/family', familiesRouter)
apiRouter.use('/members', membersRouter)
apiRouter.use('/categories', categoriesRouter)
apiRouter.use('/accounts', accountsRouter)
apiRouter.use('/transactions', transactionsRouter)
apiRouter.use('/budgets', budgetsRouter)
apiRouter.use('/goals', goalsRouter)
apiRouter.use('/bills', billsRouter)
apiRouter.use('/shopping-lists', shoppingRouter)
apiRouter.use('/notes', notesRouter)
apiRouter.use('/templates', templatesRouter)
apiRouter.use('/settings', settingsRouter)
apiRouter.use('/migration', migrationRouter)
