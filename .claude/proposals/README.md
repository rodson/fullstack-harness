# 流程改进提案

`/retro`（retro-analyst）把需要修改流程配置的改进写到这里，**由人审阅后合入**。模型不直接改 CLAUDE.md、`.claude/rules|skills|agents|commands|hooks`、`specs/_template/`（feature 进行中时 check-write hook 也会拦截）。

## 文件名

`<feature-slug>-<n>.md`，例如 `kanban-1.md`。

## 格式

```markdown
---
source: specs/archive/<dir> # 来源 feature
type: 规则缺失 # 需求歧义 / 规则缺失 / 模型惯性错误 / 环境工具 / 架构决策
target: .claude/rules/api.md # 落地位置
status: proposed # proposed / accepted / rejected / reverted
metric: plan_deviations # 预期降低的度量
---

## 现象

## 根因

## 提案（具体修改文本或 diff）

## 预期效果与回看方式
```

## 合入与回看

1. 人审阅提案 → 在维护模式下（`pnpm spec pause` 或 feature 已归档）修改目标文件 → 把 `status` 改为 `accepted`
2. 每季度用 `pnpm spec metrics` 回看：对应 metric 没有下降的改进，回滚并标记 `reverted`
