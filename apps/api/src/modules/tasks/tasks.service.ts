import type { TaskRow } from '@app/db'
import type { CreateTaskInput, ListTasksQuery, Task, TaskPage, UpdateTaskInput } from '@app/shared'
import { AppError } from '../../lib/errors'
import type { TaskRepository } from './tasks.repository'

const toTask = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

const notFound = () => new AppError('NOT_FOUND', '任务不存在')

export function createTaskService(repo: TaskRepository) {
  return {
    async list(query: ListTasksQuery): Promise<TaskPage> {
      const rows = await repo.list(query)
      const hasMore = rows.length > query.limit
      return {
        items: rows.slice(0, query.limit).map(toTask),
        nextOffset: hasMore ? query.offset + query.limit : null,
      }
    },

    async get(id: string): Promise<Task> {
      const row = await repo.findById(id)
      if (!row) throw notFound()
      return toTask(row)
    },

    async create(input: CreateTaskInput): Promise<Task> {
      return toTask(await repo.insert(input))
    },

    async update(id: string, input: UpdateTaskInput): Promise<Task> {
      const row = await repo.update(id, input)
      if (!row) throw notFound()
      return toTask(row)
    },

    async remove(id: string): Promise<void> {
      if (!(await repo.softDelete(id))) throw notFound()
    },
  }
}

export type TaskService = ReturnType<typeof createTaskService>
