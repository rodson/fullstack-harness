---
paths:
  - 'apps/api/**/*.ts'
---

# apps/api（Hono）

- 模块结构：`src/modules/<name>/{<name>.routes.ts, <name>.service.ts, <name>.repository.ts}`，在 `src/app.ts` 注册
- routes 只做校验与编排；业务规则在 service；数据访问在 repository（routes 导入 `@app/db` / `drizzle-orm` 会被 lint 拦截）
- 入参一律用 `packages/shared` 的 zod schema + `src/lib/validate.ts` 的 `validate()`；不要在 api 内另写 schema
- 业务错误抛 `AppError(code, message, details?)`，由 `onError` 统一转成 `{ code, message, details? }`；新错误码先加到 `packages/shared/src/errors.ts`
- 列表接口必须分页且 `limit ≤ MAX_PAGE_LIMIT`（复用 `PageQuery`）；禁止 N+1：用 join 或 `inArray` 批量查询，禁止循环内查询
- service 返回值用 shared 类型标注（如 `Promise<Task>`），日期序列化为 ISO 字符串
- 集成测试放 `apps/api/test/`：`createTestDb()`（PGlite 内存库）+ `app.request()`，并用 shared schema 解析响应以校验契约
