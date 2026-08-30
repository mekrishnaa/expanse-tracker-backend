import type { NextFunction, Request, Response } from 'express'
import { ZodError, type ZodTypeAny } from 'zod'

export function validate(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      })
      if (parsed.body !== undefined) req.body = parsed.body
      if (parsed.params !== undefined) req.params = parsed.params
      // req.query is a getter-only in some setups; assign defensively
      if (parsed.query !== undefined) {
        Object.defineProperty(req, 'query', {
          value: parsed.query,
          writable: true,
          configurable: true,
        })
      }
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        next(err)
        return
      }
      next(err)
    }
  }
}
