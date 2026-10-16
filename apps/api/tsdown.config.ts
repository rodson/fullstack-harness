import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // 工作区包直接导出 TS 源码，必须打进 bundle；第三方依赖保持外部（见 package.json dependencies）
  deps: { alwaysBundle: [/^@app\//] },
  sourcemap: true,
  dts: false,
})
