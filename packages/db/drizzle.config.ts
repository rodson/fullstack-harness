import { defineConfig } from 'drizzle-kit'

// generate 不需要连接数据库；migrate 需要 DATABASE_URL=postgres://...
// 开发用的 PGlite 由 apps/api 启动时自动迁移，无需手动 migrate。
const url = process.env.DATABASE_URL ?? ''

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
