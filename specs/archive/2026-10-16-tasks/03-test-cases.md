---
feature: 'tasks'
status: approved
---

# 测试用例：tasks

| TC-ID  | 对应 AC      | 层级        | 前置条件           | 步骤                                     | 预期                                           | 自动化落点                                    | 优先级 |
| ------ | ------------ | ----------- | ------------------ | ---------------------------------------- | ---------------------------------------------- | --------------------------------------------- | ------ |
| TC-001 | AC-01        | integration | 空库               | POST /api/tasks，标题" 写周报 "          | 201；标题去除首尾空格；status=todo             | `apps/api/test/tasks.test.ts`                 | P0     |
| TC-002 | AC-02        | unit        | 无                 | 用 CreateTaskInput 解析空白与 201 字标题 | 解析失败；正常标题被去除首尾空格               | `packages/shared/src/tasks.test.ts`           | P0     |
| TC-003 | AC-02        | integration | 空库               | POST 空白标题                            | 400 VALIDATION_ERROR，details 指向 title       | `apps/api/test/tasks.test.ts`                 | P0     |
| TC-004 | AC-03        | integration | 3 条任务           | GET limit=2；offset=2；limit=101         | 倒序；nextOffset 正确；limit=101 返回 400      | `apps/api/test/tasks.test.ts`                 | P0     |
| TC-005 | AC-04        | integration | 1 条任务           | PATCH status=doing；PATCH 不存在的 id    | 200 且状态更新；404 NOT_FOUND                  | `apps/api/test/tasks.test.ts`                 | P0     |
| TC-006 | AC-05        | integration | 1 条任务           | DELETE 后查询详情与列表                  | 204；详情 404；列表为空                        | `apps/api/test/tasks.test.ts`                 | P0     |
| TC-007 | AC-06        | unit        | 列表接口返回空     | 渲染 TaskBoard                           | 先显示加载中，再显示空状态文案                 | `apps/web/src/components/task-board.test.tsx` | P0     |
| TC-008 | AC-06        | unit        | 列表接口报错 / 403 | 渲染 TaskBoard；点击重试                 | 显示错误并可重试恢复；403 显示无权限提示       | `apps/web/src/components/task-board.test.tsx` | P0     |
| TC-009 | AC-01, AC-02 | unit        | 列表为空           | 空提交；输入" 写周报 "后提交             | 空提交显示错误且不发请求；以去空格后的标题调用 | `apps/web/src/components/task-board.test.tsx` | P1     |
| TC-010 | AC-01, AC-07 | e2e         | api 与 web 已启动  | 添加任务 → 刷新页面                      | 新任务在列表顶部；刷新后仍在                   | `apps/web/e2e/tasks.spec.ts`                  | P0     |
| TC-011 | AC-04        | manual      | 页面上有 1 条任务  | 连续点击状态按钮 3 次                    | 待办 → 进行中 → 已完成 → 待办；已完成有删除线  | manual：浏览器手动验证                        | P2     |
