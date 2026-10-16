#!/usr/bin/env node
// specs 交付流水线：状态机 + Claude Code hook 闸门（整个流程的硬核心）。
// 用法：pnpm spec <command>（不带参数查看帮助）。
// 作为 hook 调用时用退出码表达决策：0 = 放行，2 = 阻断（stderr 回传给 Claude）。
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.env.SPEC_ROOT ?? path.join(import.meta.dirname, '..'))
const SPECS = path.join(ROOT, 'specs')
const CURRENT = path.join(SPECS, '.current')
const TEMPLATE = path.join(SPECS, '_template')
const ARCHIVE = path.join(SPECS, 'archive')
// 只有测试（设置了 SPEC_ROOT）可以替换 verify 命令；真实仓库永远跑 pnpm verify
const VERIFY_CMD = (process.env.SPEC_ROOT && process.env.SPEC_VERIFY_CMD) || 'pnpm verify'
// Claude Code 会给它启动的 shell 设置 CLAUDECODE=1，借此区分人和模型
const IS_AGENT = process.env.CLAUDECODE === '1'
const ACTOR = IS_AGENT ? 'claude' : process.env.USER || 'human'

const STAGES = [
  'drafting',
  'requirement_review',
  'planning',
  'awaiting_approval',
  'implementing',
  'verifying',
  'retro',
  'done',
]

// 每个 stage 允许写的 feature 目录内文件（前缀匹配）
const STAGE_WRITES = {
  drafting: ['00-input/', '01-requirement.md'],
  requirement_review: ['00-input/', '01-requirement.md'],
  planning: ['01-requirement.md', '02-plan.md', '03-test-cases.md', '04-acceptance.md'],
  awaiting_approval: ['01-requirement.md', '02-plan.md', '03-test-cases.md', '04-acceptance.md'],
  implementing: ['06-impl-log.md'],
  verifying: ['04-acceptance.md', '07-verify-report.md'],
  retro: ['08-retro.md'],
  done: [],
}
const ADR_STAGES = new Set(['planning', 'awaiting_approval', 'implementing'])

// feature 进行中时模型不能改的流程配置：自改进只出提案（.claude/proposals/），由人合入
const HARNESS = [
  '.claude/settings.json',
  '.claude/hooks/',
  '.claude/rules/',
  '.claude/agents/',
  '.claude/commands/',
  '.claude/skills/',
  '.github/',
  'scripts/spec.mjs',
  'scripts/spec.test.mjs',
  'scripts/hooks.test.mjs',
  'specs/_template/',
]

const NEXT_STEP = {
  drafting: '/spec 产出 01-requirement.md → pnpm spec submit requirement',
  requirement_review:
    '人工审阅 01-requirement.md → 人在自己终端运行 pnpm spec approve requirement_review（或 reject）',
  planning: '/plan-feature 产出 02/03/04 → pnpm spec submit plan',
  awaiting_approval:
    '人工审阅 02/03/04 → 人在自己终端运行 pnpm spec approve plan_review（或 reject）',
  implementing: '/impl 按计划 TDD 实现 → pnpm spec verify → pnpm spec submit impl',
  verifying:
    '新会话 /verify 独立验收 → pnpm spec verdict pass|fail；通过后人工 pnpm spec approve acceptance',
  retro: '/retro 复盘 → pnpm spec submit retro（归档）',
  done: '已完成',
}

const GATE_RULES = {
  // gate: [要求的 stage, 批准后 stage, 打回后 stage]
  requirement_review: ['requirement_review', 'planning', 'drafting'],
  plan_review: ['awaiting_approval', 'implementing', 'planning'],
  acceptance: ['verifying', 'retro', 'implementing'],
}

const LEVELS = ['unit', 'integration', 'e2e', 'manual']
const PASS_RE = /^(✅|通过|pass)/i
const FAIL_RE = /^(❌|失败|fail)/i
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  '.turbo',
  'coverage',
  'test-results',
  'playwright-report',
  '.data',
  '.git',
])

// ---------------------------------------------------------------------------
// 基础工具
// ---------------------------------------------------------------------------

const read = (p) => fs.readFileSync(p, 'utf8')
const exists = (p) => fs.existsSync(p)
const now = () => new Date().toISOString()
const toPosix = (p) => p.split(path.sep).join('/')

function fail(message) {
  console.error(message)
  process.exit(1)
}

function block(message) {
  console.error(message)
  process.exit(2)
}

function readPayload() {
  if (process.stdin.isTTY) return {}
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}')
  } catch {
    return {}
  }
}

function currentFeature() {
  if (!exists(CURRENT)) return null
  return read(CURRENT).trim() || null
}

