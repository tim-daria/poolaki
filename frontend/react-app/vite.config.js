import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',    // listen on all interfaces in Docker
    port: 5173,
	allowedHosts: ['poolaki.localhost'],
    hmr: {
      host: 'poolaki.localhost',
      port: 443,  // or 80 if not using HTTPS
	  protocol: 'wss',
	  clientPort: 443,
    }
  }
})
