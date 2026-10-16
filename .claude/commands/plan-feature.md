---
description: 阶段 2 产出计划三件套：02-plan / 03-test-cases / 04-acceptance
argument-hint: '[补充说明]'
allowed-tools: Bash(node scripts/spec.mjs:*)
disable-model-invocation: true
---

## 当前流程状态

!`node scripts/spec.mjs status`

## 任务

补充说明：$ARGUMENTS

1. 确认 stage 为 `planning`；否则停止。
2. 读已批准的 `01-requirement.md`（开放问题以「结论」为准，结论为空的按「默认选择」）。
3. 写 `02-plan.md`：
   - 目标、改动文件清单
   - 实施顺序：packages/db → packages/shared → apps/api → apps/web → e2e，每步写验证命令
   - 禁止触碰的目录：用反引号逐条列出（实现阶段 hook 会据此硬拦截）
   - 回滚方式（代码 + 数据）、风险与依赖
4. 写 `04-acceptance.md`：每条 AC 用业务语言、可勾选，覆盖 01 的主流程与异常态。
5. 使用 **test-designer** 子代理写 `03-test-cases.md`，并同步 04 的「对应 TC」。
6. 有争议的技术选型写 ADR 草稿到 `docs/adr/`（模板 `docs/adr/template.md`）。
7. 运行 `pnpm spec submit plan`（双向追溯检查）；未通过就补齐后重试。
8. 停下，给我审阅清单：AC 数 / TC 数 / P0 是否覆盖全部异常态 / 禁止触碰的目录 / 回滚方式 / 主要风险。
   提醒我在**自己的终端**运行 `pnpm spec approve plan_review`（不通过：`pnpm spec reject plan_review "原因"`）。

不要写任何业务代码或测试代码。