function resolveDir(arg) {
  if (!arg) {
    const feature = currentFeature()
    return feature ? path.join(SPECS, feature) : null
  }
  for (const dir of [path.resolve(ROOT, arg), path.join(SPECS, arg), path.join(ARCHIVE, arg)]) {
    if (exists(path.join(dir, '05-state.json'))) return dir
  }
  fail(`找不到 feature：${arg}`)
}

function open(arg) {
  const dir = resolveDir(arg)
  if (!dir) fail('当前没有激活的 feature（维护模式）。新需求：pnpm spec init <slug>')
  const file = (name) => path.join(dir, name)
  const ctx = {
    dir,
    name: path.basename(dir),
    file,
    st: JSON.parse(read(file('05-state.json'))),
    save: () => fs.writeFileSync(file('05-state.json'), JSON.stringify(ctx.st, null, 2) + '\n'),
  }
  if (!STAGES.includes(ctx.st.stage))
    fail(`${ctx.name}/05-state.json 的 stage 非法：${ctx.st.stage}`)
  return ctx
}

function transition(ctx, to, action, note) {
  const from = ctx.st.stage
  ctx.st.stage = to
  ctx.st.history.push({ at: now(), by: ACTOR, action, from, to, ...(note ? { note } : {}) })
}

function expectStage(ctx, ...stages) {
  if (!stages.includes(ctx.st.stage)) {
    fail(
      `当前 stage=${ctx.st.stage}，该操作要求 stage ∈ {${stages.join(', ')}}。\n下一步：${NEXT_STEP[ctx.st.stage]}`,
    )
  }
}

function humanOnly() {
  if (!IS_AGENT) return
  fail(
    `这是人工闸门命令，只能由人在自己的终端执行（检测到 CLAUDECODE=1）。\n` +
      `请把需要审阅的要点告诉用户，并提示其运行：pnpm spec ${process.argv.slice(2).join(' ')}`,
  )
}

// ---------------------------------------------------------------------------
// Markdown 解析（只解析模板约定的结构：## 小节 + 管道表格）
// ---------------------------------------------------------------------------

const stripComments = (md) => md.replace(/<!--[\s\S]*?-->/g, '')
const isSeparator = (line) => /^\|(\s*:?-{3,}:?\s*\|)+$/.test(line.trim())
const splitRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
const squash = (s) => s.replace(/\s/g, '')

/** 返回标题含 keyword 的小节正文（到下一个同级或更高级标题为止），不存在返回 null */
function section(md, keyword) {
  const lines = stripComments(md).split('\n')
  const start = lines.findIndex((l) => /^#{2,3}\s/.test(l) && l.includes(keyword))
  if (start === -1) return null
  const level = lines[start].match(/^#+/)[0].length
  const end = lines.findIndex(
    (l, i) => i > start && /^#+\s/.test(l) && l.match(/^#+/)[0].length <= level,
  )
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n')
}

/** 有实际内容的行：去掉空行、表头行与分隔行 */
function meaningfulLines(text) {
  if (text === null) return []
  const lines = text.split('\n').map((l) => l.trim())
  return lines.filter((l, i) => l && !isSeparator(l) && !isSeparator(lines[i + 1] ?? ''))
}

function tables(md) {
  const lines = stripComments(md).split('\n')
  const out = []
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].trim().startsWith('|') || !isSeparator(lines[i + 1])) continue
    const table = { header: splitRow(lines[i]), rows: [] }
    let j = i + 2
    for (; j < lines.length && lines[j].trim().startsWith('|'); j++)
      table.rows.push(splitRow(lines[j]))
    out.push(table)
    i = j - 1
  }
  return out
}

const findTable = (md, ...headers) =>
  tables(md).find((t) => headers.every((h) => t.header.some((c) => squash(c).includes(squash(h)))))
const cell = (table, row, name) =>
  row[table.header.findIndex((c) => squash(c).includes(squash(name)))] ?? ''

