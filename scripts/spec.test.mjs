// scripts/spec.mjs 的行为测试：在临时目录里跑真实 CLI（SPEC_ROOT 指向临时仓库）。
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { beforeEach, describe, it } from 'node:test'

const SPEC = path.join(import.meta.dirname, 'spec.mjs')
const TEMPLATE = path.join(import.meta.dirname, '..', 'specs', '_template')

let root

function run(args, { human = false, input = {}, env = {} } = {}) {
  const e = {
    ...process.env,
    SPEC_ROOT: root,
    SPEC_VERIFY_CMD: 'node -e "process.exit(0)"',
    ...env,
  }
  if (human) delete e.CLAUDECODE
  else e.CLAUDECODE = '1'
  const r = spawnSync(process.execPath, [SPEC, ...args], {
    env: e,
    input: JSON.stringify(input),
    encoding: 'utf8',
  })
  return { code: r.status, out: `${r.stdout}${r.stderr}` }
}

function ok(args, opts) {
  const r = run(args, opts)
  assert.equal(r.code, 0, `${args.join(' ')} 应成功：\n${r.out}`)
  return r
}

const write = (rel, content) => {
  const p = path.join(root, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, content)
}
const feature = () => fs.readFileSync(path.join(root, 'specs/.current'), 'utf8').trim()
const doc = (name) => `specs/${feature()}/${name}`
const state = (dir = `specs/${feature()}`) =>
  JSON.parse(fs.readFileSync(path.join(root, dir, '05-state.json'), 'utf8'))
const gate = (rel) =>
  run(['check-write'], { input: { cwd: root, tool_input: { file_path: path.join(root, rel) } } })
    .code

const REQUIREMENT = `## 1. 用户故事与主流程
F1 用户创建任务
## 2. 范围外（Out of Scope）
不做协作
## 3. 假设
单用户（若不对请纠正）
## 4. 开放问题
| ID | 问题 | 影响面 | 默认选择 | 结论 |
| --- | --- | --- | --- | --- |
| OQ-1 | 是否分页 | API | 分页 | |
## 5. 异常态
空列表显示引导
## 6. 非功能需求
无特殊要求
## 7. UI 规格
不适用
`
const PLAN = `## 目标
F1
## 改动文件清单
| 文件 | 动作 | 说明 |
| --- | --- | --- |
| apps/api/src/a.ts | 修改 | x |
## 实施顺序
1. api
## 禁止触碰的目录
- \`packages/db/drizzle/\`
## 回滚方式
revert
`
const TEST_CASES = (
  acRef = 'AC-01',
) => `| TC-ID | 对应 AC | 层级 | 前置条件 | 步骤 | 预期 | 自动化落点 | 优先级 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-001 | ${acRef} | unit | 无 | 调用 | 成功 | \`apps/api/src/a.test.ts\` | P0 |
`
const ACCEPTANCE = (result = '', evidence = '') => `| AC-ID | 验收标准 | 对应 TC | 结果 | 证据 |
| --- | --- | --- | --- | --- |
| AC-01 | 能创建任务 | TC-001 | ${result} | ${evidence} |
`
const REPORT = (conclusion, result) => `## 结论
${conclusion}
## 逐条验收
| AC-ID | 结果 | 证据 | 备注 |
| --- | --- | --- | --- |
| AC-01 | ${result} | a.test.ts | |
`

function toImplementing() {
  ok(['init', 'demo'])
  write(doc('01-requirement.md'), REQUIREMENT)
  ok(['submit', 'requirement'])
  ok(['approve', 'requirement_review'], { human: true })
  write(doc('02-plan.md'), PLAN)
  write(doc('03-test-cases.md'), TEST_CASES())
  write(doc('04-acceptance.md'), ACCEPTANCE())
  ok(['submit', 'plan'])
  ok(['approve', 'plan_review'], { human: true })
}

function toVerifying() {
  toImplementing()
  write('apps/api/src/a.test.ts', "it('TC-001 创建任务', () => {})\n")
  write(doc('06-impl-log.md'), '## 偏离与原因\n无\n')
  ok(['verify'])
  ok(['submit', 'impl'])
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-test-'))
  fs.cpSync(TEMPLATE, path.join(root, 'specs/_template'), { recursive: true })
  write('apps/api/src/a.ts', 'export {}\n')
})

