# Fullstack Harness

<!-- 项目说明的唯一来源，所有 AI 编码工具共用。Claude Code 通过 CLAUDE.md 的 `@AGENTS.md` 导入本文件；
     只对 Claude Code 生效的内容（hooks、slash 命令、子代理）写在 CLAUDE.md，不要写进这里。 -->

pnpm + Turborepo monorepo：apps/web（Next.js 16 App Router + Tailwind v4 + TanStack Query）、apps/api（Hono + zod）、
packages/shared（zod 契约）、packages/db（Drizzle + Postgres / PGlite）、packages/ui（shadcn 风格组件）。

## 命令

- 开发：`pnpm dev`（web :3000，`/api/*` 转发到 api :8787；数据库默认 PGlite，零依赖）
- 校验闭环：`pnpm verify`（typecheck → lint → test → build）；有当前 feature 时用 `pnpm spec verify`（同时把结果记录为证据）
- 单包：`pnpm --filter @app/api test` ｜ e2e：`pnpm test:e2e`（更新视觉基线：`pnpm test:e2e --update-snapshots`）
- 迁移：改 schema 后 `pnpm db:generate`；`pnpm db:migrate` 只用于 Postgres，需人确认
- 流程：`pnpm spec status`（当前阶段、允许改的文件、下一步）｜ `pnpm spec help`

## 需求交付流程（强约束）

每个需求一个目录 `specs/<date>-<slug>/`，顺序固定：
01 需求 →【人批准】→ 02 计划 / 03 用例 / 04 验收 →【人批准】→ 实现 → 独立验收 →【人批准】→ 08 复盘

- 动手前先运行 `pnpm spec status`：每个 stage 只能改该阶段的文件，stage 不是 implementing 时不改业务代码
- `05-state.json` 与 `specs/.current` 只能经 `pnpm spec <command>` 修改，不要直接编辑
- `approve` / `use` / `pause` 是人工闸门，只能由人执行；完成阶段后提醒用户在自己的终端运行
- 阶段产物都写进 `specs/` 下的文件，下一阶段只依据这些文件，不依赖对话记忆
- 没有当前 feature 时是维护模式（改脚手架本身），不受 stage 限制
- `specs/archive/` 与 `specs/_template/` 只读，不作为新需求的实现依据

## 架构事实

- 前后端唯一契约是 `packages/shared` 的 zod schema；web 与 api 都从这里导入，禁止各写一份类型
- api 分层：routes（校验 + 编排）→ service（业务，抛 AppError）→ repository（Drizzle）；routes 不直接访问 DB
- 统一错误结构 `{ code, message, details? }`；写接口一律 zod 校验；列表接口必须分页且 limit ≤ 100
- web 默认 Server Component，交互才用 Client Component；取数统一走 `apps/web/src/lib/api.ts` + `lib/queries.ts`
- 数据库：开发/测试用 PGlite（`pglite://…`，api 启动自动迁移）；生产用 Postgres（`postgres://…`）

## 硬约束

- TypeScript strict + noUncheckedIndexedAccess；禁止 any；生产代码禁止 console.log（lint 拦截）
- packages/shared 与 packages/db：新增可以，修改/删除已有字段需在计划中写明影响面并跑全量 verify
- 迁移只能由 drizzle-kit 生成，且向后兼容（不删列、不改名）
- 改动严格限定在计划范围内；不顺手实现未要求的功能；不用 try/catch、`.skip`、any 掩盖失败
- 新增依赖需用户确认，版本统一写在 `pnpm-workspace.yaml` 的 catalog
- 完成时贴出 `pnpm verify` / `pnpm spec verify` 的原始结果作为证据；UI 改动附截图

## 索引

- 分层约定：`.claude/rules/{api,web,db,shared,specs}.md`（普通 markdown，改对应目录前先读）
- 实现顺序与常见错误：`.claude/skills/fullstack-tdd/SKILL.md`
- 架构决策：`docs/adr/`（改动涉及已记录的决策前先读）｜ 流程改进提案：`.claude/proposals/`
- 走完全流程的示例 feature：`specs/archive/2026-10-16-tasks/`
