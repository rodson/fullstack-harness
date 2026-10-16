import { TASK_STATUSES } from '@app/shared'
import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/** 所有表都带的时间戳列；软删除用 deleted_at（见 .claude/rules/db.md） */
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}

export const taskStatus = pgEnum('task_status', TASK_STATUSES)

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    status: taskStatus('status').notNull().default('todo'),
    ...timestamps,
  },
  (t) => [index('tasks_created_at_idx').on(t.createdAt)],
)

export type TaskRow = typeof tasks.$inferSelect
export type NewTaskRow = typeof tasks.$inferInsert
