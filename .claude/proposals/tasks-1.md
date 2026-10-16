---
source: specs/archive/2026-10-16-tasks
type: 模型惯性错误
target: .claude/skills/fullstack-tdd/SKILL.md
status: accepted
metric: verify_rounds
---

## 现象

实现 tasks repository 时，`const [row] = await db.insert(...).returning()` 直接返回 `row`，typecheck 报 `TaskRow | undefined` 不能赋给 `TaskRow`，多一轮修复。

## 根因

常见的 Drizzle 示例没有开启 `noUncheckedIndexedAccess`，模型按训练数据的写法直接解构。

## 提案

在 `fullstack-tdd` 的 Gotchas 追加：

> Drizzle 的 `returning()` 返回数组；开启了 `noUncheckedIndexedAccess`，取第一项要处理 `undefined`

## 预期效果与回看方式

后续 feature 的 06「踩坑」不再出现同类问题；回看 `verify_rounds` 与 06 记录。
