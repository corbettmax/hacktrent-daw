const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

// https://vitejs.dev/config/
module.exports = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/pattern': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/tempo': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/defaultPattern': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
