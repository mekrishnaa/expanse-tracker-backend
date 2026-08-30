import { z } from 'zod'

export const txnType = z.enum(['expense', 'income', 'transfer'])
export const memberRole = z.enum(['admin', 'parent', 'child', 'guest'])
export const accountType = z.enum([
  'cash',
  'bank',
  'credit',
  'upi',
  'wallet',
  'investment',
])
export const billFrequency = z.enum([
  'monthly',
  'weekly',
  'yearly',
  'quarterly',
  'once',
])

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected yyyy-mm-dd')
export const monthKey = z.string().regex(/^\d{4}-\d{2}$/, 'Expected yyyy-mm')
export const hhmm = z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:mm')
export const uuid = z.string().uuid()
