import { z } from 'zod'
import { PageQuery, pageOf } from './pagination'

export const TASK_STATUSES = ['todo', 'doing', 'done'] as const
export const TaskStatus = z.enum(TASK_STATUSES)
export type TaskStatus = z.infer<typeof TaskStatus>

export const TASK_TITLE_MAX = 200

export const Task = z.object({
  id: z.uuid(),
  title: z.string(),
  status: TaskStatus,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type Task = z.infer<typeof Task>

const TaskTitle = z
  .string()
  .trim()
  .min(1, '标题不能为空')
  .max(TASK_TITLE_MAX, `标题不能超过 ${TASK_TITLE_MAX} 字`)

export const CreateTaskInput = z.object({ title: TaskTitle })
export type CreateTaskInput = z.infer<typeof CreateTaskInput>

export const UpdateTaskInput = z
  .object({ title: TaskTitle, status: TaskStatus })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: '至少提供一个要更新的字段' })
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>

export const TaskIdParam = z.object({ id: z.uuid() })

export const ListTasksQuery = PageQuery.extend({ status: TaskStatus.optional() })
export type ListTasksQuery = z.infer<typeof ListTasksQuery>

export const TaskPage = pageOf(Task)
export type TaskPage = z.infer<typeof TaskPage>
