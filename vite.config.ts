import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import { nitro } from 'nitro/vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    wasm(),
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
    nitro({
      preset: 'node',
      runtimeConfig: {
        convexUrl: '',
        clerkPublishableKey: '',
      },
    }),
    viteReact(),
  ],
  optimizeDeps: {
    exclude: ['@cooklang/cooklang'],
  },
  ssr: {
    noExternal: [],
  },
})
