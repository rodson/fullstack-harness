import { createDb } from '@app/db'
import { serve } from '@hono/node-server'
import { createApp } from './app'
import { env } from './env'

const database = createDb(env.DATABASE_URL)
// 只有 PGlite（开发/测试）在启动时自动迁移；Postgres 迁移需人工执行 pnpm db:migrate
if (database.kind === 'pglite') await database.migrate()

const app = createApp({ db: database.db })

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.info(`api listening on http://localhost:${info.port} (db: ${database.kind})`)
})

const shutdown = () => {
  server.close()
  void database.close().then(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
