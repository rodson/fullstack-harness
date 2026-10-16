# ADR-0001：技术栈与数据库运行方式

- 状态：已采纳
- 日期：2026-10-16

## 背景

脚手架需要同时满足两件事：主流、对 AI 编码工具友好的全栈技术栈；以及一个**无需外部基础设施就能跑通的验证闭环**——`pnpm verify` 是流程闸门的证据来源，它必须在任何机器、任何 worktree、CI 里都能一条命令跑完。

## 决策

| 层   | 选型                                                                         |
| ---- | ---------------------------------------------------------------------------- |
| 仓库 | pnpm 11（catalog 统一版本）+ Turborepo                                       |
| 运行 | Node 22 LTS                                                                  |
| Web  | Next.js 16（App Router、Turbopack）+ React 19 + Tailwind v4 + TanStack Query |
| UI   | packages/ui：shadcn/ui 风格源码（cva + tailwind-merge）                      |
| API  | Hono + @hono/zod-validator，tsdown 打包                                      |
| 契约 | packages/shared：zod v4 schema 是唯一来源                                    |
| 数据 | Drizzle ORM + drizzle-kit；生产 Postgres，开发/测试 PGlite                   |
| 测试 | Vitest（单测/集成）+ Testing Library + Playwright（e2e + 视觉基线）          |
| 质量 | TypeScript 6（strict）+ ESLint 9 flat config + Prettier                      |

关键点：

1. **PGlite（WASM Postgres）用于开发与测试**。`createDb(url)` 按 `DATABASE_URL` 前缀选择驱动：`postgres://` → postgres.js，`pglite://` → PGlite。测试每个文件一个内存库，迁移与生产走同一套 drizzle 迁移文件。
2. **工作区包直接导出 TS 源码**（不预编译）：Next 用 `transpilePackages`，api 用 tsdown 把 `@app/*` 打进 bundle，Vitest/tsx 原生处理。
3. **版本选择受工具链兼容性约束**：TypeScript 停在 6.0（typescript-eslint 尚不支持 7.x），ESLint 停在 9（eslint-config-next 依赖的插件尚不支持 10）。
4. **遵守 pnpm 11 默认的 minimumReleaseAge（1 天）**，不添加排除项；需要安装脚本的依赖在 `allowBuilds` 中显式放行。

## 备选方案

- 测试用 Docker Postgres / testcontainers：最接近生产，但让 `pnpm verify` 依赖 Docker，worktree 并行和 CI 都更重。保留 `docker-compose.yml` 供需要时使用。
- 共享包预编译（tsc → dist）：运行时更"标准"，但每次改 shared 都要 rebuild，开发与 agent 循环变慢。
- Hono RPC 客户端：类型贯通更强，但让 web 依赖 api 包；我们选择以 zod 契约为边界，同一契约也服务 Android 客户端。

## 后果

- PGlite 与 Postgres 存在少量扩展/性能差异；涉及 Postgres 专有特性的需求需在计划中说明，并在 Postgres 上手动验证。
- Postgres 不会在 api 启动时自动迁移，`pnpm db:migrate` 必须由人执行（迁移需人工审阅）。
- 升级 TypeScript 7 / ESLint 10 前需确认 typescript-eslint 与 eslint-config-next 的支持情况。
