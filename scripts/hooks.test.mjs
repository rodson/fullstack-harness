// .claude/hooks/guard-bash.mjs 的行为测试：喂入 hook payload，断言退出码（2 = 阻断）。
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'

const GUARD = path.join(import.meta.dirname, '..', '.claude', 'hooks', 'guard-bash.mjs')

function guard(command, root = os.tmpdir()) {
  const r = spawnSync(process.execPath, [GUARD], {
    input: JSON.stringify({ cwd: root, tool_input: { command } }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    encoding: 'utf8',
  })
  return r.status
}

function projectAt(stage) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-test-'))
  fs.mkdirSync(path.join(root, 'specs/f'), { recursive: true })
  fs.writeFileSync(path.join(root, 'specs/.current'), 'f\n')
  fs.writeFileSync(path.join(root, 'specs/f/05-state.json'), JSON.stringify({ stage }))
  return root
}

describe('guard-bash', () => {
  it('放行日常命令', () => {
    for (const cmd of [
      'pnpm verify',
      'pnpm spec status',
      'pnpm spec submit plan',
      'rm -rf node_modules apps/web/.next',
      'rm -f apps/api/src/old.ts',
      'git push origin feature/kanban',
      'git checkout main',
      'cat specs/f/05-state.json',
      'cat specs/.current 2>/dev/null || echo none',
      'cat specs/f/05-state.json 2>&1 | head -5',
      'sed -n 1,5p specs/f/05-state.json',
    ]) {
      assert.equal(guard(cmd), 0, cmd)
    }
  })

  it('阻断高危命令', () => {
    for (const cmd of [
      'rm -rf src',
      'rm -fr /',
      'rm --recursive --force apps',
      'git push -f',
      'git push --force origin main',
      'git reset --hard HEAD~1',
      'git clean -fd',
      'git commit --no-verify -m x',
      'psql -c "DROP TABLE tasks"',
      'pnpm drizzle-kit push',
    ]) {
      assert.equal(guard(cmd), 2, cmd)
    }
  })

  it('阻断绕过人工闸门与状态文件的命令', () => {
    for (const cmd of [
      'pnpm spec approve plan_review',
      'node scripts/spec.mjs approve acceptance --force',
      'pnpm spec pause',
      'pnpm spec cancel "不做了"',
      'CLAUDECODE= node scripts/spec.mjs status',
      'env -u CLAUDECODE pnpm spec status',
      'echo {} > specs/f/05-state.json',
      'echo x >> specs/.current',
      'cat x | tee specs/f/05-state.json',
      'mv /tmp/s.json specs/f/05-state.json',
      "sed -i '' 's/drafting/implementing/' specs/f/05-state.json",
      `node -e "require('fs').writeFileSync('specs/f/05-state.json', '{}')"`,
      'rm specs/.current',
    ]) {
      assert.equal(guard(cmd), 2, cmd)
    }
  })

  it('非 implementing 阶段不能用 shell 改代码；implementing 时可以', () => {
    const verifying = projectAt('verifying')
    for (const cmd of [
      "sed -i '' 's/a/b/' apps/api/src/a.ts",
      'echo x > apps/api/src/a.ts',
      'cat x | tee packages/shared/src/a.ts',
      'cp /tmp/a.ts apps/web/src/a.ts',
    ]) {
      assert.equal(guard(cmd, verifying), 2, cmd)
    }
    assert.equal(guard('pnpm test:e2e', verifying), 0)
    assert.equal(guard("sed -i '' 's/a/b/' apps/api/src/a.ts", projectAt('implementing')), 0)
  })
})
