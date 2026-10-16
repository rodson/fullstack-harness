---
source: specs/archive/2026-10-16-tasks
type: 规则缺失
target: .claude/rules/db.md
status: accepted
metric: plan_deviations
---

## 现象

计划里状态枚举在 `packages/db` 的 pgEnum 与 `packages/shared` 的 zod enum 各写一份；实现时改为共用（06 偏离 D-1）。

## 根因

`.claude/rules/db.md` 没有说明枚举值的来源，计划阶段默认按"各层各写一份"处理。

## 提案

在 `.claude/rules/db.md` 追加：

> 枚举值来自 `packages/shared`（如 `TASK_STATUSES`），不要在 db 里另写一份

## 预期效果与回看方式

后续涉及枚举的 feature 不再产生同类偏离；回看 `plan_deviations`。
