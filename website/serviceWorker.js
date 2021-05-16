// identifier for this app.
//   this needs to be consistent across every cache update.
const APP_PREFIX = "jumper.dev"
// version of the off-line cache.
//   change this value every time you want to update cache.
const VERSION = "v0.22.1"
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

  `/${APP_PREFIX}/images/jumpers/bob-icon.svg`,
  `/${APP_PREFIX}/images/jumpers/bob-jumping.svg`,
  `/${APP_PREFIX}/images/jumpers/bob-standing.svg`,
  `/${APP_PREFIX}/images/jumpers/caleb-icon.svg`,
  `/${APP_PREFIX}/images/jumpers/caleb-jumping.svg`,
  `/${APP_PREFIX}/images/jumpers/caleb-standing.svg`,
  `/${APP_PREFIX}/images/jumpers/zobie-icon.svg`,
  `/${APP_PREFIX}/images/jumpers/zobie-jumping.svg`,
  `/${APP_PREFIX}/images/jumpers/zobie-standing.svg`,

  `/${APP_PREFIX}/images/platforms/basic.svg`,

  `/${APP_PREFIX}/images/stages/clouds.svg`,

  `/${APP_PREFIX}/sounds/background-music.mp3`,
  `/${APP_PREFIX}/sounds/click.mp3`,
  `/${APP_PREFIX}/sounds/game-over.mp3`,
  `/${APP_PREFIX}/sounds/jump-1.mp3`,
  `/${APP_PREFIX}/sounds/jump-2.mp3`,
  `/${APP_PREFIX}/sounds/jump-3.mp3`,
  `/${APP_PREFIX}/sounds/jump-4.mp3`
]

const PARTIAL_CONTENT = 206

function cacheResources(event) {
  event.waitUntil(async () => {
    const cache = await caches.open(CACHE_NAME)
    console.log("Installing cache:", CACHE_NAME)
    return cache.addAll(URLS_TO_CACHE)
  })
}

function deleteExpiredCache(event) {
  event.waitUntil(() => {
    // `cacheKeys` contains all cache names under your subdomain.
    const cacheKeys = await caches.keys()
    const cacheToKeep = cacheKeys.filter((key) => key.indexOf(`${APP_PREFIX}_`))
    cacheToKeep.push(CACHE_NAME)

    return Promise.all(cacheKeys.map((key) => {
      if (cacheToKeep.includes(key)) { return }
      console.log("Deleting cache: " + key)
      return caches.delete(key)
    }))
  })
}

// https://samdutton.github.io/samples/service-worker/prefetch-video/
function fromCacheElseFetch(event) {
  // only handle "GET" requests
  if (event.request.method !== "GET") { return }

  if (event.request.headers.get("range")) {
    var startingPosition =
      Number(/^bytes\=(\d+)\-$/g.exec(event.request.headers.get("range"))[1])
    console.log(
      "Handling Range request for:",
      event.request.url,
      ", starting position:",
      startingPosition
    )

    event.respondWith(async () => {
      const cache = await caches.open(CACHE_NAME)
      const cacheResponse = await cache.match(event.request.url)
      let arrayBuffer

      if (cacheResponse) {
        console.log("-- found file in cache")
        arrayBuffer = await cacheResponse.arrayBuffer()
      } else {
        console.log("-- file not in cache, fetching...")
        arrayBuffer = (await fetch(event.request)).arrayBuffer()
      }

      console.log("-- responding")

      return new Response(
        arrayBuffer.slice(startingPosition),
        {
          status: PARTIAL_CONTENT,
          statusText: "Partial Content",
          headers: [
            [
              "Content-Range",
              "bytes " + startingPosition + "-" +
              (arrayBuffer.byteLength - 1) + "/" + arrayBuffer.byteLength
            ]
          ]
        }
      )
    })
  } else {
    console.log("Handling request for:", event.request.url)

    event.respondWith(async () => {
      // caches.match() will look for a cache entry in all of the caches
      //   available to the service worker.
      // It's an alternative to first opening a specific named cache
      //   and then matching on that.
      const cacheResponse = await caches.match(event.request)

      if (cacheResponse) {
        console.log("-- found file in cache, responding...")
        return cacheResponse
      }

      console.log("-- file not in cache, fetching...")

      try {
        // event.request will always have the proper mode set
        //   ("cors", "no-cors", etc.) so we don't have to hard code
        //   "no-cors" like we do when fetch()ing in the install handler.
        const response = await fetch(event.request)
        console.log("-- responding")
        return response
      } catch (error) {
        // 404 errors will NOT trigger an exception
        console.error("--- fetching failed:", error)
        throw error
      }
    })
  }
}

self.addEventListener("install", cacheResources)
self.addEventListener("activate", deleteExpiredCache)
self.addEventListener("fetch", fromCacheElseFetch)