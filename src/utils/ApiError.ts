export class ApiError extends Error {
  statusCode: number
  code: string
  details?: unknown

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'BAD_REQUEST', message, details)
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, 'UNAUTHORIZED', message)
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, 'FORBIDDEN', message)
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message)
  }

  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message)
  }
}
