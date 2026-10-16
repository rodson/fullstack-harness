# ADR-0002：交付流程闸门的实现方式

- 状态：已采纳
- 日期：2026-10-16
- 关联：设计来源 https://github.com/rodson/web-harness-learning

## 背景

流程要求"人工批准之前不能写代码""实现者与验收者分离""自改进只出提案"。提示词里的"请等我确认"只是建议，模型在长会话中会忘记或越过它，所以闸门必须由 harness 强制执行。

## 决策

1. **状态机是唯一真相源**：`specs/<dir>/05-state.json` 只能由 `scripts/spec.mjs` 修改（Edit/Write 与 shell 写入都会被 hook 拦截）。每次迁移写入 `history`，可追溯是谁、何时、为何推进或打回。
2. **按 stage 的写入白名单**（PreToolUse `check-write`）：例如 drafting 只能写 01，verifying 只能写 04/07，只有 implementing 能写业务代码；02-plan.md「禁止触碰的目录」在实现阶段被硬拦截；feature 进行中禁止修改流程配置本身。
3. **批准只能由人执行**：`approve` / `use` / `pause` 检测 `CLAUDECODE=1` 后拒绝执行，同时被 settings.json 的 deny 规则与 guard-bash hook 拦截。参考设计中由 Claude 执行的 `/approve` 改为"审阅助手"，只列出审阅要点。
4. **证据由脚本产生**：`pnpm spec verify` 运行 `pnpm verify`，把结果与输出尾部写入 05/06；Stop hook 依据"最近一次 verify 是否通过且晚于最后一次代码修改"决定是否允许收工（带 `stop_hook_active` 防死循环）。
5. **追溯可机器检查**：`submit plan` 检查 AC ↔ TC 双向覆盖；`submit impl` 检查每个 TC 的落点文件存在且包含该 TC-ID。
6. **子代理的写权限由 stage 闸门收窄，而不是靠工具列表**：verifier / requirement-analyst 需要写报告与需求文档，所以给 Write，但 hook 只允许它们写本阶段文件。
7. **SessionStart 注入状态**：每个新会话（包括 /clear、compact 之后）自动获得当前 feature、stage、允许写的文件与下一步。

## 备选方案

- 只用 Plan Mode 限制需求阶段：Plan Mode 下连 01-requirement.md 也写不了，与"阶段产物都是文件"冲突。
- 让 `/approve` 由 Claude 执行：等于模型给自己的产物签字，闸门失效。

## 后果

- hooks 是护栏而不是安全边界：刻意构造的命令仍可能绕过 guard-bash。它防的是"顺手"与长会话漂移；真正的边界是 permissions 与人工审阅。
- 维护模式（无当前 feature）下所有写入放行，改脚手架本身时注意不要在 feature 进行中顺手修改流程。
