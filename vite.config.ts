import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'jspdf': path.resolve(__dirname, 'node_modules/jspdf/dist/jspdf.es.min.js'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['jspdf', 'jspdf-autotable'],
  },
});
