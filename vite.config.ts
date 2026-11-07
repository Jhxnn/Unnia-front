import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Em desenvolvimento, /api é encaminhado para o backend (Spring Boot, porta 8080), então o navegador
// só fala com a própria origem e não há CORS. Em produção, sirva o front e a API na mesma origem
// (ou configure VITE_API_URL e o CORS no backend).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.UNNIA_API_URL ?? 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
