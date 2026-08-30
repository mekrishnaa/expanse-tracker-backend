import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { hashPassword } from '../../lib/password'
import { authenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/requireRole'
import { validate } from '../../middleware/validate'
import { asyncHandler } from '../../utils/asyncHandler'
import { ApiError } from '../../utils/ApiError'
import {
  createUserSchema,
  updateFamilySchema,
  updateUserSchema,
} from './families.schema'

export const familiesRouter = Router()
familiesRouter.use(authenticate)

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const

familiesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const family = await prisma.family.findUnique({
      where: { id: req.user!.familyId },
    })
    if (!family) throw ApiError.notFound('Family not found')
    res.json({ data: family })
  }),
)

familiesRouter.patch(
  '/',
  requireRole('admin'),
  validate(updateFamilySchema),
  asyncHandler(async (req, res) => {
    const family = await prisma.family.update({
      where: { id: req.user!.familyId },
      data: req.body,
    })
    res.json({ data: family })
  }),
)

familiesRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { familyId: req.user!.familyId },
      select: userSelect,
      orderBy: { createdAt: 'asc' },
    })
    res.json({ data: users })
  }),
)

familiesRouter.post(
  '/users',
  requireRole('admin'),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const exists = await prisma.user.findUnique({
      where: { email: req.body.email },
    })
    if (exists) throw ApiError.conflict('Email is already registered')

    const user = await prisma.user.create({
      data: {
        familyId: req.user!.familyId,
        name: req.body.name,
        email: req.body.email,
        passwordHash: await hashPassword(req.body.password),
        role: req.body.role ?? 'parent',
      },
      select: userSelect,
    })
    res.status(201).json({ data: user })
  }),
)

familiesRouter.patch(
  '/users/:id',
  requireRole('admin'),
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    await ensureUser(req.params.id, req.user!.familyId)
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
      select: userSelect,
    })
    res.json({ data: user })
  }),
)

familiesRouter.delete(
  '/users/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.userId) {
      throw ApiError.badRequest('You cannot remove your own account')
    }
    await ensureUser(req.params.id, req.user!.familyId)
    await prisma.user.delete({ where: { id: req.params.id } })
    res.status(204).send()
  }),
)

async function ensureUser(id: string, familyId: string) {
  const user = await prisma.user.findFirst({ where: { id, familyId } })
  if (!user) throw ApiError.notFound('User not found')
  return user
}
