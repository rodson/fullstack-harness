---
paths:
  - 'packages/shared/**'
---

# packages/shared（前后端唯一契约）

- 这里是 zod schema 的唯一来源；web、api（以及 Android 客户端）都以它为准，禁止各写一份类型
- 新增字段 / schema 可以直接加；修改或删除已有字段：必须在 02-plan.md 写明影响面并跑全量 `pnpm spec verify`
- 不依赖任何其他工作区包（lint 拦截）；不放有运行时副作用的代码
- 同名导出值与类型：`export const Task = z.object(…)` + `export type Task = z.infer<typeof Task>`
- 用户可见的校验文案写在 schema 里（如 `min(1, '标题不能为空')`），前后端共用同一份提示
