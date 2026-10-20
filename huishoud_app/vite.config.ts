import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // relatieve paden: vereist voor Home Assistant Ingress
  plugins: [react()],
  server: { port: 5173, open: true },
});
