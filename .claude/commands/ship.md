---
description: 提交前完整校验 + 生成 PR 描述（不自动 commit / push）
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(node scripts/spec.mjs:*)
disable-model-invocation: true
---

## 工作区

!`git status --short`

## Feature

!`node scripts/spec.mjs list`

## 任务

1. 运行 `pnpm verify`，贴出原始结果。任一步失败先修根因，不要用 try/catch、`.skip`、`any` 掩盖。
2. 基于 `git diff main...HEAD` 写 PR 描述：
   - 改动摘要 / 影响面（web、api、shared 契约、Android 客户端）
   - 迁移说明：是否有新迁移、是否向后兼容
   - 回滚方式
   - 关联 spec 目录与验收证据（`07-verify-report.md`）
3. 不要自行 commit 或 push；把 PR 描述给我，由我决定。
