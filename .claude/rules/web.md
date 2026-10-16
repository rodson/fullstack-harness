---
paths:
  - 'apps/web/**/*.{ts,tsx,css}'
---

# apps/web（Next.js 16 App Router）

- Next 16 与训练数据差异大（例如 middleware 已改名 proxy）：动手前先查 `apps/web/node_modules/next/dist/docs/` 对应章节
- 默认 Server Component；只有需要状态、事件或浏览器 API 时才加 `'use client'`，并把 client 部分下沉到最小的叶子组件
- 取数统一走 `src/lib/api.ts`（用 shared schema 解析响应）+ `src/lib/queries.ts` 的 TanStack Query hooks；组件里禁止裸 `fetch`（lint 拦截）
- 只能依赖 `@app/shared` 与 `@app/ui`，不能导入 `@app/api` / `@app/db`（lint 拦截）
- 新组件优先复用 `packages/ui`（shadcn/ui 风格源码）；缺基础控件就加到 `packages/ui`，不要在 web 里自造
- 每个数据视图覆盖 loading / empty / error / 无权限 四种状态（用 `ApiError.code` 区分 UNAUTHORIZED / FORBIDDEN）
- 颜色只用 `globals.css` 的 token（`bg-background`、`text-muted-foreground`…），不要写死色值
- 组件测试与组件同目录（`*.test.tsx`），用 `vi.spyOn(api, …)` 隔离网络；e2e 放 `e2e/*.spec.ts`
- 可访问性：表单控件要有 label / aria-label，状态提示用 `role="status"` / `role="alert"`（测试也按 role 查询）
