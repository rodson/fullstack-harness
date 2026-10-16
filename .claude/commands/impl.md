---
description: 阶段 4 按已批准的计划自动实现（TDD），通过 verify 后提交验收
argument-hint: '[补充说明]'
allowed-tools: Bash(node scripts/spec.mjs:*)
disable-model-invocation: true
---

## 当前流程状态

!`node scripts/spec.mjs status`

## 任务

补充说明：$ARGUMENTS

1. 确认 stage 为 `implementing`；否则停止（多半是 plan_review 还没被人批准）。
2. 若 gates 中 `acceptance=failed`：先读 `07-verify-report.md`「需回灌实现的问题」，本轮只修这些问题。
3. 使用 **implementer** 子代理按 `02-plan.md` 执行（TDD，测试名以 TC-ID 开头），把补充说明一并传给它。
4. 子代理返回后，亲自运行 `pnpm spec verify`（Bash timeout 600000）。失败就把错误交回 implementer 修复，直到通过。
5. 运行 `pnpm spec submit impl`（检查 verify 新鲜度、TC 落点文件、06 偏离小节）；未通过就修复后重试。
6. 停下，汇总：完成内容、偏离（D-n）、风险。提醒我用新会话（`/clear`）运行 `/verify`——验收必须在独立上下文中进行。
