# 复盘：tasks

## 度量

| open_questions | plan_deviations | ac_failed | verify_rounds | human_interventions |
| -------------- | --------------- | --------- | ------------- | ------------------- |
| 3              | 1               | 0         | 1             | 0                   |

第一个 feature，没有历史可比；作为后续 feature 的基线。

## 问题归因

| #   | 类型         | 现象                                        | 根因                                               | 影响         | 改进提案                                | 落地位置              | 提案文件                       |
| --- | ------------ | ------------------------------------------- | -------------------------------------------------- | ------------ | --------------------------------------- | --------------------- | ------------------------------ |
| 1   | 模型惯性错误 | `returning()` 取第一项未处理 undefined      | 常见 Drizzle 示例没有开启 noUncheckedIndexedAccess | 多一轮修复   | 在 Gotchas 中写明                       | skill Gotchas         | `.claude/proposals/tasks-1.md` |
| 2   | 规则缺失     | 状态枚举差点在 db 与 shared 各写一份（D-1） | rules/db.md 没有说明枚举的来源                     | 契约漂移风险 | db 规则补充"枚举值来自 packages/shared" | `.claude/rules/db.md` | `.claude/proposals/tasks-2.md` |

## 做得好的

- 开放问题都带默认选择，人工审阅只改了 OQ-3 的结论，没有来回追问
- 测试名以 TC-ID 开头，验收时可以直接把测试输出对应到 AC

## 本次流程改进清单（给人）

1. `tasks-1`：审阅后合入 `.claude/skills/fullstack-tdd/SKILL.md` Gotchas（预期降低 verify_rounds）——已合入
2. `tasks-2`：审阅后合入 `.claude/rules/db.md`（预期降低 plan_deviations）——已合入
