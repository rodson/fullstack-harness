// 根配置与 apps/web 配置共用的硬约束规则（对应 CLAUDE.md「硬约束」）
export const strictRules = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
  ],
  '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
  'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
  eqeqeq: ['error', 'smart'],
}

export const testFiles = ['**/*.test.{ts,tsx}', '**/test/**', '**/e2e/**']
