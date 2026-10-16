import { createTestDb, type DbHandle, tasks } from '@app/db'
import { ErrorBody, Task, TaskPage } from '@app/shared'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'

let handle: DbHandle
let app: ReturnType<typeof createApp>

beforeAll(async () => {
  handle = await createTestDb()
  app = createApp({ db: handle.db })
})
afterAll(async () => {
  await handle.close()
})
beforeEach(async () => {
  await handle.db.delete(tasks)
})

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

async function createTask(title: string) {
  const res = await app.request('/api/tasks', json('POST', { title }))
  return Task.parse(await res.json())
}

describe('tasks api', () => {
  it('TC-001 POST /api/tasks 创建任务：201、去除首尾空格、默认 todo', async () => {
    const res = await app.request('/api/tasks', json('POST', { title: '  写周报 ' }))
    expect(res.status).toBe(201)
    const task = Task.parse(await res.json())
    expect(task).toMatchObject({ title: '写周报', status: 'todo' })
  })

  it('TC-003 POST /api/tasks 空标题返回 400 + 统一错误结构', async () => {
    const res = await app.request('/api/tasks', json('POST', { title: '   ' }))
    expect(res.status).toBe(400)
    const body = ErrorBody.parse(await res.json())
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(body.details).toEqual([{ path: 'title', message: '标题不能为空' }])
  })

  it('TC-004 GET /api/tasks 分页：nextOffset 正确，limit 超过 100 返回 400', async () => {
    for (const title of ['a', 'b', 'c']) await createTask(title)

    const first = TaskPage.parse(await (await app.request('/api/tasks?limit=2')).json())
    expect(first.items.map((t) => t.title)).toEqual(['c', 'b'])
    expect(first.nextOffset).toBe(2)

    const second = TaskPage.parse(await (await app.request('/api/tasks?limit=2&offset=2')).json())
    expect(second.items.map((t) => t.title)).toEqual(['a'])
    expect(second.nextOffset).toBeNull()

    const tooMany = await app.request('/api/tasks?limit=101')
    expect(tooMany.status).toBe(400)
  })

  it('TC-005 PATCH /api/tasks/:id 更新状态；不存在的任务返回 404', async () => {
    const task = await createTask('a')
    const res = await app.request(`/api/tasks/${task.id}`, json('PATCH', { status: 'doing' }))
    expect(res.status).toBe(200)
    expect(Task.parse(await res.json()).status).toBe('doing')

    const missing = await app.request(
      '/api/tasks/00000000-0000-4000-8000-000000000000',
      json('PATCH', { status: 'done' }),
    )
    expect(missing.status).toBe(404)
    expect(ErrorBody.parse(await missing.json()).code).toBe('NOT_FOUND')
  })

  it('TC-006 DELETE /api/tasks/:id 软删除：204，之后详情 404 且列表不可见', async () => {
    const task = await createTask('a')
    expect((await app.request(`/api/tasks/${task.id}`, { method: 'DELETE' })).status).toBe(204)
    expect((await app.request(`/api/tasks/${task.id}`)).status).toBe(404)

    const page = TaskPage.parse(await (await app.request('/api/tasks')).json())
    expect(page.items).toHaveLength(0)
  })

  it('GET /api/health', async () => {
    const res = await app.request('/api/health')
    expect(await res.json()).toEqual({ ok: true })
  })
})
