import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    include: ['plotly.js-dist-min'],
  },
  build: {
    commonjsOptions: {
      include: [/plotly\.js-dist-min/, /node_modules/],
    },
  },
})