/** 自动化落点：取第一个反引号里的路径，允许 `path::测试名` */
const targetPath = (text) =>
  text
    .match(/`([^`]+)`/)?.[1]
    ?.split('::')[0]
    .trim() ?? null

function forbiddenPaths(planFile) {
  if (!exists(planFile)) return []
  const text = section(read(planFile), '禁止触碰')
  if (!text) return []
  return [...text.matchAll(/`([^`]+)`/g)]
    .map((m) =>
      m[1]
        .trim()
        .replace(/^\.\//, '')
        .replace(/\/\*+$/, '')
        .replace(/\/$/, ''),
    )
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// 追溯检查：AC ↔ TC 双向覆盖，TC → 真实测试文件
// ---------------------------------------------------------------------------

function trace(ctx, { files = false } = {}) {
  const errors = []
  const acTable = findTable(read(ctx.file('04-acceptance.md')), 'AC-ID')
  const tcTable = findTable(read(ctx.file('03-test-cases.md')), 'TC-ID')
  if (!acTable) errors.push('04-acceptance.md 缺少 AC 表格（表头含 AC-ID）')
  if (!tcTable) errors.push('03-test-cases.md 缺少 TC 表格（表头含 TC-ID）')
  if (errors.length) return { errors, acs: [], tcs: [] }

  const acs = acTable.rows
    .filter((r) => /^AC-\d+$/.test(r[0]))
    .map((r) => ({
      id: r[0],
      tcRefs: cell(acTable, r, '对应TC').match(/TC-\d+/g) ?? [],
      result: cell(acTable, r, '结果'),
      evidence: cell(acTable, r, '证据'),
    }))
  const tcs = tcTable.rows
    .filter((r) => /^TC-\d+$/.test(r[0]))
    .map((r) => ({
      id: r[0],
      acRefs: cell(tcTable, r, '对应AC').match(/AC-\d+/g) ?? [],
      level: cell(tcTable, r, '层级').toLowerCase(),
      target: targetPath(cell(tcTable, r, '自动化落点')),
    }))

  if (!acs.length) errors.push('04-acceptance.md 没有任何 AC 行（ID 形如 AC-01）')
  if (!tcs.length) errors.push('03-test-cases.md 没有任何 TC 行（ID 形如 TC-001）')
  for (const [kind, list] of [
    ['AC', acs],
    ['TC', tcs],
  ]) {
    const seen = new Set()
    for (const { id } of list) {
      if (seen.has(id)) errors.push(`${kind} 编号重复：${id}`)
      seen.add(id)
    }
  }

  const acById = new Map(acs.map((a) => [a.id, a]))
  const tcById = new Map(tcs.map((t) => [t.id, t]))
  for (const tc of tcs) {
    if (!tc.acRefs.length) errors.push(`${tc.id} 未关联任何 AC`)
    for (const ref of tc.acRefs) if (!acById.has(ref)) errors.push(`${tc.id} 引用了不存在的 ${ref}`)
    if (!LEVELS.includes(tc.level))
      errors.push(`${tc.id} 层级「${tc.level}」应为 ${LEVELS.join('/')}`)
    if (tc.level === 'manual') continue
    if (!tc.target) {
      errors.push(`${tc.id} 缺少自动化落点（用反引号写测试文件路径），无法自动化请标 manual`)
    } else if (files) {
      const abs = path.join(ROOT, tc.target)
      if (!exists(abs)) errors.push(`${tc.id} 落点文件不存在：${tc.target}`)
      else if (!read(abs).includes(tc.id))
        errors.push(`${tc.id} 落点文件 ${tc.target} 中没有以 ${tc.id} 命名的测试`)
    }
  }
  for (const ac of acs) {
    const covering = tcs.filter((t) => t.acRefs.includes(ac.id)).map((t) => t.id)
    if (!covering.length && !ac.tcRefs.length) errors.push(`${ac.id} 没有任何 TC 覆盖`)
    for (const ref of ac.tcRefs) {
      if (!tcById.has(ref)) errors.push(`${ac.id} 引用了不存在的 ${ref}`)
      else if (!tcById.get(ref).acRefs.includes(ac.id))
        errors.push(`双向追溯不一致：${ac.id} 列出 ${ref}，但 ${ref} 的「对应 AC」没有 ${ac.id}`)
    }
  }
  return { errors, acs, tcs }
}

function failWith(title, errors) {
  if (errors.length) fail(`${title}\n${errors.map((e) => `  - ${e}`).join('\n')}`)
}

// ---------------------------------------------------------------------------
// verify 证据与新鲜度
// ---------------------------------------------------------------------------

function latestSourceMtime() {
  let max = 0
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(p)
      } else if (!/\.tsbuildinfo$|^next-env\.d\.ts$/.test(entry.name)) {
        max = Math.max(max, fs.lstatSync(p).mtimeMs)
      }
    }
  }
  for (const dir of ['apps', 'packages'])
    if (exists(path.join(ROOT, dir))) walk(path.join(ROOT, dir))
  return max
}

const verifyFresh = (st) =>
  Boolean(st.lastVerify?.ok) && st.lastVerify.finishedAtMs >= latestSourceMtime()

const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*[A-Za-z]', 'g')

