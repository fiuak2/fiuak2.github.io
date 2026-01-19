
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  // historyApiFallback is not a valid property for Vite's server configuration.
  // Standard SPA routing is handled by default by the Vite development server.
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false
  }
});
