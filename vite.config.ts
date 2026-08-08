import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // KHÔNG define GEMINI_API_KEY ở đây. `define` thay chuỗi lúc build, nên
  // key thật sẽ nằm trong bundle JS gửi xuống mọi trình duyệt.
  // Client gọi AI qua /api/ai/generate; key chỉ tồn tại phía server.
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
