---
feature: 'tasks'
status: approved
---

# 实施计划：tasks

## 目标

实现 01-requirement.md 的 F1–F4，并作为脚手架的参照模块（shared → db → api → web 全链路）。

## 改动文件清单

| 文件                                     | 动作 | 说明                                                         |
| ---------------------------------------- | ---- | ------------------------------------------------------------ |
| `packages/shared/src/tasks.ts`           | 新增 | Task / CreateTaskInput / UpdateTaskInput / ListTasksQuery 等 |
| `packages/db/src/schema.ts`              | 新增 | tasks 表 + task_status 枚举                                  |
| `packages/db/drizzle/0000_*.sql`         | 新增 | 由 drizzle-kit generate 生成                                 |
| `apps/api/src/modules/tasks/`            | 新增 | routes / service / repository                                |
| `apps/api/src/app.ts`                    | 修改 | 注册 /api/tasks                                              |
| `apps/web/src/lib/api.ts`、`queries.ts`  | 新增 | 取数函数与 TanStack Query hooks                              |
| `apps/web/src/components/task-board.tsx` | 新增 | 表单 + 列表 + 四种状态                                       |
| `apps/web/e2e/tasks.spec.ts`             | 新增 | 关键路径 e2e                                                 |

## 实施顺序

| 步骤 | 内容                 | 验证命令                         |
| ---- | -------------------- | -------------------------------- |
| 1    | db schema + 生成迁移 | `pnpm --filter @app/db test`     |
| 2    | shared 契约          | `pnpm --filter @app/shared test` |
| 3    | api 模块             | `pnpm --filter @app/api test`    |
| 4    | web 取数 + 组件      | `pnpm --filter @app/web test`    |
| 5    | e2e 关键路径         | `pnpm test:e2e`                  |

## 禁止触碰的目录

- `packages/ui/src/components/`（复用现有基础控件，不修改）
- `apps/web/src/app/globals.css`（不新增设计 token）

## 回滚方式

- 代码：revert 本 feature 的提交
- 数据：迁移只新增表与枚举；回滚代码时保留表，不执行删除（向后兼容）

## 风险与依赖

- PGlite 与 Postgres 存在差异：本模块只用基础类型与 btree 索引，风险低
