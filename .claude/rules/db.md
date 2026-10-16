---
paths:
  - 'packages/db/**'
---

# packages/db（Drizzle + Postgres / PGlite）

- 改 schema 后必须 `pnpm db:generate` 生成迁移；禁止手写或修改已生成的迁移 SQL；禁止 `drizzle-kit push`
- 迁移向后兼容：不删列、不改名、不加无默认值的 NOT NULL 列（加新列 → 双写 → 清理，分多次发布）
- 所有表带 `created_at` / `updated_at` / `deleted_at`（复用 `schema.ts` 的 `timestamps`）；删除一律软删除
- 枚举值来自 `packages/shared`（如 `TASK_STATUSES`），不要在 db 里另写一份
- 开发/测试用 PGlite（`DATABASE_URL=pglite://…`，api 启动时自动迁移）；Postgres 的 `pnpm db:migrate` 必须由人确认执行
