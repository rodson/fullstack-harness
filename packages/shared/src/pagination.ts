import { z } from 'zod'

/** 所有分页接口的 limit 上限（CLAUDE.md 硬约束）。 */
export const MAX_PAGE_LIMIT = 100

export const PageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})
export type PageQuery = z.infer<typeof PageQuery>

export const pageOf = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    /** 下一页的 offset；没有更多数据时为 null */
    nextOffset: z.number().int().nullable(),
  })
