import { createApp } from './app.js'
import { countUsers } from './db/index.js'
import { seedDemo } from './seed.js'

const PORT = Number(process.env.PORT) || 3000

// Auto-seed a demo environment on first boot so the app is usable immediately.
if (countUsers() === 0) {
  seedDemo()
}

const app = createApp()

app.listen(PORT, () => {
  console.log(`[xqecz-node] server listening on http://localhost:${PORT}`)
  console.log(`[xqecz-node] API base: http://localhost:${PORT}/api`)
  console.log(`[xqecz-node] frontend served from / (built dist) or Vite dev proxy`)
})
