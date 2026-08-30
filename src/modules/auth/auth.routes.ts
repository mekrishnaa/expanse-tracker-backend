import { Router } from 'express'
import { authController } from './auth.controller'
import { loginSchema, refreshSchema, registerSchema } from './auth.schema'
import { validate } from '../../middleware/validate'
import { authenticate } from '../../middleware/auth'
import { asyncHandler } from '../../utils/asyncHandler'

export const authRouter = Router()

authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(authController.register),
)
authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(authController.login),
)
authRouter.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(authController.refresh),
)
authRouter.post(
  '/logout',
  validate(refreshSchema),
  asyncHandler(authController.logout),
)
authRouter.get('/me', authenticate, asyncHandler(authController.me))
