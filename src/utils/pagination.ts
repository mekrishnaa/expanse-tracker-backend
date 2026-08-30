import type { Request } from 'express'

export interface PaginationParams {
  page: number
  pageSize: number
  skip: number
  take: number
}

export function getPagination(req: Request): PaginationParams {
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 50))
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export function buildMeta(
  page: number,
  pageSize: number,
  total: number,
): { page: number; pageSize: number; total: number } {
  return { page, pageSize, total }
}