async function runVerify() {
  const ctx = currentFeature() ? open() : null
  const started = Date.now()
  console.log(`$ ${VERIFY_CMD}`)
  const child = spawn(VERIFY_CMD, {
    cwd: ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  })
  let output = ''
  for (const [stream, target] of [
    [child.stdout, process.stdout],
    [child.stderr, process.stderr],
  ]) {
    stream.on('data', (chunk) => {
      output += chunk
      target.write(chunk)
    })
  }
  const exitCode = await new Promise((resolve) => child.on('close', resolve))
  const ok = exitCode === 0
  const durationMs = Date.now() - started

  if (ctx) {
    ctx.st.lastVerify = { at: now(), ok, exitCode, durationMs, finishedAtMs: Date.now() }
    if (ctx.st.stage === 'implementing') {
      const tail = output.replace(ANSI, '').trimEnd().split('\n').slice(-25).join('\n')
      const entry = `\n### verify · ${now()} · ${ok ? 'PASS' : `FAIL (exit ${exitCode})`} · ${Math.round(durationMs / 1000)}s\n\n\`\`\`text\n$ ${VERIFY_CMD}\n${tail}\n\`\`\`\n`
      fs.appendFileSync(ctx.file('06-impl-log.md'), entry)
    }
    ctx.save()
  }
  console.log(
    ok ? '\n✔ verify 通过（已记录到 05-state.json）' : `\n✖ verify 失败（exit ${exitCode}）`,
  )
  process.exit(ok ? 0 : 1)
}

// ---------------------------------------------------------------------------
// hooks
// ---------------------------------------------------------------------------

/** PreToolUse(Edit|Write)：返回 null 表示放行，否则返回阻断原因 */
function decideWrite(rel) {
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null
  if (rel === 'specs/.current' || /^specs\/(archive\/)?[^/]+\/05-state\.json$/.test(rel)) {
    return '状态文件只能通过 pnpm spec <command> 修改'
  }
  if (rel.startsWith('specs/archive/')) return 'specs/archive/ 下是已完成的 feature，只读'

  const feature = currentFeature()
  const inSpecs = rel.match(/^specs\/([^/]+)\/(.+)$/)
  if (inSpecs && inSpecs[1] !== '_template' && inSpecs[1] !== feature) {
    return `specs/${inSpecs[1]} 不是当前 feature（当前：${feature ?? '无'}）`
  }
  if (!feature) return null // 维护模式

  let stage
  try {
    stage = JSON.parse(read(path.join(SPECS, feature, '05-state.json'))).stage
  } catch {
    return `specs/.current 指向 ${feature}，但其 05-state.json 不可读；请人工修复或运行 pnpm spec pause`
  }

  const harness =
    HARNESS.some((p) => rel === p || (p.endsWith('/') && rel.startsWith(p))) ||
    /(^|\/)(CLAUDE|AGENTS)\.md$/.test(rel)
  if (harness) {
    return `feature 进行中（stage=${stage}）禁止修改流程配置 ${rel}。改进建议请写到 .claude/proposals/，由人审后合入`
  }
  if (rel.startsWith('.claude/proposals/')) return null

  if (inSpecs) {
    const allowed = STAGE_WRITES[stage] ?? []
    const ok = allowed.some(
      (p) => inSpecs[2] === p || (p.endsWith('/') && inSpecs[2].startsWith(p)),
    )
    return ok
      ? null
      : `stage=${stage} 只允许写 ${allowed.join('、') || '（无）'}，不能写 ${inSpecs[2]}。下一步：${NEXT_STEP[stage]}`
  }
  if (rel.startsWith('docs/adr/') && ADR_STAGES.has(stage)) return null
  if (stage !== 'implementing') {
    return `stage=${stage}，未经人工批准 plan_review 不能修改代码（${rel}）。下一步：${NEXT_STEP[stage]}`
  }
  const hit = forbiddenPaths(path.join(SPECS, feature, '02-plan.md')).find(
    (p) => rel === p || rel.startsWith(`${p}/`),
  )
  if (hit) {
    return `${rel} 属于 02-plan.md「禁止触碰的目录」（${hit}）。确需修改：先在 06-impl-log.md「偏离与原因」记录，并请用户确认`
  }
  return null
}

function checkWrite() {
  const payload = readPayload()
  const target = payload.tool_input?.file_path ?? payload.tool_input?.notebook_path
  if (!target) process.exit(0)
  const rel = toPosix(path.relative(ROOT, path.resolve(payload.cwd ?? ROOT, target)))
  const reason = decideWrite(rel)
  if (reason) block(`Blocked by spec gate：${reason}`)
  process.exit(0)
}

