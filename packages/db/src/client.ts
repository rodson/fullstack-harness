import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from './schema'

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>

export interface DbHandle {
  kind: 'pglite' | 'postgres'
  db: Database
  /** 应用 drizzle/ 下的迁移文件 */
  migrate(): Promise<void>
  close(): Promise<void>
}

// 通过包名解析，保证 apps/api 打包后仍能找到迁移目录
const require = createRequire(import.meta.url)
const migrationsFolder = path.join(path.dirname(require.resolve('@app/db/package.json')), 'drizzle')

/**
 * DATABASE_URL 取值：
 * - postgres://… / postgresql://…  真实 Postgres
 * - pglite://memory               进程内内存库（测试默认）
 * - pglite://<目录>               进程内持久化库（本地开发）
 */
export function createDb(url = 'pglite://memory'): DbHandle {
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    const client = postgres(url, { max: 10 })
    const db = drizzlePostgres(client, { schema })
    return {
      kind: 'postgres',
      db,
      migrate: () => migratePostgres(db, { migrationsFolder }),
      close: () => client.end(),
    }
  }

  if (url.startsWith('pglite://')) {
    const target = url.slice('pglite://'.length)
    if (target !== 'memory') mkdirSync(target, { recursive: true })
    const client = new PGlite(target === 'memory' ? undefined : target)
    const db = drizzlePglite(client, { schema })
    return {
      kind: 'pglite',
      db,
      migrate: () => migratePglite(db, { migrationsFolder }),
      close: () => client.close(),
    }
  }

  throw new Error(`不支持的 DATABASE_URL：${url}（应为 postgres:// 或 pglite://）`)
}

/** 测试用：内存库 + 已应用迁移 */
export async function createTestDb(): Promise<DbHandle> {
  const handle = createDb('pglite://memory')
  await handle.migrate()
  return handle
}
