import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { asyncHandler } from '../../utils/asyncHandler'
import { ApiError } from '../../utils/ApiError'
import {
  createItemSchema,
  createListSchema,
  updateItemSchema,
  updateListSchema,
} from './shopping.schema'

export const shoppingRouter = Router()
shoppingRouter.use(authenticate)

// ---------- Lists ----------
shoppingRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const lists = await prisma.shoppingList.findMany({
      where: { familyId: req.user!.familyId },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ data: lists })
  }),
)

shoppingRouter.post(
  '/',
  validate(createListSchema),
  asyncHandler(async (req, res) => {
    const list = await prisma.shoppingList.create({
      data: { ...req.body, familyId: req.user!.familyId },
    })
    res.status(201).json({ data: list })
  }),
)

shoppingRouter.patch(
  '/:id',
  validate(updateListSchema),
  asyncHandler(async (req, res) => {
    await ensureList(req.params.id, req.user!.familyId)
    const list = await prisma.shoppingList.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json({ data: list })
  }),
)

shoppingRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await ensureList(req.params.id, req.user!.familyId)
    await prisma.shoppingList.delete({ where: { id: req.params.id } })
    res.status(204).send()
  }),
)

// ---------- Items ----------
shoppingRouter.get(
  '/:listId/items',
  asyncHandler(async (req, res) => {
    await ensureList(req.params.listId, req.user!.familyId)
    const items = await prisma.shoppingItem.findMany({
      where: { listId: req.params.listId, familyId: req.user!.familyId },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ data: items })
  }),
)

shoppingRouter.post(
  '/:listId/items',
  validate(createItemSchema),
  asyncHandler(async (req, res) => {
    await ensureList(req.params.listId, req.user!.familyId)
    const item = await prisma.shoppingItem.create({
      data: {
        ...req.body,
        listId: req.params.listId,
        familyId: req.user!.familyId,
      },
    })
    res.status(201).json({ data: item })
  }),
)

shoppingRouter.patch(
  '/:listId/items/:id',
  validate(updateItemSchema),
  asyncHandler(async (req, res) => {
    await ensureItem(req.params.id, req.params.listId, req.user!.familyId)
    const item = await prisma.shoppingItem.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json({ data: item })
  }),
)

shoppingRouter.delete(
  '/:listId/items/:id',
  asyncHandler(async (req, res) => {
    await ensureItem(req.params.id, req.params.listId, req.user!.familyId)
    await prisma.shoppingItem.delete({ where: { id: req.params.id } })
    res.status(204).send()
  }),
)

async function ensureList(id: string, familyId: string) {
  const list = await prisma.shoppingList.findFirst({ where: { id, familyId } })
  if (!list) throw ApiError.notFound('Shopping list not found')
  return list
}

async function ensureItem(id: string, listId: string, familyId: string) {
  const item = await prisma.shoppingItem.findFirst({
    where: { id, listId, familyId },
  })
  if (!item) throw ApiError.notFound('Shopping item not found')
  return item
}
