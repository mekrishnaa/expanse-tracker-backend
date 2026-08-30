import { prisma } from '../../lib/prisma'
import { sendPush, type PushPayload } from '../../lib/webpush'
import { logger } from '../../lib/logger'

const todayISO = () => new Date().toISOString().slice(0, 10)
const monthKey = () => new Date().toISOString().slice(0, 7)

interface PendingNotification {
  key: string
  payload: PushPayload
}

/**
 * Computes due bills / exceeded budgets for every family and pushes reminders
 * to subscribed devices. Deduplicates per family+key so repeated runs on the
 * same day don't spam.
 */
export async function runReminders(reminderDays = 3) {
  const today = todayISO()
  const soon = new Date()
  soon.setDate(soon.getDate() + reminderDays)
  const soonISO = soon.toISOString().slice(0, 10)
  const month = monthKey()

  const families = await prisma.family.findMany({ select: { id: true } })
  let sent = 0

  for (const fam of families) {
    const subs = await prisma.pushSubscription.findMany({
      where: { familyId: fam.id },
    })
    if (!subs.length) continue

    const pending: PendingNotification[] = []

    const bills = await prisma.bill.findMany({
      where: { familyId: fam.id, paid: false },
    })
    for (const b of bills) {
      if (b.dueDate < today) {
        pending.push({
          key: `bill-${b.id}-overdue-${today}`,
          payload: {
            title: 'Bill overdue',
            body: `${b.name} was due on ${b.dueDate}.`,
            tag: `bill-${b.id}`,
            url: '/bills',
          },
        })
      } else if (b.dueDate <= soonISO) {
        pending.push({
          key: `bill-${b.id}-soon-${today}`,
          payload: {
            title: 'Bill due soon',
            body: `${b.name} is due on ${b.dueDate}.`,
            tag: `bill-${b.id}`,
            url: '/bills',
          },
        })
      }
    }

    const budgets = await prisma.budget.findMany({
      where: { familyId: fam.id, month },
    })
    if (budgets.length) {
      const txns = await prisma.transaction.findMany({
        where: { familyId: fam.id, type: 'expense', date: { startsWith: month } },
      })
      const cats = await prisma.category.findMany({
        where: { familyId: fam.id },
      })
      const catName = new Map(cats.map((c) => [c.id, c.name]))
      const spentByCat = new Map<string, number>()
      for (const t of txns) {
        if (!t.categoryId) continue
        spentByCat.set(
          t.categoryId,
          (spentByCat.get(t.categoryId) ?? 0) + Number(t.amount),
        )
      }
      for (const b of budgets) {
        const sameCat = budgets.filter((x) => x.categoryId === b.categoryId)
        const spent =
          sameCat.length <= 1
            ? spentByCat.get(b.categoryId) ?? 0
            : txns
                .filter((t) => t.budgetId === b.id)
                .reduce((a, t) => a + Number(t.amount), 0)
        if (spent > Number(b.limit)) {
          const label = b.name || catName.get(b.categoryId) || 'Budget'
          pending.push({
            key: `budget-${b.id}-${today}`,
            payload: {
              title: 'Budget exceeded',
              body: `${label} is over by ${(spent - Number(b.limit)).toFixed(0)}.`,
              tag: `budget-${b.id}`,
              url: '/budget',
            },
          })
        }
      }
    }

    for (const n of pending) {
      try {
        // Unique [familyId, dedupKey] guarantees each reminder is sent once.
        await prisma.sentNotification.create({
          data: { familyId: fam.id, dedupKey: n.key },
        })
      } catch {
        continue
      }
      for (const s of subs) {
        const ok = await sendPush(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          n.payload,
        )
        if (!ok) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(
            () => undefined,
          )
        } else {
          sent++
        }
      }
    }
  }

  logger.info({ families: families.length, sent }, 'Reminder run complete')
  return { families: families.length, sent }
}
