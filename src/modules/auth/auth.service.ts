import { randomUUID } from 'node:crypto'
import { prisma } from '../../lib/prisma'
import { hashPassword, verifyPassword } from '../../lib/password'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../lib/jwt'
import { ApiError } from '../../utils/ApiError'
import type { LoginInput, RegisterInput } from './auth.schema'

function publicUser(user: {
  id: string
  email: string
  name: string
  role: import('@prisma/client').MemberRole
  familyId: string
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    familyId: user.familyId,
  }
}

async function issueTokens(user: {
  id: string
  familyId: string
  role: import('@prisma/client').MemberRole
}) {
  const tokenId = randomUUID()
  const accessToken = signAccessToken({
    sub: user.id,
    familyId: user.familyId,
    role: user.role,
  })
  const refreshToken = signRefreshToken({ sub: user.id, tokenId })
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: await hashPassword(tokenId) },
  })
  return { accessToken, refreshToken }
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    })
    if (existing) throw ApiError.conflict('Email is already registered')

    const passwordHash = await hashPassword(input.password)

    const { user, family } = await prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: { name: input.familyName, currency: input.currency ?? 'INR' },
      })
      const user = await tx.user.create({
        data: {
          familyId: family.id,
          email: input.email,
          name: input.name,
          passwordHash,
          role: 'admin',
        },
      })
      return { user, family }
    })

    const tokens = await issueTokens(user)
    return { user: publicUser(user), family, tokens }
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { family: true },
    })
    if (!user) throw ApiError.unauthorized('Invalid credentials')

    const ok = await verifyPassword(user.passwordHash, input.password)
    if (!ok) throw ApiError.unauthorized('Invalid credentials')

    const tokens = await issueTokens(user)
    return { user: publicUser(user), family: user.family, tokens }
  },

  async refresh(refreshToken: string) {
    let payload
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token')
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.refreshToken) {
      throw ApiError.unauthorized('Refresh token revoked')
    }

    const valid = await verifyPassword(user.refreshToken, payload.tokenId)
    if (!valid) throw ApiError.unauthorized('Refresh token revoked')

    const tokens = await issueTokens(user)
    return { tokens }
  },

  async logout(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    })
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { family: true },
    })
    if (!user) throw ApiError.notFound('User not found')
    return { user: publicUser(user), family: user.family }
  },
}
