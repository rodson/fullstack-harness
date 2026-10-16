import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { ZodType } from 'zod'
import { AppError } from './errors'

/** zod 校验中间件：失败时抛 VALIDATION_ERROR，details 为逐字段问题列表 */
export const validate = <Target extends keyof ValidationTargets, T extends ZodType>(
  target: Target,
  schema: T,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      }))
      throw new AppError('VALIDATION_ERROR', '请求参数校验失败', details)
    }
  })
