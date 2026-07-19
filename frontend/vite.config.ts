import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

const buildDate = new Date().toISOString().split('T')[0]

export default defineConfig(async ({ mode }) => {
  const isDev = mode === 'development'
  const plugins: import('vite').PluginOption[] = [
    vue(),
    tailwindcss(),
    AutoImport({
      imports: ['vue', 'vue-router'],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      dts: 'src/components.d.ts',
    }),
  ]

  if (isDev) {
    plugins.push((await import('vite-plugin-vue-devtools')).default())
  } else {
    plugins.push(
      ViteImageOptimizer({
        png: { quality: 80 },
        jpeg: { quality: 80 },
        jpg: { quality: 80 },
        webp: { quality: 80 },
        avif: { quality: 80 },
        svg: {
          multipass: true,
          plugins: [
            {
              name: 'preset-default',
              params: {
                overrides: {
                  cleanupNumericValues: false,
                  cleanupIds: { minify: false, remove: false },
                  convertPathData: false,
                },
              },
            },
            'sortAttrs',
            {
              name: 'addAttributesToSVGElement',
              params: { attributes: [{ xmlns: 'http://www.w3.org/2000/svg' }] },
            },
          ],
        },
      }),
    )
  }

  return {
    plugins,
    define: {
      'import.meta.env.VITE_BUILD_DATE': JSON.stringify(buildDate),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('vue') || id.includes('pinia')) return 'vue-vendor'
              if (id.includes('ant-design-vue') || id.includes('@ant-design'))
                return 'antd-vendor'
              if (id.includes('marked') || id.includes('dompurify') || id.includes('ofetch'))
                return 'utils-vendor'
              if (id.includes('motion-v')) return 'motion-vendor'
            }
          },
        },
      },
    },
    server: {
      proxy: {
        // 开发态将 /api 代理到后端 8080
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/thumbnails': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/images': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  }
})
