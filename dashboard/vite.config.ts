import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => ({
  // 生产构建必须能通过 file:// 离线打开；不能依赖根路径或本地服务。
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === 'analyze'
      ? [visualizer({
          filename: path.resolve(import.meta.dirname, '../.assistant-local/dashboard/bundle-stats.html'),
          gzipSize: true,
          brotliSize: true,
          open: false,
          title: 'AI Carry Dashboard Bundle',
        })]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      'ai-carry-jsx': path.resolve(import.meta.dirname, './src/lib/localized-jsx'),
    },
  },
  // jsxImportSource is declared in tsconfig so the React plugin only forces
  // React itself into the dependency cache. This local runtime must stay live.
  optimizeDeps: {
    exclude: ['ai-carry-jsx', 'ai-carry-jsx/jsx-runtime', 'ai-carry-jsx/jsx-dev-runtime'],
  },
  // The final offline file intentionally inlines the application bundle.
  // A single larger chunk is expected here and avoids file:// module loading failures.
  build: { chunkSizeWarningLimit: 1800 },
  server: { port: 5173, strictPort: false },
}))
