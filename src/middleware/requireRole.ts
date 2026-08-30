import type { NextFunction, Request, Response } from 'express'
import type { MemberRole } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

export function requireRole(...roles: MemberRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw ApiError.unauthorized()
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('Insufficient permissions')
    }
    next()
  }
}
