import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true, // sprístupní server pre celú sieť
    https: true // zapne HTTPS, vďaka čomu prehliadač povolí prístup ku kamere
  }
})
