import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const plugins = [react()];
  if (env.VITE_USE_MKCERT === 'true') {
    plugins.push(mkcert());
  }

  return {
    base: env.VITE_BASE_URL || '/',
    plugins,
  }
})
