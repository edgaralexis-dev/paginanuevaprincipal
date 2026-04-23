import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const testApi = 'https://testapi.primetix.fun';

// GitHub Pages (ruta /repo/): definir BASE_PATH en CI. Subdominio propio en raíz: BASE_PATH=/
const base =
  (process.env.BASE_PATH && process.env.BASE_PATH.trim()) || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 3010,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/primetixapi': { target: testApi, changeOrigin: true, secure: true },
      '/tickettixapi': { target: testApi, changeOrigin: true, secure: true },
      '/securetixapi': { target: testApi, changeOrigin: true, secure: true },
      '/paymenttixapi': { target: testApi, changeOrigin: true, secure: true },
      '/paymentengineapi': { target: testApi, changeOrigin: true, secure: true },
      '/BillingEngineApi': { target: testApi, changeOrigin: true, secure: true },
      '/AuthorizationApi': { target: testApi, changeOrigin: true, secure: true },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/primetixapi': { target: testApi, changeOrigin: true, secure: true },
      '/tickettixapi': { target: testApi, changeOrigin: true, secure: true },
      '/securetixapi': { target: testApi, changeOrigin: true, secure: true },
      '/paymenttixapi': { target: testApi, changeOrigin: true, secure: true },
      '/paymentengineapi': { target: testApi, changeOrigin: true, secure: true },
      '/BillingEngineApi': { target: testApi, changeOrigin: true, secure: true },
      '/AuthorizationApi': { target: testApi, changeOrigin: true, secure: true },
    },
  },
});

