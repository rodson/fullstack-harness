---
description: 阶段 5 独立验收：verifier 逐条核对 AC 并产出 07-verify-report.md
allowed-tools: Bash(node scripts/spec.mjs:*)
disable-model-invocation: true
---

## 当前流程状态

!`node scripts/spec.mjs status`

## 任务

1. 确认 stage 为 `verifying`；否则停止。
2. 使用 **verifier** 子代理执行完整验收。它使用独立上下文和不同模型：只告诉它 feature 目录，不要转述实现过程。
3. 子代理完成后确认：`07-verify-report.md` 已写，`pnpm spec verdict` 已执行（运行 `pnpm spec status` 查看）。
4. 向我汇总：结论、失败的 AC 与证据、视觉差异。
5. 失败项**不要自行修复**。
   - 通过：提醒我审阅 07 后在自己的终端运行 `pnpm spec approve acceptance`
   - 失败：stage 已自动回到 implementing，提醒我用新会话运行 `/impl`
