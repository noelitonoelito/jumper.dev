// identifier for this app.
//   this needs to be consistent across every cache update.
const APP_PREFIX = "jumper"
// version of the off-line cache.
//   change this value every time you want to update cache.
const VERSION = "v0.20.0"
const CACHE_NAME = `${APP_PREFIX}_${VERSION}`
const URLS_TO_CACHE = [
  // use "/" instead of "/index.html"
  `/${APP_PREFIX}/`,
  `/${APP_PREFIX}/main.css`,
  `/${APP_PREFIX}/main.js`,

  `/${APP_PREFIX}/images/game-over.svg`,

  `/${APP_PREFIX}/images/controls/left.svg`,
  `/${APP_PREFIX}/images/controls/play.svg`,
  `/${APP_PREFIX}/images/controls/replay.svg`,
  `/${APP_PREFIX}/images/controls/right.svg`,

  `/${APP_PREFIX}/images/jumpers/caleb-icon.svg`,
  `/${APP_PREFIX}/images/jumpers/caleb-jumping.svg`,
  `/${APP_PREFIX}/images/jumpers/caleb-standing.svg`,
  `/${APP_PREFIX}/images/jumpers/zobie-icon.svg`,
  `/${APP_PREFIX}/images/jumpers/zobie-jumping.svg`,
  `/${APP_PREFIX}/images/jumpers/zobie-standing.svg`,

  `/${APP_PREFIX}/images/platforms/basic.svg`,

  `/${APP_PREFIX}/images/stages/clouds.svg`
]

function cacheResources(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("installing cache: " + CACHE_NAME)
      return cache.addAll(URLS_TO_CACHE)
    })
  )
}

function deleteExpiredCache(event) {
  event.waitUntil(
    caches.keys().then((keys) => {
      // `keys` contains all cache names under your subdomain.
      const cacheToKeep = keys.filter((key) => key.indexOf(`${APP_PREFIX}_`))
      cacheToKeep.push(CACHE_NAME)

      return Promise.all(keys.map((key) => {
        if (cacheToKeep.includes(key)) { return }
        console.log("deleting cache: " + key)
        return caches.delete(key)
      }))
    })
  )
}

function fromCacheElseFetch(event) {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log("responding with cache:", event.request.url)
        return cachedResponse
      }

      console.log("file is not cached, fetching:", event.request.url)
      return fetch(event.request)

      // return request || fetch(e.request)
    })
  )
}

self.addEventListener("install", cacheResources)
self.addEventListener("activate", deleteExpiredCache)
self.addEventListener("fetch", fromCacheElseFetch)