import type { Request, Response } from 'express'
import { ApiError } from '../utils/ApiError'

export function notFound(_req: Request, _res: Response): never {
  throw ApiError.notFound('Route not found')
}
