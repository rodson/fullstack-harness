# 原始需求：tasks

> 脚手架自带的示例 feature，演示一个需求走完 00 → 08 的全部产物。
> 对应代码：`packages/shared/src/tasks.ts`、`apps/api/src/modules/tasks/`、`apps/web/src/components/task-board.tsx`。

做一个最简单的个人任务列表：

- 可以添加任务（只有标题），新任务默认"待办"
- 可以把任务在 待办 → 进行中 → 已完成 之间切换
- 可以删除任务
- 列表按创建时间倒序，最新的在最上面
- 后续 Android 客户端也要用同一套接口
