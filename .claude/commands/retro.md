---
description: 阶段 6 复盘：归因 + 流程改进提案，然后归档 feature
allowed-tools: Bash(node scripts/spec.mjs:*)
disable-model-invocation: true
---

## 当前流程状态

!`node scripts/spec.mjs status`

## 历史度量

!`node scripts/spec.mjs metrics`

## 任务

1. 确认 stage 为 `retro`；否则停止。
2. 使用 **retro-analyst** 子代理产出 `08-retro.md` 与 `.claude/proposals/<slug>-<n>.md`。
3. 给我「本次流程改进清单」：每条提案的落地位置、我需要做的动作（审阅合入 / 拒绝）、预期降低哪个 metric。
4. 运行 `pnpm spec submit retro`（标记 done、归档到 `specs/archive/`、退出当前 feature）。

不要直接修改 CLAUDE.md、`.claude/rules`、`.claude/skills`、hooks——改进只以提案形式交给我。
