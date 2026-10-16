import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { strictRules, testFiles } from '../../eslint.shared.mjs'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),
  { rules: strictRules },
  {
    // 取数统一走 src/lib/api.ts；组件里禁止裸 fetch，禁止依赖后端包
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/api.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: '取数统一走 src/lib/api.ts + TanStack Query' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@app/api', '@app/db'], message: 'web 只能依赖 @app/shared 契约与 @app/ui' },
          ],
        },
      ],
    },
  },
  {
    files: [...testFiles, '*.config.{ts,mjs}'],
    rules: { 'no-console': 'off' },
  },
])
