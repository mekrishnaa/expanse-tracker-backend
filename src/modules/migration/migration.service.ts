import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'

type Row = Record<string, any>
type IdMap = Map<string | number, string>

const toDate = (v: unknown): Date | undefined => {
  if (v === null || v === undefined) return undefined
  const d = typeof v === 'number' ? new Date(v) : new Date(String(v))
  return isNaN(d.getTime()) ? undefined : d
}

const ref = (map: IdMap, id: unknown): string | undefined =>
  id === null || id === undefined ? undefined : map.get(id as string | number)

/**
 * Import a frontend `exportJSON()` backup into the caller's family.
 * Remaps the frontend's numeric ids to server UUIDs in dependency order.
 */
export async function importBackup(
  familyId: string,
  payload: Row,
  mode: 'append' | 'replace',
) {
  const data: Record<string, Row[]> = payload.data ?? payload
  const get = (name: string): Row[] =>
    Array.isArray(data[name]) ? data[name] : []

  const inserted: Record<string, number> = {}

  await prisma.$transaction(
    async (tx) => {
      if (mode === 'replace') {
        // Delete in FK-safe order (children first).
        await tx.transaction.deleteMany({ where: { familyId } })
        await tx.shoppingItem.deleteMany({ where: { familyId } })
        await tx.template.deleteMany({ where: { familyId } })
        await tx.note.deleteMany({ where: { familyId } })
        await tx.bill.deleteMany({ where: { familyId } })
        await tx.savingsGoal.deleteMany({ where: { familyId } })
        await tx.shoppingList.deleteMany({ where: { familyId } })
        await tx.budget.deleteMany({ where: { familyId } })
        await tx.transaction.deleteMany({ where: { familyId } })
        await tx.account.deleteMany({ where: { familyId } })
        await tx.category.deleteMany({ where: { familyId } })
        await tx.familyMember.deleteMany({ where: { familyId } })
      }

      const memberMap: IdMap = new Map()
      const categoryMap: IdMap = new Map()
      const accountMap: IdMap = new Map()
      const budgetMap: IdMap = new Map()
      const listMap: IdMap = new Map()

      // 1. Members
      for (const r of get('members')) {
        const created = await tx.familyMember.create({
          data: {
            familyId,
            name: r.name,
            role: r.role,
            color: r.color,
            avatar: r.avatar ?? undefined,
            monthlyBudget: r.monthlyBudget ?? undefined,
            createdAt: toDate(r.createdAt),
          },
        })
        if (r.id != null) memberMap.set(r.id, created.id)
      }
      inserted.members = memberMap.size

      // 2. Categories
      for (const r of get('categories')) {
        const created = await tx.category.create({
          data: {
            familyId,
            name: r.name,
            type: r.type,
            icon: r.icon,
            color: r.color,
            emoji: r.emoji ?? undefined,
            budget: r.budget ?? undefined,
            order: r.order ?? 0,
            archived: r.archived ?? false,
          },
        })
        if (r.id != null) categoryMap.set(r.id, created.id)
      }
      inserted.categories = categoryMap.size

      // 3. Accounts
      for (const r of get('accounts')) {
        const created = await tx.account.create({
          data: {
            familyId,
            name: r.name,
            type: r.type,
            balance: r.balance ?? 0,
            color: r.color,
            icon: r.icon,
            createdAt: toDate(r.createdAt),
          },
        })
        if (r.id != null) accountMap.set(r.id, created.id)
      }
      inserted.accounts = accountMap.size

      // 4. Budgets (need categories)
      for (const r of get('budgets')) {
        const categoryId = ref(categoryMap, r.categoryId)
        if (!categoryId) continue
        const created = await tx.budget.create({
          data: {
            familyId,
            categoryId,
            month: r.month,
            limit: r.limit ?? 0,
            name: r.name ?? undefined,
            rollover: r.rollover ?? false,
          },
        })
        if (r.id != null) budgetMap.set(r.id, created.id)
      }
      inserted.budgets = budgetMap.size

      // 5. Shopping lists
      for (const r of get('shoppingLists')) {
        const created = await tx.shoppingList.create({
          data: {
            familyId,
            name: r.name,
            emoji: r.emoji,
            createdAt: toDate(r.createdAt),
          },
        })
        if (r.id != null) listMap.set(r.id, created.id)
      }
      inserted.shoppingLists = listMap.size

      // 6. Goals
      let goals = 0
      for (const r of get('goals')) {
        await tx.savingsGoal.create({
          data: {
            familyId,
            name: r.name,
            emoji: r.emoji,
            targetAmount: r.targetAmount ?? 0,
            currentAmount: r.currentAmount ?? 0,
            deadline: r.deadline ?? undefined,
            color: r.color,
            createdAt: toDate(r.createdAt),
            completedAt: toDate(r.completedAt),
          },
        })
        goals++
      }
      inserted.goals = goals

      // 7. Bills (need categories)
      let bills = 0
      for (const r of get('bills')) {
        await tx.bill.create({
          data: {
            familyId,
            name: r.name,
            amount: r.amount ?? 0,
            categoryId: ref(categoryMap, r.categoryId),
            dueDate: r.dueDate,
            frequency: r.frequency,
            isEmi: r.isEmi ?? false,
            emiTotalMonths: r.emiTotalMonths ?? undefined,
            emiPaidMonths: r.emiPaidMonths ?? undefined,
            autoRepeat: r.autoRepeat ?? false,
            paid: r.paid ?? false,
            reminderDays: r.reminderDays ?? undefined,
            createdAt: toDate(r.createdAt),
          },
        })
        bills++
      }
      inserted.bills = bills

      // 8. Notes
      let notes = 0
      for (const r of get('notes')) {
        await tx.note.create({
          data: {
            familyId,
            title: r.title ?? '',
            content: r.content ?? '',
            pinned: r.pinned ?? false,
            color: r.color ?? undefined,
            createdAt: toDate(r.createdAt),
            updatedAt: toDate(r.updatedAt),
          },
        })
        notes++
      }
      inserted.notes = notes

      // 9. Templates (need categories, members, accounts, budgets)
      let templates = 0
      for (const r of get('templates')) {
        await tx.template.create({
          data: {
            familyId,
            label: r.label,
            emoji: r.emoji ?? undefined,
            type: r.type,
            amount: r.amount ?? undefined,
            categoryId: ref(categoryMap, r.categoryId),
            budgetId: ref(budgetMap, r.budgetId),
            memberId: ref(memberMap, r.memberId),
            accountId: ref(accountMap, r.accountId),
            paymentMethod: r.paymentMethod ?? undefined,
            description: r.description ?? undefined,
            tags: r.tags ?? [],
            createdAt: toDate(r.createdAt),
          },
        })
        templates++
      }
      inserted.templates = templates

      // 10. Shopping items (need lists)
      let items = 0
      for (const r of get('shoppingItems')) {
        const listId = ref(listMap, r.listId)
        if (!listId) continue
        await tx.shoppingItem.create({
          data: {
            familyId,
            listId,
            name: r.name,
            qty: r.qty ?? undefined,
            estimatedCost: r.estimatedCost ?? undefined,
            purchased: r.purchased ?? false,
            createdAt: toDate(r.createdAt),
          },
        })
        items++
      }
      inserted.shoppingItems = items

      // 11. Transactions (need categories, members, accounts, budgets)
      let txns = 0
      for (const r of get('transactions')) {
        await tx.transaction.create({
          data: {
            familyId,
            type: r.type,
            amount: r.amount ?? 0,
            categoryId: ref(categoryMap, r.categoryId),
            budgetId: ref(budgetMap, r.budgetId),
            memberId: ref(memberMap, r.memberId),
            accountId: ref(accountMap, r.accountId),
            toAccountId: ref(accountMap, r.toAccountId),
            description: r.description ?? undefined,
            merchant: r.merchant ?? undefined,
            paymentMethod: r.paymentMethod ?? undefined,
            location: r.location ?? undefined,
            tags: r.tags ?? [],
            notes: r.notes ?? undefined,
            receipt: r.receipt ?? undefined,
            date: r.date,
            time: r.time ?? undefined,
            createdAt: toDate(r.createdAt),
          },
        })
        txns++
      }
      inserted.transactions = txns
    },
    { timeout: 120_000 },
  )

  return { inserted }
}

