---
feature: '{{SLUG}}'
status: draft
---

# 测试用例：{{SLUG}}

<!-- 规则（pnpm spec submit plan / submit impl 会检查）：
     - TC-ID 形如 TC-001；「对应 AC」可写多个（AC-01, AC-03）
     - 每条 AC 至少一条 TC；P0 覆盖主流程 + 全部异常态
     - 层级：unit / integration / e2e / manual
     - 自动化落点：反引号包裹的真实测试文件路径，如 `apps/api/test/tasks.test.ts`；
       测试名必须以 TC-ID 开头（it('TC-001 …')），submit impl 会检查文件存在且包含该 ID
     - 无法自动化的标 manual，并在「步骤」写清人工操作 -->

| TC-ID | 对应 AC | 层级 | 前置条件 | 步骤 | 预期 | 自动化落点 | 优先级 |
| ----- | ------- | ---- | -------- | ---- | ---- | ---------- | ------ |
