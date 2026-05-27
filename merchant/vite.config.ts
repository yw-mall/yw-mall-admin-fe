import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'node:path'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5175,
    proxy: {
      // 直连 mall-admin-api，不走 APISIX 以简化 dev 启动依赖
      '/merchant/v1': {
        target: 'http://localhost:18999',
        changeOrigin: true,
      },
      // 接受邀请页要先用 C 端账号登录，dev 时走代理避开 CORS
      '/api': {
        target: 'http://localhost:18888',
        changeOrigin: true,
      },
    },
  },
})
