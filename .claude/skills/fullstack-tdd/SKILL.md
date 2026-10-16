---
name: fullstack-tdd
description: 在本仓库实现任何跨包功能（db / shared / api / web）时使用：规定 schema → 契约 → API → UI 的顺序、测试先行、每层的验证命令与常见错误（Gotchas）。
---

# 全栈 TDD

## 顺序与验证命令

| 层                  | 先写的测试                                        | 实现                                          | 验证命令                         |
| ------------------- | ------------------------------------------------- | --------------------------------------------- | -------------------------------- |
| 1 `packages/db`     | 必要时 `src/*.test.ts`                            | `schema.ts` → `pnpm db:generate`              | `pnpm --filter @app/db test`     |
| 2 `packages/shared` | `src/*.test.ts`（校验规则）                       | zod schema + 类型                             | `pnpm --filter @app/shared test` |
| 3 `apps/api`        | `test/<module>.test.ts`（createTestDb + request） | repository → service → routes → `app.ts`      | `pnpm --filter @app/api test`    |
| 4 `apps/web`        | `src/components/*.test.tsx`（spyOn api）          | `lib/api.ts` → `lib/queries.ts` → 组件 → 页面 | `pnpm --filter @app/web test`    |
| 5 e2e               | `e2e/*.spec.ts`                                   | —                                             | `pnpm test:e2e`                  |
| 收尾                | —                                                 | —                                             | `pnpm spec verify`               |

每层：RED（运行，确认失败且失败原因正确）→ GREEN（最小实现）→ 重构 → 跑该层验证命令。
测试名以 TC-ID 开头：`it('TC-012 拖动卡片后顺序持久化', …)`。

## 参照实现

`tasks` 模块是完整样板：`packages/shared/src/tasks.ts` → `apps/api/src/modules/tasks/` → `apps/web/src/lib/{api,queries}.ts` → `apps/web/src/components/task-board.tsx`，需求文档在 `specs/archive/2026-10-16-tasks/`。

## Gotchas

- 分页接口必须写 limit（复用 `PageQuery`，上限 `MAX_PAGE_LIMIT`），模型默认经常漏
- Server Component 里不能用 `window` / `localStorage` / hooks；需要客户端状态就抽到 `'use client'` 叶子组件
- 不要在 web 和 api 各写一份类型，一律从 `@app/shared` 导入
- 迁移文件必须由 drizzle-kit 生成，不要手写 SQL
- 改 `packages/shared` 后必须跑全量 `pnpm spec verify`，不能只跑单包
- Drizzle 的 `returning()` 返回数组；开启了 `noUncheckedIndexedAccess`，取第一项要处理 `undefined`
- 测试依赖 `created_at` 排序时，逐条 `await` 插入，不要 `Promise.all`
- Next 16 的 API 与训练数据不同（middleware 已改名 proxy 等），先查 `apps/web/node_modules/next/dist/docs/`
- 测试里用 shared schema 解析响应（`Task.parse(await res.json())`），契约漂移会立刻暴露
- 新依赖：版本写进 `pnpm-workspace.yaml` 的 catalog，package.json 里写 `"catalog:"`；`pnpm add` 需要用户确认
