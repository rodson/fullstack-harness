---
feature: '{{SLUG}}'
status: draft
---

# 实施计划：{{SLUG}}

## 目标

<!-- 一两句话，引用 01-requirement.md 的主流程编号。 -->

## 改动文件清单

| 文件 | 动作（新增/修改/删除） | 说明 |
| ---- | ---------------------- | ---- |

## 实施顺序

<!-- 固定顺序：packages/db → packages/shared → apps/api → apps/web → e2e。每步写清验证命令，例如：
     pnpm --filter @app/db test / pnpm --filter @app/api test / pnpm --filter @app/web test -->

| 步骤 | 内容 | 验证命令 |
| ---- | ---- | -------- |

## 禁止触碰的目录

<!-- 用反引号逐条列出路径（目录或文件），实现阶段 check-write hook 会据此硬拦截写操作。
     没有额外限制写"无"。例：`packages/ui/src/components/` -->

## 回滚方式

<!-- 代码回滚（revert 哪些提交）+ 数据回滚（迁移是否可逆、如何处理已写入的数据）。 -->

## 风险与依赖
