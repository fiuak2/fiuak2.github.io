
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    'process.env.API_KEY': JSON.stringify('AIzaSyB_0Kjno30QtgyoLmpBmCBCcgwyrA1JWQw')
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false
  }
});
