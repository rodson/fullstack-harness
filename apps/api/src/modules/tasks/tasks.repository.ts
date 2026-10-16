import { type Database, type NewTaskRow, type TaskRow, tasks } from '@app/db'
import type { TaskStatus } from '@app/shared'
import { and, desc, eq, isNull } from 'drizzle-orm'

export interface ListTasksParams {
  limit: number
  offset: number
  status?: TaskStatus | undefined
}

export function createTaskRepository(db: Database) {
  const alive = isNull(tasks.deletedAt)

  return {
    /** 多取一条用于判断是否还有下一页 */
    async list({ limit, offset, status }: ListTasksParams): Promise<TaskRow[]> {
      return db
        .select()
        .from(tasks)
        .where(and(alive, status ? eq(tasks.status, status) : undefined))
        .orderBy(desc(tasks.createdAt), desc(tasks.id))
        .limit(limit + 1)
        .offset(offset)
    },

    async findById(id: string): Promise<TaskRow | null> {
      const [row] = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), alive))
        .limit(1)
      return row ?? null
    },

    async insert(values: Pick<NewTaskRow, 'title'>): Promise<TaskRow> {
      const [row] = await db.insert(tasks).values(values).returning()
      if (!row) throw new Error('insert tasks 未返回数据')
      return row
    },

    async update(
      id: string,
      patch: Partial<Pick<NewTaskRow, 'title' | 'status'>>,
    ): Promise<TaskRow | null> {
      const [row] = await db
        .update(tasks)
        .set(patch)
        .where(and(eq(tasks.id, id), alive))
        .returning()
      return row ?? null
    },

    async softDelete(id: string): Promise<boolean> {
      const rows = await db
        .update(tasks)
        .set({ deletedAt: new Date() })
        .where(and(eq(tasks.id, id), alive))
        .returning({ id: tasks.id })
      return rows.length > 0
    },
  }
}

export type TaskRepository = ReturnType<typeof createTaskRepository>
