# Fullstack Harness

Web 全栈项目脚手架 + Claude Code 交付流水线。设计来源：[rodson/web-harness-learning](https://github.com/rodson/web-harness-learning)。

需求 → 规格化 → 计划 / 用例 / 验收标准 →【人工签字】→ 自动实现 → 独立验收 →【人工签字】→ 复盘 → 反哺流程。核心原则：

1. **每个阶段的产物都是文件**（`specs/<date>-<slug>/`），不靠对话记忆；会话可以随时清空、中断、续跑。
2. **闸门靠 hook 硬约束，不靠提示词**：未经人工批准，Claude 改代码会被直接拦截。
3. **实现者与验收者是两个独立上下文、不同模型**，避免自己给自己打分。

## 快速开始

```bash
nvm use                 # Node 22（.nvmrc）
corepack enable         # 使用 package.json 指定的 pnpm 11
pnpm install
pnpm dev                # web http://localhost:3000 ，api http://localhost:8787
pnpm verify             # typecheck → lint → test → build
pnpm --filter @app/web exec playwright install chromium && pnpm test:e2e
```

数据库默认是 **PGlite**（进程内 Postgres，零依赖，api 启动时自动迁移）。要用真实 Postgres：`docker compose up -d`，在 `apps/api/.env` 设置 `DATABASE_URL=postgres://app:app@localhost:5432/app`，然后 `pnpm db:migrate`。

## 技术栈

| 层   | 选型                                                                         |
| ---- | ---------------------------------------------------------------------------- |
| 仓库 | pnpm 11（catalog 统一版本）+ Turborepo                                       |
| Web  | Next.js 16（App Router、Turbopack）+ React 19 + Tailwind v4 + TanStack Query |
| UI   | `packages/ui`：shadcn/ui 风格源码                                            |
| API  | Hono + zod v4（tsdown 打包）                                                 |
| 契约 | `packages/shared`：zod schema 唯一来源（同时服务 Android 客户端）            |
| 数据 | Drizzle ORM + drizzle-kit；Postgres（生产）/ PGlite（开发、测试）            |
| 测试 | Vitest + Testing Library + Playwright（e2e + 视觉基线）                      |
| 质量 | TypeScript 6 strict + ESLint 9 + Prettier                                    |

选型理由与版本约束见 [docs/adr/0001-tech-stack.md](docs/adr/0001-tech-stack.md)。

## 目录

```
├── CLAUDE.md / AGENTS.md(软链)   # 给 Claude 的项目说明（< 80 行）
├── .claude/
│   ├── settings.json             # 权限 + hooks（团队共享）
│   ├── hooks/                    # guard-bash（高危命令）、format（prettier）
│   ├── rules/                    # 按路径自动加载：api / web / db / shared / specs
│   ├── agents/                   # requirement-analyst / test-designer / implementer / verifier / retro-analyst
│   ├── commands/                 # /spec /plan-feature /approve /impl /verify /retro /ship
│   ├── skills/fullstack-tdd/     # 实现顺序、验证命令、Gotchas
│   └── proposals/                # /retro 产出的流程改进提案（人审后合入）
├── scripts/spec.mjs              # 流水线状态机 + hook 闸门（+ 测试）
├── specs/
│   ├── _template/                # 00-input/ + 01~08 + 05-state.json
│   └── archive/2026-10-16-tasks/ # 走完全流程的示例 feature
├── docs/adr/
├── apps/web  apps/api
└── packages/shared  packages/db  packages/ui
```

## 一次完整的需求交付

| #   | 谁               | 做什么                                                                                                |
| --- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| 0   | 你               | `git worktree add ../app-kanban -b feature/kanban && cd ../app-kanban && pnpm install`                |
| 1   | 你               | `pnpm spec init kanban`，把 PRD 写进 `specs/<dir>/00-input/prd.md`，设计稿截图放进 `00-input/design/` |
| 2   | Claude           | `/spec` → 产出 `01-requirement.md`（含开放问题 + 默认选择）→ `pnpm spec submit requirement`           |
| 3   | **你**           | 审阅 01，在「结论」列答复开放问题 → `pnpm spec approve requirement_review`                            |
| 4   | Claude（新会话） | `/plan-feature` → 02 计划 / 03 用例 / 04 验收 → `pnpm spec submit plan`（双向追溯检查）               |
| 5   | **你**           | 审阅 02/03/04（可删掉不做的 TC）→ `pnpm spec approve plan_review`                                     |
| 6   | Claude（新会话） | `/impl` → implementer 子代理 TDD 实现 → `pnpm spec verify` → `pnpm spec submit impl`                  |
| 7   | Claude（新会话） | `/verify` → verifier 子代理（Opus、只能写报告）逐条验收 → `pnpm spec verdict pass\|fail`              |
| 8   | **你**           | 审阅 07 → `pnpm spec approve acceptance`（失败会自动打回 implementing，回到第 6 步）                  |
| 9   | Claude（新会话） | `/retro` → 08 复盘 + `.claude/proposals/` 改进提案 → `pnpm spec submit retro`（归档）                 |
| 10  | 你 / Claude      | 审阅并合入提案；`/ship` 生成 PR 描述                                                                  |

需要你看的时候，Claude 会停下来提醒你。`/approve <gate>` 可以让 Claude 帮你列出审阅要点，但**批准本身必须由你在自己的终端执行**，Claude 执行会被拒绝。

随时可用：`pnpm spec status`（当前状态与下一步）、`pnpm spec list`、`pnpm spec metrics`（各 feature 的流程度量趋势）、`pnpm spec help`。

## 闸门如何生效

| stage              | Claude 能写的文件                                                   |
| ------------------ | ------------------------------------------------------------------- |
| drafting           | `00-input/`、`01-requirement.md`                                    |
| requirement_review | `00-input/`、`01-requirement.md`（按审阅意见修改）                  |
| planning           | `01`~`04`、`docs/adr/`                                              |
| awaiting_approval  | `01`~`04`、`docs/adr/`                                              |
| implementing       | 业务代码、`06-impl-log.md`、`docs/adr/`（02「禁止触碰的目录」除外） |
| verifying          | `04-acceptance.md`（回填结果与证据）、`07-verify-report.md`         |
| retro              | `08-retro.md`                                                       |
| 任何时候           | `.claude/proposals/`                                                |

- **始终只读**：`05-state.json`、`specs/.current`（只能经 `pnpm spec`）、`specs/archive/`
- **feature 进行中禁止修改流程本身**：CLAUDE.md、`.claude/{settings.json,hooks,rules,agents,commands,skills}`、`scripts/spec*.mjs`、`specs/_template/`
- **没有当前 feature 时是维护模式**：不受 stage 限制，用于修改脚手架本身
- **Stop hook**：implementing 阶段如果没有一次通过且晚于最后一次改代码的 `pnpm spec verify`，Claude 不能收工（只拦一次，防死循环）
- **guard-bash**：拦截 `rm -rf`（构建产物目录除外）、force push、`reset --hard`、破坏性 SQL、`drizzle-kit push`、以及用 shell 绕过闸门

hooks 是防止"顺手"和长会话漂移的护栏，不是安全边界；真正的边界是 `permissions` 和你的审阅。

## 相对参考设计的调整

| 参考设计                                   | 本脚手架                                                   | 原因                                              |
| ------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------- |
| `/approve` 由 Claude 执行                  | approve 只能由人执行（CLAUDECODE 检测 + deny + hook）      | 否则模型可以给自己签字，闸门形同虚设              |
| check-write 在非 implementing 阶段拦截一切 | 按 stage 的写入白名单                                      | 否则 `/spec` 连 01-requirement.md 都写不了        |
| `/spec` 用 Plan Mode 运行                  | 不用 Plan Mode，由 stage 闸门保证不写代码                  | Plan Mode 下无法写需求文档                        |
| verifier / requirement-analyst 无 Write    | 有 Write，但 stage 闸门只允许写本阶段文件                  | 它们必须产出报告与需求文档                        |
| Stop hook 在 implementing 阶段一律拦截     | 只在"没有新鲜且通过的 verify"时拦截                        | 避免中途对话也被拦                                |
| 证据由模型贴输出                           | `pnpm spec verify` 自动把结果写入 05/06                    | 证据由脚本产生，而不是模型转述                    |
| AC/TC 追溯靠约定                           | `submit plan` 查双向覆盖，`submit impl` 查测试文件含 TC-ID | 追溯可机器检查，CI 也会跑                         |
| hooks 用 bash + jq                         | hooks 用 Node                                              | 不依赖 jq，跨平台                                 |
| 测试依赖外部 Postgres                      | 开发/测试用 PGlite                                         | `pnpm verify` 在任何 worktree / CI 中一条命令跑完 |

完整的决策记录见 [docs/adr/0002-harness-gates.md](docs/adr/0002-harness-gates.md)。

## 常见问题

- **Claude 被 hook 拦住了**：先看拦截信息里的"下一步"。多数情况是 stage 不对（例如 plan 还没被批准），这是预期行为。
- **想临时改脚手架本身**：`pnpm spec pause` 进入维护模式，改完 `pnpm spec use <dir>` 恢复。
- **视觉基线**：截图按平台命名（`*-chromium-darwin.png`）。首次运行自动生成；在另一个平台（如 CI 的 Linux）首次运行时也会生成该平台的基线，需要提交后才开始比对。更新基线：`pnpm test:e2e --update-snapshots`。
- **Next.js 16 与模型训练数据不一致**：`apps/web/AGENTS.md` 由 `next dev` 维护，指引模型阅读 `node_modules/next/dist/docs/`；`apps/web/CLAUDE.md` 通过 `@AGENTS.md` 导入它。
- **pnpm 11 的 minimumReleaseAge**：默认拒绝发布不足 1 天的版本。升级依赖时选择已发布超过 1 天的版本，而不是添加排除项。