/** Stop：implementing 阶段没有新鲜且通过的 verify 就不许收工 */
function checkStop() {
  const payload = readPayload()
  if (payload.stop_hook_active) process.exit(0) // 防死循环：已经被拦过一次就放行
  const feature = currentFeature()
  if (!feature) process.exit(0)
  let st
  try {
    st = JSON.parse(read(path.join(SPECS, feature, '05-state.json')))
  } catch {
    process.exit(0)
  }
  if (st.stage === 'implementing' && !verifyFresh(st)) {
    const why = !st.lastVerify
      ? '还没有运行过'
      : !st.lastVerify.ok
        ? '最近一次失败'
        : '之后又修改了代码'
    block(
      `Stop blocked：stage=implementing，pnpm spec verify ${why}。\n` +
        `请运行 pnpm spec verify（Bash timeout 设 600000），它会执行 pnpm verify 并把结果写入 06-impl-log.md。\n` +
        `如果确实要中途停下，先在 06-impl-log.md「进度」记录当前状态与下一步。`,
    )
  }
  process.exit(0)
}

function describeWrites(feature, stage) {
  if (stage === 'implementing') {
    return `业务代码 + specs/${feature}/06-impl-log.md + docs/adr/（02-plan.md「禁止触碰的目录」除外）`
  }
  const files = STAGE_WRITES[stage].map((f) => `specs/${feature}/${f}`)
  if (ADR_STAGES.has(stage)) files.push('docs/adr/')
  return files.join('、') || '（无）'
}

/** SessionStart：把当前流程状态注入新会话上下文 */
function context() {
  const feature = currentFeature()
  if (!feature) {
    console.log(
      '[spec] 当前没有激活的 feature（维护模式：写操作不受 stage 闸门限制）。新需求：pnpm spec init <slug>，再把 PRD/设计稿放进 00-input/ 后运行 /spec。',
    )
    return
  }
  let st
  try {
    st = JSON.parse(read(path.join(SPECS, feature, '05-state.json')))
  } catch {
    console.log(
      `[spec] 警告：specs/.current=${feature}，但 05-state.json 不可读，所有写操作会被阻断。`,
    )
    return
  }
  const lines = [
    `[spec] 当前 feature：specs/${feature}（stage=${st.stage}）`,
    `[spec] 本阶段允许写：${describeWrites(feature, st.stage)}`,
    `[spec] 下一步：${NEXT_STEP[st.stage]}`,
  ]
  if (st.stage === 'implementing' && st.gates.acceptance.status === 'failed') {
    lines.push('[spec] 上一轮验收失败：先读 07-verify-report.md「需回灌实现的问题」再动手')
  }
  console.log(lines.join('\n'))
}

// ---------------------------------------------------------------------------
// 命令
// ---------------------------------------------------------------------------

function localDate() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function init(slug) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug ?? ''))
    fail('用法：pnpm spec init <slug>（小写字母、数字、连字符）')
  const active = currentFeature()
  if (active) fail(`已有进行中的 feature：${active}。先走完流程，或由人运行 pnpm spec pause 暂停它`)
  const date = localDate()
  const name = `${date}-${slug}`
  const dir = path.join(SPECS, name)
  if (exists(dir)) fail(`已存在：specs/${name}`)

  fs.cpSync(TEMPLATE, dir, { recursive: true })
  const walk = (d) =>
    fs
      .readdirSync(d, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
  for (const file of walk(dir)) {
    const text = read(file)
    const replaced = text
      .replaceAll('{{SLUG}}', slug)
      .replaceAll('{{DATE}}', date)
      .replaceAll('{{DIR}}', name)
    if (replaced !== text) fs.writeFileSync(file, replaced)
  }
  fs.writeFileSync(CURRENT, `${name}\n`)
  const ctx = open()
  ctx.st.history.push({ at: now(), by: ACTOR, action: 'init', to: 'drafting' })
  ctx.save()

  const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  const onMain = ['main', 'master'].includes(branch.stdout?.trim())
  console.log(`✔ 已创建 specs/${name}（已设为当前 feature，stage=drafting）
下一步：
  1. 把原始需求写进 specs/${name}/00-input/prd.md，设计稿截图放进 00-input/design/
  2. 在 Claude Code 里运行 /spec${onMain ? `\n提示：你在 ${branch.stdout.trim()} 分支上。建议改在 worktree 中进行：\n  git worktree add ../${path.basename(ROOT)}-${slug} -b feature/${slug}` : ''}`)
}

