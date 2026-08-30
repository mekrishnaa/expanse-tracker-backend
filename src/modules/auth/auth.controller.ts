import type { Request, Response } from 'express'
import { authService } from './auth.service'
import { verifyRefreshToken } from '../../lib/jwt'

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body)
    res.status(201).json({ data: result })
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body)
    res.status(200).json({ data: result })
  },

  async refresh(req: Request, res: Response) {
    const result = await authService.refresh(req.body.refreshToken)
    res.status(200).json({ data: result })
  },

  async logout(req: Request, res: Response) {
    // Best-effort: derive user from refresh token if present
    try {
      const payload = verifyRefreshToken(req.body.refreshToken)
      await authService.logout(payload.sub)
    } catch {
      // ignore invalid token on logout
    }
    res.status(204).send()
  },

  async me(req: Request, res: Response) {
    const result = await authService.me(req.user!.userId)
    res.status(200).json({ data: result })
  },
}
