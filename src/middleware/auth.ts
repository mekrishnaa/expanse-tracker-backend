import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../lib/jwt'
import { ApiError } from '../utils/ApiError'

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed Authorization header')
  }
  const token = header.slice('Bearer '.length).trim()
  try {
    const payload = verifyAccessToken(token)
    req.user = {
      userId: payload.sub,
      familyId: payload.familyId,
      role: payload.role,
    }
    next()
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token')
  }
}
