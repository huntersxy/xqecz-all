import Redis from 'ioredis'

const KEY_PREFIX = process.env.REDIS_PREFIX || 'xqecz:'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB) || 0,
  keyPrefix: KEY_PREFIX,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null
    return Math.min(times * 200, 5000)
  },
  lazyConnect: true,
})

redis.on('error', (err) => {
  console.error('[redis]', err.message)
})

redis.on('connect', () => {
  console.log('[redis] connected', `${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`)
})

export { redis, KEY_PREFIX }

// ---- helpers ----

function rk(key: string): string {
  return key
}

// ---- generic cache ----

export async function setCache(key: string, value: string | number, ttlSeconds: number): Promise<void> {
  await redis.set(rk(key), String(value), 'EX', ttlSeconds)
}

export async function getCache(key: string): Promise<string | null> {
  return redis.get(rk(key))
}

export async function setCacheJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.set(rk(key), JSON.stringify(value), 'EX', ttlSeconds)
}

export async function getCacheJSON<T>(key: string): Promise<T | null> {
  const raw = await redis.get(rk(key))
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function delCache(key: string): Promise<void> {
  await redis.del(rk(key))
}

// ---- session ----

const SESSION_TTL = 30 * 24 * 3600 // 30 days
const SESSION_RENEW_THRESHOLD = 15 * 24 * 3600 // 15 days (50%)

export async function setSession(sessionID: string, userID: number): Promise<void> {
  await setCache(`session:${sessionID}`, userID, SESSION_TTL)
}

export async function getSession(sessionID: string): Promise<number | null> {
  const val = await getCache(`session:${sessionID}`)
  if (!val) return null
  const userID = Number(val)
  if (!Number.isFinite(userID) || userID <= 0) return null

  // auto-renew when TTL drops below 50%
  const ttl = await redis.ttl(rk(`session:${sessionID}`))
  if (ttl >= 0 && ttl < SESSION_RENEW_THRESHOLD) {
    await redis.expire(rk(`session:${sessionID}`), SESSION_TTL)
  }

  return userID
}

export async function delSession(sessionID: string): Promise<void> {
  await delCache(`session:${sessionID}`)
}

// ---- view count (Redis INCR, periodically flushed to MySQL) ----

export async function incrementViewCount(contentID: number): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const key = `views:date:${today}:${contentID}`
  const count = await redis.incr(rk(key))
  if (count === 1) {
    await redis.expire(rk(key), 32 * 24 * 3600) // 32 days
  }
  return count
}

export async function getViewCount(contentID: number): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const val = await redis.get(rk(`views:date:${today}:${contentID}`))
  return val ? Number(val) : 0
}

// ---- recommend ZSet ----

export async function zAddToTempRecommend(contentID: number, score: number): Promise<void> {
  await redis.zadd('recommend:temp', score, String(contentID))
}

export async function swapRecommendZSet(): Promise<void> {
  const pipeline = redis.pipeline()
  pipeline.del('recommend:zset')
  pipeline.rename('recommend:temp', 'recommend:zset')
  await pipeline.exec()
}

export async function zRevRangeRecommend(page: number, pageSize: number): Promise<number[]> {
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1
  const vals = await redis.zrevrange('recommend:zset', start, end)
  return vals.map(Number).filter((id) => Number.isFinite(id) && id > 0)
}

export async function getRecommendTotal(): Promise<number> {
  return redis.zcard('recommend:zset')
}

// ---- cache invalidation ----

async function clearByPattern(pattern: string): Promise<void> {
  const keys: string[] = []
  let cursor = '0'
  do {
    const [next, found] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
    cursor = next
    keys.push(...found)
  } while (cursor !== '0')
  if (keys.length > 0) {
    const stripped = keys.map((k) => k.startsWith(KEY_PREFIX) ? k.slice(KEY_PREFIX.length) : k)
    await redis.del(...stripped)
  }
}

export async function clearCommentCache(contentID: number): Promise<void> {
  await clearByPattern(`${KEY_PREFIX}comments:${contentID}:*`)
  await delCache(`comment_count:${contentID}`)
}

export async function clearContentListCache(): Promise<void> {
  await clearByPattern(`${KEY_PREFIX}content_list:*`)
}

export async function clearContentCache(contentID: number): Promise<void> {
  await delCache(`content:${contentID}`)
}

export async function clearUserInfoCache(userID: number): Promise<void> {
  await delCache(`user:${userID}`)
}

// ---- startup cache clear ----

export async function clearCachesOnStartup(): Promise<void> {
  const pattern = `${KEY_PREFIX}*`
  let cursor = '0'
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200)
    cursor = next
    for (const fullKey of keys) {
      const k = fullKey.startsWith(KEY_PREFIX) ? fullKey.slice(KEY_PREFIX.length) : fullKey
      if (k.includes('session:') || k.includes('views:date:')) continue
      await redis.del(k)
    }
  } while (cursor !== '0')
  console.log('[redis] caches cleared on startup (sessions & view counts preserved)')
}

// ---- lifecycle ----

export async function connectRedis(): Promise<void> {
  await redis.connect()
  console.log('[redis] prefix:', KEY_PREFIX)
}

export async function closeRedis(): Promise<void> {
  await redis.quit()
}