describe('init', () => {
  it('从模板创建 feature、替换占位符并设为当前', () => {
    ok(['init', 'demo'])
    assert.match(feature(), /^\d{4}-\d{2}-\d{2}-demo$/)
    const st = state()
    assert.equal(st.stage, 'drafting')
    assert.equal(st.feature, 'demo')
    assert.ok(fs.existsSync(path.join(root, doc('00-input/design/.gitkeep'))))
    for (const name of [
      '01-requirement.md',
      '02-plan.md',
      '03-test-cases.md',
      '04-acceptance.md',
    ]) {
      const text = fs.readFileSync(path.join(root, doc(name)), 'utf8')
      assert.doesNotMatch(text, /\{\s*\{/, `${name} 仍有未替换的占位符`)
      assert.match(text, /^feature: 'demo'$/m)
    }
  })

  it('已有进行中的 feature 时拒绝再次 init', () => {
    ok(['init', 'demo'])
    assert.equal(run(['init', 'other']).code, 1)
  })
})

describe('check-write 闸门', () => {
  it('维护模式（无当前 feature）放行代码与配置，但状态文件永远只读', () => {
    assert.equal(gate('apps/api/src/a.ts'), 0)
    assert.equal(gate('CLAUDE.md'), 0)
    assert.equal(gate('specs/.current'), 2)
  })

  it('drafting：只能写 00-input 与 01，不能写代码、状态文件、流程配置', () => {
    ok(['init', 'demo'])
    assert.equal(gate(doc('01-requirement.md')), 0)
    assert.equal(gate(doc('00-input/prd.md')), 0)
    assert.equal(gate('.claude/proposals/demo-1.md'), 0)
    assert.equal(gate(doc('02-plan.md')), 2)
    assert.equal(gate(doc('05-state.json')), 2)
    assert.equal(gate('apps/api/src/a.ts'), 2)
    assert.equal(gate('CLAUDE.md'), 2)
    assert.equal(gate('apps/web/CLAUDE.md'), 2)
    assert.equal(gate('.claude/settings.json'), 2)
    assert.equal(gate('specs/_template/01-requirement.md'), 2)
    assert.equal(gate('specs/archive/x/01-requirement.md'), 2)
  })

  it('implementing：可改代码与 06，不能改已批准的计划和「禁止触碰的目录」', () => {
    toImplementing()
    assert.equal(gate('apps/api/src/a.ts'), 0)
    assert.equal(gate(doc('06-impl-log.md')), 0)
    assert.equal(gate('docs/adr/0003-x.md'), 0)
    assert.equal(gate(doc('02-plan.md')), 2)
    assert.equal(gate(doc('04-acceptance.md')), 2)
    assert.equal(gate('packages/db/drizzle/0001_x.sql'), 2)
  })

  it('verifying：只能写 04 与 07，不能改代码', () => {
    toVerifying()
    assert.equal(gate(doc('07-verify-report.md')), 0)
    assert.equal(gate(doc('04-acceptance.md')), 0)
    assert.equal(gate('apps/api/src/a.ts'), 2)
  })
})

describe('阶段推进', () => {
  it('submit requirement 拒绝未填写的模板', () => {
    ok(['init', 'demo'])
    const r = run(['submit', 'requirement'])
    assert.equal(r.code, 1)
    assert.match(r.out, /「用户故事」小节为空/)
  })

  it('approve 是人工闸门：Claude 执行会被拒绝', () => {
    ok(['init', 'demo'])
    write(doc('01-requirement.md'), REQUIREMENT)
    ok(['submit', 'requirement'])
    const r = run(['approve', 'requirement_review'])
    assert.equal(r.code, 1)
    assert.match(r.out, /CLAUDECODE=1/)
    assert.equal(state().stage, 'requirement_review')

    ok(['approve', 'requirement_review'], { human: true })
    assert.equal(state().stage, 'planning')
    assert.equal(state().metrics.open_questions, 1)
  })

  it('submit plan 做 AC ↔ TC 双向追溯检查', () => {
    ok(['init', 'demo'])
    write(doc('01-requirement.md'), REQUIREMENT)
    ok(['submit', 'requirement'])
    ok(['approve', 'requirement_review'], { human: true })
    write(doc('02-plan.md'), PLAN)
    write(doc('03-test-cases.md'), TEST_CASES('AC-02'))
    write(doc('04-acceptance.md'), ACCEPTANCE())
    const r = run(['submit', 'plan'])
    assert.equal(r.code, 1)
    assert.match(r.out, /TC-001 引用了不存在的 AC-02/)
    assert.match(r.out, /双向追溯不一致/)
  })

  it('reject 打回上一阶段并计入 human_interventions', () => {
    ok(['init', 'demo'])
    write(doc('01-requirement.md'), REQUIREMENT)
    ok(['submit', 'requirement'])
    ok(['reject', 'requirement_review', '范围不清'])
    assert.equal(state().stage, 'drafting')
    assert.equal(state().metrics.human_interventions, 1)
  })
})

describe('check-stop 与 verify 证据', () => {
  it('implementing 时没有新鲜的 verify 就阻断收工；stop_hook_active 时放行', () => {
    toImplementing()
    assert.equal(run(['check-stop']).code, 2)
    assert.equal(run(['check-stop'], { input: { stop_hook_active: true } }).code, 0)

    ok(['verify'])
    assert.equal(run(['check-stop']).code, 0)
    assert.match(
      fs.readFileSync(path.join(root, doc('06-impl-log.md')), 'utf8'),
      /### verify · .* · PASS/,
    )

    const later = Date.now() / 1000 + 5
    fs.utimesSync(path.join(root, 'apps/api/src/a.ts'), later, later)
    assert.equal(run(['check-stop']).code, 2)
  })

  it('verify 失败会被记录且不能 submit impl', () => {
    toImplementing()
    assert.equal(run(['verify'], { env: { SPEC_VERIFY_CMD: 'node -e "process.exit(3)"' } }).code, 1)
    assert.equal(state().lastVerify.ok, false)
    assert.equal(run(['submit', 'impl']).code, 1)
  })

  it('submit impl 要求 TC 落点文件存在且包含 TC-ID', () => {
    toImplementing()
    write(doc('06-impl-log.md'), '## 偏离与原因\n无\n')
    ok(['verify'])
    const r = run(['submit', 'impl'])
    assert.equal(r.code, 1)
    assert.match(r.out, /落点文件不存在：apps\/api\/src\/a.test.ts/)
  })
})

describe('验收与归档', () => {
  it('verdict fail 打回 implementing 并累计 ac_failed', () => {
    toVerifying()
    write(doc('04-acceptance.md'), ACCEPTANCE('❌', '断言失败'))
    write(doc('07-verify-report.md'), REPORT('FAIL', '❌'))
    ok(['verdict', 'fail'])
    const st = state()
    assert.equal(st.stage, 'implementing')
    assert.equal(st.gates.acceptance.status, 'failed')
    assert.equal(st.metrics.ac_failed, 1)
  })

  it('pass → 人工 approve acceptance → retro → 归档', () => {
    toVerifying()
    write(doc('04-acceptance.md'), ACCEPTANCE('✅', 'TC-001 通过'))
    write(doc('07-verify-report.md'), REPORT('PASS', '✅'))
    ok(['verdict', 'pass'])
    assert.equal(state().stage, 'verifying')
    assert.equal(run(['approve', 'acceptance']).code, 1)
    ok(['approve', 'acceptance'], { human: true })
    assert.equal(state().stage, 'retro')

    write(doc('08-retro.md'), '## 问题归因\n无，流程顺畅\n')
    const name = feature()
    ok(['submit', 'retro'])
    assert.equal(fs.existsSync(path.join(root, 'specs/.current')), false)
    const archived = state(`specs/archive/${name}`)
    assert.equal(archived.stage, 'done')
    assert.deepEqual(
      archived.history.map((h) => h.action),
      [
        'init',
        'submit requirement',
        'approve requirement_review',
        'submit plan',
        'approve plan_review',
        'submit impl',
        'verdict pass',
        'approve acceptance',
        'submit retro',
      ],
    )
  })
})
