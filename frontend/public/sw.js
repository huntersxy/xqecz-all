const CACHE_NAME = 'xq-cache-v2'
const STATIC_ASSETS = [
  '/',
  '/index.html',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    }).catch(() => {})
  )
  globalThis.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    })
  )
  globalThis.clients.claim()
})

function isApiRequest(request) {
  const url = request.url
  return url.includes('/api/')
}

function isStaticAsset(request) {
  return request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  if (isApiRequest(event.request)) {
    event.respondWith(fetch(event.request))
    return
  }

  if (isStaticAsset(event.request)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response?.status === 200) {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            }).catch(() => {})
          }
          return response
        })
      })
    )
    return
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cached) => {
        if (cached) return cached
        if (event.request.destination === 'document') {
          return caches.match('/index.html')
        }
        return new Response('Network error', { status: 408 })
      })
    })
  )
})
