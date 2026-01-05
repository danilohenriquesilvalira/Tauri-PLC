import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    host: true, // Permite conexões externas mas não força 0.0.0.0 
    strictPort: false, // Permite trocar de porta se estiver ocupada
    open: false, // Não abre automaticamente o browser
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})