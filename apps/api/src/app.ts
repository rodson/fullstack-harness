import type { Database } from '@app/db'
import { Hono } from 'hono'
import { notFound, onError } from './lib/errors'
import { createTaskRepository } from './modules/tasks/tasks.repository'
import { taskRoutes } from './modules/tasks/tasks.routes'
import { createTaskService } from './modules/tasks/tasks.service'

export interface AppDeps {
  db: Database
}

/** 组装应用（依赖注入，测试直接传入 PGlite 内存库） */
export function createApp({ db }: AppDeps) {
  const tasks = createTaskService(createTaskRepository(db))

  const app = new Hono().basePath('/api')
  app.get('/health', (c) => c.json({ ok: true }))
  app.route('/tasks', taskRoutes(tasks))
  app.onError(onError)
  app.notFound(notFound)
  return app
}