function submit(what) {
  const ctx = open()
  if (what === 'requirement') {
    expectStage(ctx, 'drafting')
    const md = read(ctx.file('01-requirement.md'))
    const errors = []
    for (const key of ['用户故事', '范围外', '假设', '开放问题', '异常态', '非功能', 'UI 规格']) {
      const text = section(md, key)
      if (text === null) errors.push(`缺少「${key}」小节`)
      else if (!meaningfulLines(text).length)
        errors.push(`「${key}」小节为空（不适用请写"不适用 + 原因"）`)
    }
    const oq = findTable(md, 'ID', '默认选择')
    const questions = oq ? oq.rows.filter((r) => /^OQ-\d+/.test(r[0])) : []
    for (const r of questions) if (!cell(oq, r, '默认选择')) errors.push(`${r[0]} 没有给出默认选择`)
    failWith('01-requirement.md 未通过检查：', errors)

    ctx.st.metrics.open_questions = questions.length
    ctx.st.gates.requirement_review.status = 'in_review'
    transition(ctx, 'requirement_review', 'submit requirement')
    ctx.save()
    console.log(`✔ 需求已提交审阅（${questions.length} 个开放问题）。
请用户审阅 01-requirement.md、在「结论」列答复开放问题，然后在自己终端运行：
  pnpm spec approve requirement_review     或     pnpm spec reject requirement_review "原因"`)
    return
  }

  if (what === 'plan') {
    expectStage(ctx, 'planning')
    const plan = read(ctx.file('02-plan.md'))
    const errors = []
    for (const key of ['目标', '改动文件清单', '实施顺序', '禁止触碰', '回滚']) {
      if (!meaningfulLines(section(plan, key)).length) errors.push(`02-plan.md「${key}」为空`)
    }
    const { errors: traceErrors, acs, tcs } = trace(ctx)
    failWith('计划三件套未通过检查：', [...errors, ...traceErrors])

    ctx.st.gates.plan_review.status = 'in_review'
    transition(ctx, 'awaiting_approval', 'submit plan')
    ctx.save()
    console.log(`✔ 计划已提交审阅（${acs.length} 条 AC / ${tcs.length} 条 TC，追溯完整）。
请用户审阅 02-plan.md / 03-test-cases.md / 04-acceptance.md（可删掉不做的 TC），然后在自己终端运行：
  pnpm spec approve plan_review     或     pnpm spec reject plan_review "原因"`)
    return
  }

  if (what === 'impl') {
    expectStage(ctx, 'implementing')
    if (!verifyFresh(ctx.st)) {
      fail(
        '需要一次通过且新鲜的 pnpm spec verify（verify 之后不能再改代码）。先运行 pnpm spec verify',
      )
    }
    const { errors } = trace(ctx, { files: true })
    const log = read(ctx.file('06-impl-log.md'))
    const deviations = section(log, '偏离与原因')
    if (!meaningfulLines(deviations).length)
      errors.push('06-impl-log.md「偏离与原因」为空：没有偏离请写"无"')
    failWith('实现未通过检查：', errors)

    const table = findTable(log, '原计划')
    ctx.st.metrics.plan_deviations = table
      ? table.rows.filter((r) => /^D-\d+/.test(r[0])).length
      : 0
    ctx.st.gates.acceptance.status = 'in_review'
    transition(ctx, 'verifying', 'submit impl')
    ctx.save()
    console.log('✔ 实现已提交验收。请开一个新会话运行 /verify（独立上下文验收）')
    return
  }

  if (what === 'retro') {
    expectStage(ctx, 'retro')
    const retro = read(ctx.file('08-retro.md'))
    if (!meaningfulLines(section(retro, '问题归因')).length) {
      fail('08-retro.md「问题归因」为空：没有问题也请写明"无"并说明原因')
    }
    transition(ctx, 'done', 'submit retro')
    ctx.save()
    fs.mkdirSync(ARCHIVE, { recursive: true })
    fs.renameSync(ctx.dir, path.join(ARCHIVE, ctx.name))
    fs.rmSync(CURRENT, { force: true })
    console.log(`✔ ${ctx.name} 已完成并归档到 specs/archive/，已退出当前 feature（维护模式）`)
    return
  }

  fail('用法：pnpm spec submit requirement|plan|impl|retro')
}

