---
paths:
  - 'specs/**'
---

# specs/ 文档约定

- `specs/_template/` 是模板、`specs/archive/` 是已完成的 feature：都只读，也不作为新需求的实现依据（只参考写法）
- `05-state.json` 与 `specs/.current` 只能通过 `pnpm spec <command>` 修改
- 每个 stage 只能写对应文件（check-write hook 强制；SessionStart 会注入"本阶段允许写"）
- 01：七个小节都要有内容；开放问题必须带「默认选择」；「结论」列留给人填
- 03：TC-ID 形如 TC-001；落点用反引号写真实测试文件路径；实现时测试名以 TC-ID 开头
- 04：AC 用业务语言写；「对应 TC」与 03 的「对应 AC」双向一致；「结果」✅/❌ 与「证据」由 verifier 回填
- 06：偏离用 D-n 编号；「验证记录」由 `pnpm spec verify` 自动追加，不要手写
- 表格单元格里不要出现 `|`，否则会破坏 spec.mjs 的解析
