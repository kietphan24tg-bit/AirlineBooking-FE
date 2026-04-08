import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  /** Expose BE_* env to client (default Vite only exposes VITE_*). */
  envPrefix: ['VITE_', 'BE_'],
});
