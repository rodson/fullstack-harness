---
description: 阶段 0 需求探索：把一句话想法访谈成结构化 PRD（不写代码）
argument-hint: '<一句话想法>'
allowed-tools: Bash(node scripts/spec.mjs:*)
disable-model-invocation: true
---

## 当前流程状态

!`node scripts/spec.mjs status`

## 任务

一句话想法：$ARGUMENTS

访谈必须在主会话里做（子代理不能和我多轮对话），整理 PRD 交给 **product-analyst** 子代理。

1. 按上面的 stage 处理：
   - `drafting`：运行 `node scripts/spec.mjs discover` 切到探索阶段。失败（prd.md 已有内容，或已经走过探索）就停止，按提示告诉我该用 `/spec`
   - `discovering`：继续（上次访谈没做完，先读 interview.md 接着问）
   - 其他 stage：停止，告诉我原因与下一步
2. 读 `00-input/idea.md`（人写的材料，只读）与 `00-input/design/`；把一句话想法原话写入 `00-input/discovery/interview.md` 作为 Q-0（维度"想法"，轮次 0）。想法为空且 idea.md 也没有内容时，停下来问我。
3. **访谈，最多 4 轮**。每轮用 AskUserQuestion 提最多 4 个问题：
   - 优先问还没覆盖的维度：问题 / 用户 / 场景 / 现状 / 目标 / 范围 / 约束 / 风险
   - 每个问题根据已知上下文给 2~4 个具体选项，把你推荐的放第一个并标 `(Recommended)`；我可以选 Other 自由回答
   - 不问技术实现；不重复问已经回答过的内容；目标维度要追问到可衡量（数字或可观察的行为）
   - 每轮结束立即把回答**原话**追加到 interview.md（Q-n 连续编号）。选了选项就记选项原文，选了 Other 就记我写的原文，不转述
   - 我说"够了"或 4 轮用完：剩下没覆盖的维度各补一行，回答写"未回答"
4. 调用 **product-analyst** 子代理：传入 feature 目录路径与一句话想法，由它做竞品调研（写 `discovery/research.md`）并生成 `00-input/prd.md`。
5. 在对话中列出：Must / Should / Won't 清单（含来源）、全部"推断"项、成功指标、它认为最薄弱的维度。Must 超过 7 条或它建议拆分时，明确告诉我。
6. 运行 `pnpm spec submit discovery`；未通过就按提示补齐（缺维度回到第 3 步补问，不要编造回答）后重试。
7. 停下。提醒我：审阅 `prd.md` 与 `interview.md`，然后在**自己的终端**运行
   `pnpm spec approve prd_review`（不通过：`pnpm spec reject prd_review "原因"`；决定不做：`pnpm spec cancel "原因"`）。
   批准后用新会话（`/clear`）运行 `/spec`。

不要修改 idea.md、design/ 或任何业务代码（stage 闸门也会拦截）。
