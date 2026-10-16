import {
  type CreateTaskInput,
  ErrorBody,
  type ErrorCode,
  type ListTasksQuery,
  Task,
  TaskPage,
  type UpdateTaskInput,
} from '@app/shared'
import type { z } from 'zod'

/** 所有接口错误都被转成 ApiError，组件按 code 渲染对应状态 */
export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly details: unknown

  constructor(status: number, body: ErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.details = body.details
  }
}

// 浏览器走同源 /api（next.config.ts 转发）；Server Component 里需要绝对地址
const baseUrl = () =>
  typeof window === 'undefined' ? (process.env.API_URL ?? 'http://localhost:8787') : ''

async function send(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${baseUrl()}/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  if (res.ok) return res
  // 非 JSON 的错误响应（如网关 502）降级为通用错误，仍然抛出
  const parsed = ErrorBody.safeParse(await res.json().catch(() => null))
  throw new ApiError(
    res.status,
    parsed.success ? parsed.data : { code: 'INTERNAL', message: `请求失败（${res.status}）` },
  )
}

async function parse<T extends z.ZodType>(schema: T, res: Response): Promise<z.infer<T>> {
  return schema.parse(await res.json())
}

const toSearch = (query: Partial<ListTasksQuery>) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value))
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

export const api = {
  listTasks: async (query: Partial<ListTasksQuery> = {}) =>
    parse(TaskPage, await send(`/tasks${toSearch(query)}`)),
  createTask: async (input: CreateTaskInput) =>
    parse(Task, await send('/tasks', { method: 'POST', body: JSON.stringify(input) })),
  updateTask: async (id: string, input: UpdateTaskInput) =>
    parse(Task, await send(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) })),
  deleteTask: async (id: string) => {
    await send(`/tasks/${id}`, { method: 'DELETE' })
  },
}
