import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = String(env.BE_URL || env.VITE_API_URL || '').replace(/\/$/, '');

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_', 'BE_'],
    server:
      mode === 'development' && apiTarget
        ? {
            proxy: {
              '/api': {
                target: apiTarget,
                changeOrigin: true,
                secure: true,
              },
            },
          }
        : undefined,
  };
});
