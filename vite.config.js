/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

const cwd = typeof process !== 'undefined' ? process.cwd() : ''

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd, '')

  return {
    base: env.VITE_BASE_URL || '/gadgets-to-go/',
    plugins: [react(), mkcert()],
  }
})
