#!/usr/bin/env node
// PreToolUse(Bash) 守卫：拦截高危命令，以及通过 shell 绕过 specs 闸门的命令。exit 2 = 阻断。
// 这是防"顺手"和误操作的护栏，不是安全边界；权限边界在 .claude/settings.json 的 permissions。
import fs from 'node:fs'
import path from 'node:path'

let payload = {}
try {
  payload = JSON.parse(fs.readFileSync(0, 'utf8') || '{}')
} catch {
  process.exit(0)
}
const cmd = payload.tool_input?.command ?? ''
if (!cmd) process.exit(0)

function block(reason) {
  console.error(
    `Blocked by guard-bash：${reason}\n命令：${cmd}\n如确需执行，请说明原因并让用户在自己的终端手动运行。`,
  )
  process.exit(2)
}

const RULES = [
  [/\bgit\s+push\b[^;&|]*\s(--force\b|-f\b|--force-with-lease\b)/, 'git push --force'],
  [/\bgit\s+reset\s+--hard\b/, 'git reset --hard 会丢弃未提交的改动'],
  [/\bgit\s+clean\s+-[a-zA-Z]*f/, 'git clean -f 会删除未跟踪文件'],
  [/\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/, '整体丢弃工作区改动'],
  [/--no-verify\b/, '--no-verify 会跳过 git hooks'],
  [/\b(drop\s+(table|database|schema)|truncate\s+table)\b/i, '破坏性 SQL'],
  [
    /\bdrizzle-kit\s+(push|drop)\b/,
    'drizzle-kit push/drop 会绕过可审阅的迁移文件，请用 pnpm db:generate',
  ],
  [/\bspec(\.mjs)?["']?\s+(approve|use|pause)\b/, 'approve/use/pause 是人工闸门，只能由人执行'],
  [
    /\b(SPEC_ROOT|SPEC_VERIFY_CMD|CLAUDECODE)=|\bunset\s+CLAUDECODE\b|\benv\s+-u\s*CLAUDECODE\b/,
    '不允许覆盖流程状态机依赖的环境变量',
  ],
]
for (const [pattern, reason] of RULES) if (pattern.test(cmd)) block(reason)

// rm -rf：只放行构建产物目录
const SAFE_RM =
  /^(\.\/)?([\w.@-]+\/)*(node_modules|\.next|dist|\.turbo|coverage|test-results|playwright-report|\.data)\/?$/
for (const m of cmd.matchAll(/\brm\s+((?:-{1,2}[a-zA-Z-]+\s+)+)([^;&|]*)/g)) {
  const opts = m[1]
  const recursive = /(^|\s)-[a-zA-Z]*[rR]|--recursive/.test(opts)
  const force = /(^|\s)-[a-zA-Z]*f|--force/.test(opts)
  if (!recursive || !force) continue
  const targets = m[2]
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/^['"]|['"]$/g, ''))
  if (!targets.length || targets.some((t) => !SAFE_RM.test(t))) {
    block(
      'rm -rf 只允许删除构建产物目录（node_modules / .next / dist / .turbo / coverage / test-results / .data）',
    )
  }
}

// 状态文件只能经 pnpm spec 修改：拦截写向状态文件的命令；只读访问（cat、2>/dev/null）放行
const root = process.env.CLAUDE_PROJECT_DIR ?? payload.cwd ?? process.cwd()
const STATE = String.raw`\S*(05-state\.json|specs/\.current)`
const mentionsState = new RegExp(STATE).test(cmd)
const writesState =
  new RegExp(String.raw`>{1,2}\s*['"]?${STATE}`).test(cmd) ||
  new RegExp(
    String.raw`\b(tee|sed\s+-i|perl\s+-[a-z]*i|mv|cp|rm|truncate|ln)\b[^;&|]*${STATE}`,
  ).test(cmd) ||
  (/\b(python3?|node|perl|ruby)\b/.test(cmd) &&
    /(writeFile|appendFile|write_text|\.write\(|open\()/.test(cmd))
if (mentionsState && writesState) block('状态文件只能通过 pnpm spec <command> 修改')

// 非 implementing 阶段：不允许用 shell 写 apps/ 或 packages/（Edit/Write 已由 check-write 拦截）
let stage = null
try {
  const feature = fs.readFileSync(path.join(root, 'specs/.current'), 'utf8').trim()
  if (feature)
    stage = JSON.parse(
      fs.readFileSync(path.join(root, 'specs', feature, '05-state.json'), 'utf8'),
    ).stage
} catch {
  stage = null
}
if (stage && stage !== 'implementing') {
  const code = String.raw`['"]?(\./)?(apps|packages)/`
  const writes = [
    new RegExp(String.raw`>{1,2}\s*${code}`),
    new RegExp(String.raw`\btee\s+(-a\s+)?${code}`),
    new RegExp(String.raw`\b(sed\s+-i|perl\s+-[a-z]*i)\b[^;&|]*\s${code}`),
    new RegExp(String.raw`\b(mv|cp)\b[^;&|]*\s${code}`),
  ]
  if (writes.some((re) => re.test(cmd)))
    block(`stage=${stage} 不允许修改代码（包括通过 shell 写 apps/ 或 packages/）`)
}

process.exit(0)
