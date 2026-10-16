import type { ErrorBody, ErrorCode } from '@app/shared'
import type { ErrorHandler, NotFoundHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

const STATUS: Record<ErrorCode, ContentfulStatusCode> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
}

/** 业务错误：service / repository 抛出，由 onError 统一转成 ErrorBody */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly details: unknown

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = details
  }

  get status(): ContentfulStatusCode {
    return STATUS[this.code]
  }
}

function codeFromStatus(status: number): ErrorCode {
  const found = (Object.keys(STATUS) as ErrorCode[]).find((code) => STATUS[code] === status)
  return found ?? (status < 500 ? 'VALIDATION_ERROR' : 'INTERNAL')
}

export const onError: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    const body: ErrorBody = { code: err.code, message: err.message }
    if (err.details !== undefined) body.details = err.details
    return c.json(body, err.status)
  }
  if (err instanceof HTTPException) {
    const body: ErrorBody = { code: codeFromStatus(err.status), message: err.message }
    return c.json(body, err.status)
  }
  console.error(err)
  const body: ErrorBody = { code: 'INTERNAL', message: '服务器内部错误' }
  return c.json(body, 500)
}

export const notFound: NotFoundHandler = (c) => {
  const body: ErrorBody = {
    code: 'NOT_FOUND',
    message: `路由不存在：${c.req.method} ${c.req.path}`,
  }
  return c.json(body, 404)
}
