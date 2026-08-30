import { PrismaClient, type Prisma } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

const DEMO_EMAIL = 'demo@family-tracker.local'

const expenseCategories = [
  { name: 'Groceries', icon: 'ShoppingCart', color: '#22c55e', emoji: '🛒' },
  { name: 'Rent', icon: 'Home', color: '#6366f1', emoji: '🏠' },
  { name: 'Utilities', icon: 'Lightbulb', color: '#f59e0b', emoji: '💡' },
  { name: 'Internet', icon: 'Wifi', color: '#0ea5e9', emoji: '📶' },
  { name: 'Fuel', icon: 'Fuel', color: '#ef4444', emoji: '⛽' },
  { name: 'Dining', icon: 'Utensils', color: '#f97316', emoji: '🍽️' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', emoji: '🛍️' },
  { name: 'Healthcare', icon: 'HeartPulse', color: '#14b8a6', emoji: '🩺' },
  { name: 'Education', icon: 'GraduationCap', color: '#8b5cf6', emoji: '🎓' },
  { name: 'Entertainment', icon: 'Clapperboard', color: '#a855f7', emoji: '🎬' },
  { name: 'Travel', icon: 'Plane', color: '#06b6d4', emoji: '✈️' },
  { name: 'Transport', icon: 'Bus', color: '#3b82f6', emoji: '🚌' },
  { name: 'Pets', icon: 'PawPrint', color: '#84cc16', emoji: '🐾' },
  { name: 'Miscellaneous', icon: 'Boxes', color: '#64748b', emoji: '📦' },
]

const incomeCategories = [
  { name: 'Salary', icon: 'Wallet', color: '#22c55e', emoji: '💼' },
  { name: 'Freelance', icon: 'Laptop', color: '#6366f1', emoji: '💻' },
  { name: 'Business', icon: 'Store', color: '#f59e0b', emoji: '🏪' },
  { name: 'Investment', icon: 'TrendingUp', color: '#14b8a6', emoji: '📈' },
  { name: 'Interest', icon: 'Percent', color: '#0ea5e9', emoji: '🏦' },
  { name: 'Rental', icon: 'Building', color: '#8b5cf6', emoji: '🏢' },
  { name: 'Gift', icon: 'Gift', color: '#ec4899', emoji: '🎁' },
  { name: 'Cashback', icon: 'BadgePercent', color: '#f97316', emoji: '💸' },
  { name: 'Other', icon: 'CircleDollarSign', color: '#64748b', emoji: '💰' },
]

const accounts = [
  { name: 'Cash', type: 'cash', color: '#22c55e', icon: 'Banknote' },
  { name: 'Bank', type: 'bank', color: '#6366f1', icon: 'Landmark' },
  { name: 'UPI', type: 'upi', color: '#f59e0b', icon: 'Smartphone' },
] as const

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })
  if (existing) {
    // eslint-disable-next-line no-console
    console.log('Seed skipped: demo family already exists.')
    return
  }

  const family = await prisma.family.create({
    data: { name: 'Demo Family', currency: 'INR' },
  })

  await prisma.user.create({
    data: {
      familyId: family.id,
      email: DEMO_EMAIL,
      name: 'Demo Admin',
      passwordHash: await argon2.hash('password123', { type: argon2.argon2id }),
      role: 'admin',
    },
  })

  let order = 0
  const categoryData: Prisma.CategoryCreateManyInput[] = [
    ...expenseCategories.map((c) => ({
      ...c,
      familyId: family.id,
      type: 'expense' as const,
      order: order++,
    })),
    ...incomeCategories.map((c) => ({
      ...c,
      familyId: family.id,
      type: 'income' as const,
      order: order++,
    })),
  ]
  await prisma.category.createMany({ data: categoryData })

  await prisma.account.createMany({
    data: accounts.map((a) => ({ ...a, familyId: family.id, balance: 0 })),
  })

  await prisma.familyMember.create({
    data: {
      familyId: family.id,
      name: 'Me',
      role: 'admin',
      color: '#10b981',
      avatar: '🙂',
    },
  })

  // eslint-disable-next-line no-console
  console.log(
    `Seed complete. Login with ${DEMO_EMAIL} / password123 (change in production).`,
  )
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
