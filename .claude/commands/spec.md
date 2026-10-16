---
description: 阶段 1 需求澄清：读 00-input，产出 01-requirement.md（不写代码）
argument-hint: '[补充说明]'
allowed-tools: Bash(node scripts/spec.mjs:*)
disable-model-invocation: true
---

## 当前流程状态

!`node scripts/spec.mjs status`

## 任务

补充说明：$ARGUMENTS

1. 确认上面 stage 为 `drafting`；否则停止，告诉我原因与下一步。
2. 若 `00-input/prd.md` 只有模板注释，停止并请我补充 PRD 与设计稿截图。
3. 使用 **requirement-analyst** 子代理分析 `00-input/`，写入 `01-requirement.md`。
4. 在对话中用表格列出全部开放问题（ID / 问题 / 影响面 / 默认选择），以及最不确定的假设。
5. 运行 `pnpm spec submit requirement`；未通过就按提示补齐后重试。
6. 停下。提醒我：审阅 01、在「结论」列答复开放问题，然后在**自己的终端**运行
   `pnpm spec approve requirement_review`（不通过：`pnpm spec reject requirement_review "原因"`）。

不要修改任何业务代码（stage 闸门也会拦截）。
