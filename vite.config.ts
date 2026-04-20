import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const testApi = 'https://testapi.primetix.fun';

export default defineConfig({
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

