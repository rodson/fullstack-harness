import { z } from 'zod'

/** 统一错误码。HTTP 状态码映射在 apps/api/src/lib/errors.ts。 */
export const ErrorCode = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL',
])
export type ErrorCode = z.infer<typeof ErrorCode>

/** 所有非 2xx 响应的统一结构：{ code, message, details? } */
export const ErrorBody = z.object({
  code: ErrorCode,
  message: z.string(),
  details: z.unknown().optional(),
})
export type ErrorBody = z.infer<typeof ErrorBody>
