import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure built assets use relative URLs when loaded via file:// in Electron
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost'
  }
})
