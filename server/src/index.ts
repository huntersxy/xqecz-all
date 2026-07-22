import { createApp } from './app.js'
import { migrate, countUsers } from './db/index.js'
import { connectRedis, closeRedis, clearCachesOnStartup } from './db/redis.js'
import { seedDemo } from './seed.js'

const PORT = Number(process.env.PORT) || 3000

// 1. Run MySQL migration
await migrate()

// 2. Connect Redis
await connectRedis()
await clearCachesOnStartup()

// 3. Auto-seed demo data on first boot
if ((await countUsers()) === 0) {
  await seedDemo()
}

// 4. Start Express server
const app = createApp()

app.listen(PORT, () => {
  console.log(`[xqecz-node] server listening on http://localhost:${PORT}`)
  console.log(`[xqecz-node] API base: http://localhost:${PORT}/api`)
  console.log(`[xqecz-node] frontend served from / (built dist) or Vite dev proxy`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[xqecz-node] shutting down...')
  await closeRedis()
  process.exit(0)
})
process.on('SIGTERM', async () => {
  console.log('[xqecz-node] shutting down...')
  await closeRedis()
  process.exit(0)
})