function verdict(kind) {
  if (kind !== 'pass' && kind !== 'fail') fail('用法：pnpm spec verdict pass|fail')
  const ctx = open()
  expectStage(ctx, 'verifying')
  const report = read(ctx.file('07-verify-report.md'))
  if (!meaningfulLines(section(report, '结论')).length) fail('07-verify-report.md「结论」为空')
  const { errors, acs } = trace(ctx)
  failWith('追溯检查失败：', errors)
  const missing = acs.filter((a) => !report.includes(a.id)).map((a) => a.id)
  if (missing.length) fail(`07-verify-report.md 未逐条给出结论：${missing.join(', ')}`)

  const failed = acs.filter((a) => FAIL_RE.test(a.result))
  ctx.st.metrics.verify_rounds += 1
  if (kind === 'pass') {
    const unresolved = acs.filter((a) => !PASS_RE.test(a.result)).map((a) => a.id)
    if (unresolved.length)
      fail(`不能判定通过：04-acceptance.md 中 ${unresolved.join(', ')} 的「结果」不是 ✅`)
    const noEvidence = acs.filter((a) => !a.evidence).map((a) => a.id)
    if (noEvidence.length) fail(`不能判定通过：${noEvidence.join(', ')} 缺少「证据」`)
    ctx.st.gates.acceptance = { status: 'verified', by: ACTOR, at: now() }
    ctx.st.history.push({ at: now(), by: ACTOR, action: 'verdict pass' })
    ctx.save()
    console.log(`✔ 验收判定通过。请用户审阅 07-verify-report.md，然后在自己终端运行：
  pnpm spec approve acceptance     或     pnpm spec reject acceptance "原因"`)
    return
  }
  if (!failed.length) fail('判定失败时，04-acceptance.md 中至少要有一条 AC 的「结果」为 ❌')
  ctx.st.metrics.ac_failed += failed.length
  ctx.st.gates.acceptance = { status: 'failed', by: ACTOR, at: now() }
  transition(ctx, 'implementing', 'verdict fail', failed.map((a) => a.id).join(', '))
  ctx.save()
  console.log(`✖ 验收未通过（${failed.map((a) => a.id).join(', ')}），已打回 implementing。
请开新会话运行 /impl，先修复 07-verify-report.md「需回灌实现的问题」。`)
}

function approve(gate) {
  humanOnly()
  const rule = GATE_RULES[gate]
  if (!rule) fail(`用法：pnpm spec approve ${Object.keys(GATE_RULES).join('|')}`)
  const ctx = open()
  expectStage(ctx, rule[0])
  const force = process.argv.includes('--force')

  if (gate === 'requirement_review') {
    const oq = findTable(read(ctx.file('01-requirement.md')), 'ID', '默认选择')
    const unanswered = oq ? oq.rows.filter((r) => /^OQ-\d+/.test(r[0]) && !cell(oq, r, '结论')) : []
    if (unanswered.length)
      console.log(
        `⚠ 以下开放问题没有结论，将按默认选择执行：${unanswered.map((r) => r[0]).join(', ')}`,
      )
  }
  if (gate === 'plan_review') failWith('追溯检查失败（审阅时改过文档？）：', trace(ctx).errors)
  if (gate === 'acceptance' && ctx.st.gates.acceptance.status !== 'verified') {
    if (!force)
      fail('verifier 尚未判定通过（gates.acceptance.status 不是 verified）。确认跳过请加 --force')
    ctx.st.metrics.human_interventions += 1
  }

  ctx.st.gates[gate] = { status: 'approved', by: ACTOR, at: now() }
  transition(ctx, rule[1], `approve ${gate}`, force ? 'forced' : undefined)
  ctx.save()
  console.log(`✔ ${gate} 已批准 → stage=${rule[1]}\n下一步：${NEXT_STEP[rule[1]]}`)
}

function reject(gate, reason) {
  const rule = GATE_RULES[gate]
  if (!rule) fail(`用法：pnpm spec reject ${Object.keys(GATE_RULES).join('|')} "原因"`)
  if (!reason) fail(`请写明打回原因：pnpm spec reject ${gate} "原因"`)
  const ctx = open()
  expectStage(ctx, rule[0])
  ctx.st.gates[gate] = { status: 'rejected', by: ACTOR, at: now(), reason }
  ctx.st.metrics.human_interventions += 1
  transition(ctx, rule[2], `reject ${gate}`, reason)
  ctx.save()
  console.log(`✔ 已打回 → stage=${rule[2]}（原因：${reason}）\n下一步：${NEXT_STEP[rule[2]]}`)
}

function use(name) {
  humanOnly()
  if (!name || !exists(path.join(SPECS, name, '05-state.json')))
    fail('用法：pnpm spec use <specs 下的 feature 目录名>')
  fs.writeFileSync(CURRENT, `${name}\n`)
  console.log(`✔ 当前 feature：${name}`)
}

function pause() {
  humanOnly()
  const feature = currentFeature()
  if (!feature) fail('当前没有激活的 feature')
  fs.rmSync(CURRENT)
  console.log(`✔ 已暂停 ${feature}，进入维护模式（恢复：pnpm spec use ${feature}）`)
}

