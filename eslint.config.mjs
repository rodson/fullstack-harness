// 根 ESLint 配置：覆盖 apps/api、packages/*、scripts、.claude/hooks。
// apps/web 有自己的 eslint.config.mjs（叠加 Next.js 规则），这里忽略它。
import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { strictRules, testFiles } from './eslint.shared.mjs'

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/.turbo/**',
    '**/coverage/**',
    'apps/web/**',
    'packages/db/drizzle/**',
  ]),
  js.configs.recommended,
  tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: strictRules,
  },
  {
    // 分层约束：handler（*.routes.ts）不直接访问数据库
    files: ['apps/api/src/**/*.routes.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@app/db', message: 'handler 不直接访问 DB：经 service → repository' },
            { name: 'drizzle-orm', message: 'handler 不直接访问 DB：经 service → repository' },
          ],
        },
      ],
    },
  },
  {
    // 依赖方向：shared 是最底层契约，不能反向依赖
    files: ['packages/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@app/*'], message: 'packages/shared 不能依赖其他工作区包' }] },
      ],
    },
  },
  {
    files: [...testFiles, 'scripts/**', '.claude/hooks/**', '**/*.config.{ts,mjs}'],
    rules: { 'no-console': 'off' },
  },
])
