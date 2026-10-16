#!/usr/bin/env node
// PostToolUse(Edit|Write)：用 prettier 格式化刚改过的文件。格式化失败不阻断（始终 exit 0）。
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

let payload = {}
try {
  payload = JSON.parse(fs.readFileSync(0, 'utf8') || '{}')
} catch {
  process.exit(0)
}

const file = payload.tool_input?.file_path
const root = process.env.CLAUDE_PROJECT_DIR ?? payload.cwd ?? process.cwd()
const prettier = path.join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs')

if (!file || !fs.existsSync(file) || !fs.existsSync(prettier)) process.exit(0)
const rel = path.relative(root, path.resolve(root, file))
if (rel.startsWith('..') || path.isAbsolute(rel) || rel.includes('node_modules')) process.exit(0)
if (!/\.([cm]?[jt]sx?|json|css|md|ya?ml)$/.test(file)) process.exit(0)

// 直接调用 prettier 的 bin（比 pnpm exec 快）；.prettierignore 中的文件会被跳过
spawnSync(process.execPath, [prettier, '--write', '--ignore-unknown', '--log-level=silent', file], {
  cwd: root,
  stdio: 'ignore',
})
process.exit(0)