function status(arg, asJson) {
  if (!arg && !currentFeature()) {
    console.log('当前没有激活的 feature（维护模式）。新需求：pnpm spec init <slug>')
    return
  }
  const ctx = open(arg)
  const { st } = ctx
  if (asJson) {
    console.log(JSON.stringify(st, null, 2))
    return
  }
  const v = st.lastVerify
  console.log(
    [
      `feature   ${toPosix(path.relative(ROOT, ctx.dir))}`,
      `stage     ${st.stage}`,
      `gates     ${Object.entries(st.gates)
        .map(([g, s]) => `${g}=${s.status}`)
        .join('  ')}`,
      `verify    ${v ? `${v.ok ? 'PASS' : 'FAIL'} @ ${v.at}${st.stage === 'implementing' && !verifyFresh(st) ? '（已过期）' : ''}` : '未运行'}`,
      `metrics   ${Object.entries(st.metrics)
        .map(([k, n]) => `${k}=${n}`)
        .join('  ')}`,
      `next      ${NEXT_STEP[st.stage]}`,
    ].join('\n'),
  )
}

function listFeatures() {
  const dirs = (base) =>
    exists(base)
      ? fs
          .readdirSync(base, { withFileTypes: true })
          .filter((e) => e.isDirectory() && e.name !== '_template')
          .filter((e) => exists(path.join(base, e.name, '05-state.json')))
          .map((e) => path.join(base, e.name))
      : []
  return [...dirs(ARCHIVE), ...dirs(SPECS)]
}

function list() {
  const current = currentFeature()
  const rows = listFeatures().map((dir) => {
    const st = JSON.parse(read(path.join(dir, '05-state.json')))
    const mark = path.basename(dir) === current ? '*' : ' '
    return `${mark} ${toPosix(path.relative(SPECS, dir)).padEnd(44)} ${st.stage}`
  })
  console.log(rows.join('\n') || '（没有 feature）')
}

function metrics() {
  const keys = [
    'open_questions',
    'plan_deviations',
    'ac_failed',
    'verify_rounds',
    'human_interventions',
  ]
  console.log(`| feature | ${keys.join(' | ')} |\n|---|${keys.map(() => '---').join('|')}|`)
  for (const dir of listFeatures()) {
    const st = JSON.parse(read(path.join(dir, '05-state.json')))
    console.log(`| ${path.basename(dir)} | ${keys.map((k) => st.metrics[k] ?? '-').join(' | ')} |`)
  }
}

function checkTrace(arg, files) {
  const ctx = open(arg)
  const { errors, acs, tcs } = trace(ctx, { files })
  failWith(`✖ ${ctx.name} 追溯检查失败：`, errors)
  console.log(
    `✔ ${ctx.name}：${acs.length} 条 AC / ${tcs.length} 条 TC，追溯完整${files ? '，落点文件均存在且包含 TC-ID' : ''}`,
  )
}

const HELP = `pnpm spec <command>

流程（Claude 可执行）
  init <slug>                  从 specs/_template 创建 feature 并设为当前
  submit requirement|plan|impl|retro
                               校验本阶段产物并推进到下一 stage
  verify                       运行 pnpm verify，记录证据（implementing 时追加到 06-impl-log.md）
  verdict pass|fail            verifier 给出验收判定
  reject <gate> "原因"          打回某个闸门（计入 human_interventions）

人工闸门（只能由人在自己的终端执行）
  approve <gate> [--force]     gate = requirement_review | plan_review | acceptance
  use <dir>                    切换当前 feature
  pause                        退出当前 feature（维护模式）

查询
  status [dir] [--json]        当前状态与下一步
  list                         所有 feature 与 stage
  metrics                      各 feature 的流程度量（看趋势）
  check-trace [dir] [--files]  AC ↔ TC 追溯检查（--files 额外检查测试落点）

Hooks（由 .claude/settings.json 调用）
  context | check-write | check-stop`

// ---------------------------------------------------------------------------

const [cmd, ...rest] = process.argv.slice(2)
const flags = new Set(rest.filter((a) => a.startsWith('--')))
const args = rest.filter((a) => !a.startsWith('--'))

switch (cmd) {
  case 'init':
    init(args[0])
    break
  case 'submit':
    submit(args[0])
    break
  case 'verify':
    await runVerify()
    break
  case 'verdict':
    verdict(args[0])
    break
  case 'approve':
    approve(args[0])
    break
  case 'reject':
    reject(args[0], args.slice(1).join(' '))
    break
  case 'use':
    use(args[0])
    break
  case 'pause':
    pause()
    break
  case 'status':
    status(args[0], flags.has('--json'))
    break
  case 'list':
    list()
    break
  case 'metrics':
    metrics()
    break
  case 'check-trace':
    checkTrace(args[0], flags.has('--files'))
    break
  case 'context':
    context()
    break
  case 'check-write':
    checkWrite()
    break
  case 'check-stop':
    checkStop()
    break
  default:
    console.log(HELP)
    if (cmd && cmd !== 'help') process.exit(1)
}
