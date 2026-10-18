@AGENTS.md

## Claude Code 专属

上面导入的 AGENTS.md 是所有工具共用的项目说明；本节只放 Claude Code 才有的机制。

### 闸门由 hook 强制执行

- SessionStart 会注入当前 feature、stage、本阶段允许写的文件与下一步；以 `pnpm spec status` 为准
- 越阶段写文件会被 check-write 拦截；implementing 阶段没有一次通过且晚于最后改动的 `pnpm spec verify` 时，Stop 会被拦截；高危命令与绕过闸门的 shell 命令会被 guard-bash 拦截
- 这些拦截都是预期行为：按拦截信息里的"下一步"处理，不要换一种方式绕过
- `approve` / `use` / `pause` 被 deny 规则与 hook 双重拦截；需要时提醒用户在自己的终端运行

### 阶段命令

每个阶段用新会话（`/clear`），阶段间只靠 `specs/` 下的文件传递上下文。

| 命令              | 子代理                       | 产出 / 动作                                        |
| ----------------- | ---------------------------- | -------------------------------------------------- |
| `/spec`           | requirement-analyst          | 01-requirement.md → `pnpm spec submit requirement` |
| `/plan-feature`   | test-designer                | 02 / 03 / 04 → `pnpm spec submit plan`             |
| `/approve <gate>` | —                            | 列出审阅要点（不执行批准）                         |
| `/impl`           | implementer（Sonnet）        | TDD 实现 → `pnpm spec verify` → `submit impl`      |
| `/verify`         | verifier（Opus，独立上下文） | 07-verify-report.md → `pnpm spec verdict`          |
| `/retro`          | retro-analyst                | 08-retro.md + 提案 → `pnpm spec submit retro`      |
| `/ship`           | —                            | 全量校验 + PR 描述（不自动 commit / push）         |

### 其他

- `pnpm spec verify` 可能超过默认 2 分钟，Bash timeout 设为 600000
- `.claude/rules/` 按路径自动加载；实现跨包功能时使用 `fullstack-tdd` skill
- 自改进只写提案到 `.claude/proposals/`，不直接改 AGENTS.md、CLAUDE.md 或 `.claude/*`（feature 进行中时 hook 也会拦截）
