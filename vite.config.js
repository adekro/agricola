import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      src: '/src',
    },
  },
  server: {
    proxy: {
      '/fitosanitari-api': {
        target: 'https://www.dati.salute.gov.it',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fitosanitari-api/, ''),
      }
    }
  }
})
