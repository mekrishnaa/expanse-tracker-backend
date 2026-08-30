import type { MemberRole } from '@prisma/client'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        userId: string
        familyId: string
        role: MemberRole
      }
    }
  }
}

export {}
