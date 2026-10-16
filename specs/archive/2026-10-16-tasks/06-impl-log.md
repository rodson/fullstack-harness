# 实现记录：tasks

## 进度

- [x] 1 db schema + 生成迁移
- [x] 2 shared 契约
- [x] 3 api 模块
- [x] 4 web 取数 + 组件
- [x] 5 e2e 关键路径

## 偏离与原因

| ID  | 原计划                           | 实际做法                                      | 原因             | 需回写文档                 |
| --- | -------------------------------- | --------------------------------------------- | ---------------- | -------------------------- |
| D-1 | 状态枚举在 db 与 shared 各写一份 | db 的 pgEnum 直接使用 shared 的 TASK_STATUSES | 避免两份枚举漂移 | 已写入 .claude/rules/db.md |

## 踩坑

- Drizzle 的 `returning()` 返回数组，开启 `noUncheckedIndexedAccess` 后取第一项要处理 `undefined`（typecheck 失败一次）
- 依赖 `created_at` 排序的测试需要逐条 `await` 插入

## 验证记录

### verify · 2026-10-16T15:40:12.000Z · PASS · 38s

```text
$ pnpm verify
@app/shared:test:       Tests  2 passed (2)
@app/api:test:       Tests  6 passed (6)
@app/web:test:       Tests  4 passed (4)
@app/db:test:       Tests  1 passed (1)
 Tasks:    4 successful, 4 total
# pass 19
@app/web:build: ✓ Compiled successfully in 2.1s
 Tasks:    2 successful, 2 total
```
