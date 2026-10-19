---
description: 人工闸门审阅助手：列出审阅要点（批准动作必须由人在自己的终端执行）
argument-hint: prd_review | requirement_review | plan_review | acceptance
allowed-tools: Bash(node scripts/spec.mjs:*)
disable-model-invocation: true
---

## 当前流程状态

!`node scripts/spec.mjs status`

## 任务

闸门：$ARGUMENTS

approve 是人工闸门：你执行它会被 deny 规则与 guard hook 拦截。这是有意设计——模型不能给自己的产物签字。你的工作是帮我审：

1. plan_review / acceptance：先运行 `node scripts/spec.mjs check-trace`（acceptance 加 `--files`）。
2. 按闸门列出审阅清单，每条附上你在文档里看到的具体内容或疑点：
   - **prd_review**：问题陈述是否真实存在（不是为做而做）；成功指标是否可衡量、目标值是否认可；Must 是否过多（超过 7 条考虑拆分）；Won't 是否写全；逐条列出"推断"项请我确认；interview.md 的回答是否是我的原话
   - **requirement_review**：范围外是否完整；每个开放问题的默认选择是否可接受；异常态是否齐全；UI 规格与设计稿是否一致
   - **plan_review**：实施顺序与验证命令；禁止触碰的目录；回滚方式；P0 TC 是否覆盖全部异常态；有没有多做或漏做
   - **acceptance**：07 每条 AC 的证据是否真实、可复现；视觉比对差异；e2e 结果
3. 最后提醒我在自己的终端运行：`pnpm spec approve $ARGUMENTS`
   （不通过：`pnpm spec reject $ARGUMENTS "原因"`）

不要修改任何文件。
