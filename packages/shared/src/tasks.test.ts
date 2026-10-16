import { describe, expect, it } from 'vitest'
import { MAX_PAGE_LIMIT } from './pagination'
import { CreateTaskInput, ListTasksQuery, TASK_TITLE_MAX } from './tasks'

describe('tasks contract', () => {
  it('TC-002 CreateTaskInput 去除首尾空格并拒绝空标题与超长标题', () => {
    expect(CreateTaskInput.parse({ title: '  写周报  ' })).toEqual({ title: '写周报' })
    expect(CreateTaskInput.safeParse({ title: '   ' }).success).toBe(false)
    expect(CreateTaskInput.safeParse({ title: 'x'.repeat(TASK_TITLE_MAX + 1) }).success).toBe(false)
  })

  it('ListTasksQuery 默认 limit=20，且不允许超过上限', () => {
    expect(ListTasksQuery.parse({})).toEqual({ limit: 20, offset: 0 })
    expect(ListTasksQuery.safeParse({ limit: String(MAX_PAGE_LIMIT + 1) }).success).toBe(false)
  })
})