/**
 * Export the caller's family as a frontend-compatible backup.
 * Remaps server UUIDs back to sequential numeric ids and dates to epoch ms
 * so the existing frontend `importJSON()` can consume it.
 */
export async function exportBackup(familyId: string) {
  const where = { familyId }
  const [
    members,
    categories,
    accounts,
    budgets,
    shoppingLists,
    goals,
    bills,
    notes,
    templates,
    shoppingItems,
    transactions,
  ] = await Promise.all([
    prisma.familyMember.findMany({ where }),
    prisma.category.findMany({ where }),
    prisma.account.findMany({ where }),
    prisma.budget.findMany({ where }),
    prisma.shoppingList.findMany({ where }),
    prisma.savingsGoal.findMany({ where }),
    prisma.bill.findMany({ where }),
    prisma.note.findMany({ where }),
    prisma.template.findMany({ where }),
    prisma.shoppingItem.findMany({ where }),
    prisma.transaction.findMany({ where }),
  ])

  // Assign sequential numeric ids, one counter per table.
  const memberId = numberMap(members)
  const categoryId = numberMap(categories)
  const accountId = numberMap(accounts)
  const budgetId = numberMap(budgets)
  const listId = numberMap(shoppingLists)

  const num = (map: Map<string, number>, id: string | null | undefined) =>
    id == null ? undefined : map.get(id)
  const epoch = (d: Date | null | undefined) => (d ? d.getTime() : undefined)
  const dec = (v: Prisma.Decimal | null | undefined) =>
    v == null ? undefined : Number(v)

  const data = {
    members: members.map((r, i) => ({
      id: i + 1,
      serverId: r.id,
      name: r.name,
      role: r.role,
      color: r.color,
      avatar: r.avatar ?? undefined,
      monthlyBudget: dec(r.monthlyBudget),
      createdAt: epoch(r.createdAt),
    })),
    categories: categories.map((r, i) => ({
      id: i + 1,
      serverId: r.id,
      name: r.name,
      type: r.type,
      icon: r.icon,
      color: r.color,
      emoji: r.emoji ?? undefined,
      budget: dec(r.budget),
      order: r.order,
      archived: r.archived,
    })),
    accounts: accounts.map((r, i) => ({
      id: i + 1,
      serverId: r.id,
      name: r.name,
      type: r.type,
      balance: dec(r.balance),
      color: r.color,
      icon: r.icon,
      createdAt: epoch(r.createdAt),
    })),
    budgets: budgets.map((r, i) => ({
      id: i + 1,
      serverId: r.id,
      categoryId: num(categoryId, r.categoryId),
      month: r.month,
      limit: dec(r.limit),
      name: r.name ?? undefined,
      rollover: r.rollover,
    })),
    goals: goals.map((r, i) => ({
      id: i + 1,
      serverId: r.id,
      name: r.name,
      emoji: r.emoji,
      targetAmount: dec(r.targetAmount),
      currentAmount: dec(r.currentAmount),
      deadline: r.deadline ?? undefined,
      color: r.color,
      createdAt: epoch(r.createdAt),
      completedAt: epoch(r.completedAt),
    })),
    bills: bills.map((r, i) => ({
      id: i + 1,
      serverId: r.id,
      name: r.name,
      amount: dec(r.amount),
      categoryId: num(categoryId, r.categoryId),
      dueDate: r.dueDate,
      frequency: r.frequency,
      isEmi: r.isEmi,
      emiTotalMonths: r.emiTotalMonths ?? undefined,
      emiPaidMonths: r.emiPaidMonths ?? undefined,
      autoRepeat: r.autoRepeat,
      paid: r.paid,
      reminderDays: r.reminderDays ?? undefined,
      createdAt: epoch(r.createdAt),
    })),
    shoppingLists: shoppingLists.map((r, i) => ({
      id: i + 1,
      serverId: r.id,
      name: r.name,
      emoji: r.emoji,
      createdAt: epoch(r.createdAt),
    })),
    shoppingItems: shoppingItems.map((r, i) => ({
      id: i + 1,
      serverId: r.id,
      listId: num(listId, r.listId),
      name: r.name,
      qty: r.qty ?? undefined,
      estimatedCost: dec(r.estimatedCost),
      purchased: r.purchased,
      createdAt: epoch(r.createdAt),
    })),
    notes: notes.map((r, i) => ({
      id: i + 1,
      serverId: r.id,
      title: r.title,
      content: r.content,
      pinned: r.pinned,
      color: r.color ?? undefined,
      createdAt: epoch(r.createdAt),
      updatedAt: epoch(r.updatedAt),
    })),
    templates: templates.map((r, i) => ({
      id: i + 1,
      serverId: r.id,
      label: r.label,
      emoji: r.emoji ?? undefined,
      type: r.type,
      amount: dec(r.amount),
      categoryId: num(categoryId, r.categoryId),
      budgetId: num(budgetId, r.budgetId),
      memberId: num(memberId, r.memberId),
      accountId: num(accountId, r.accountId),
      paymentMethod: r.paymentMethod ?? undefined,
      description: r.description ?? undefined,
      tags: r.tags,
      createdAt: epoch(r.createdAt),
    })),
    transactions: transactions.map((r, i) => ({
      id: i + 1,
      serverId: r.id,
      type: r.type,
      amount: dec(r.amount),
      categoryId: num(categoryId, r.categoryId),
      budgetId: num(budgetId, r.budgetId),
      memberId: num(memberId, r.memberId),
      accountId: num(accountId, r.accountId),
      toAccountId: num(accountId, r.toAccountId),
      description: r.description ?? undefined,
      merchant: r.merchant ?? undefined,
      paymentMethod: r.paymentMethod ?? undefined,
      location: r.location ?? undefined,
      tags: r.tags,
      notes: r.notes ?? undefined,
      receipt: r.receipt ?? undefined,
      date: r.date,
      time: r.time ?? undefined,
      createdAt: epoch(r.createdAt),
    })),
  }

  return { version: 1, exportedAt: Date.now(), data }
}

function numberMap(rows: { id: string }[]): Map<string, number> {
  const map = new Map<string, number>()
  rows.forEach((r, i) => map.set(r.id, i + 1))
  return map
}
