/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope
export default null

import { normalizeSchedule } from "./services/apiUtils"
import { IDBGetSchedule, IDBSave, IDBSetSchedule } from "./services/indexedDb"

const CACHE_NAME = 'TBA-v1';

// Install event: cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // 1. Cache static assets
        await caches.open(CACHE_NAME).then((cache) => cache.addAll(['/', '/index.html', '/manifest.json']));

        // 2. Attempt initial data sync from API
        const apiRes = await fetch('/api/schedule');
        if (apiRes.ok) {
          try {
            const rawSchedule = await apiRes.json();
            const normalized = normalizeSchedule(rawSchedule);
            IDBSetSchedule(normalized);
            console.log("Successfully set IDB with API schedule.");
          } catch (error) {
            console.warn("Could not set IDB with API schedule. Read:", error);
          }
        } else {

        }
      } catch (e) {
        console.error("Error during service worker install:", e);
      }
    })()
  );
  self.skipWaiting();
});


async function networkFirst(request: Request) {
  const requestPathname = (new URL(request.url)).pathname
  const isApiRequest = requestPathname.includes("/api")
  const isApiScheduleReq = isApiRequest && requestPathname.includes("/api/schedule") && request.method == "POST";
  const isAuthRequest = requestPathname.includes("/auth")
  const reqCpy = request.clone()
  try {
    const networkResponse = await fetch(request);

    if(isAuthRequest)
      return networkResponse

    if (isApiScheduleReq) {
      try {
        const reqSchedule = await reqCpy.json();
        console.log('[SW]: Saving schedule to IDB based on POST req.');
        
        if (reqSchedule) {
          const normalized = normalizeSchedule(reqSchedule);
          IDBSetSchedule(normalized);
        } else {
          console.warn("Could not parse schedule from IDB")
        }
      } catch (e) {
        console.error("Error caching API schedule:", e);
      }

      if (networkResponse.ok)
        return networkResponse;
    }


    if (!networkResponse.ok)
      throw `Error with status code: ${networkResponse.status}`;
    // Cache static assets (not API calls)
    if (request.method == "GET" && !isApiRequest) {
      const cache = await caches.open(CACHE_NAME);
      console.log("caching files in path: ", request.url);

      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    return networkResponse;
  } catch (error) {
    console.error("Network fetch failed.", error);
    if (isApiScheduleReq || isAuthRequest)
      return new Response(null, { status: 200 });

    console.log("Returning cached response.");
    const cachedResponse = await caches.match(request);
    return cachedResponse || Response.error();
  }
}


// Fetch event: Network First strategy
self.addEventListener('fetch', event => {
  event.respondWith(networkFirst(event.request));

  // const requestUrl = new URL(event.request.url);

  // // 1. Handle API calls (POST/PUT/DELETE): ALWAYS network first
  // if (event.request.method !== 'GET' && requestUrl.pathname.includes("/api")) {
  //   console.log(`[Service Worker] Network WRITE request: ${requestUrl.pathname}`);
  //   event.respondWith(fetch(event.request));
  //   return;
  // }

  // // 2. Handle GET requests: Network first, cache fallback
  // if (event.request.method === 'GET') {
  //   event.respondWith(
  //     fetch(event.request).then(networkResponse => {
  //       // Cache static assets (only cache if response is ok)
  //       const netResCpy = networkResponse.clone();
  //       if (netResCpy.ok) {
  //         console.log("Caching file: ", requestUrl.pathname);
  //         caches.open(CACHE_NAME).then(c => c.put(event.request, networkResponse.clone()));
  //         return networkResponse;
  //       }
  //       return networkResponse;
  //     })
  //   );
  //   return;
  // }

  // // 3. Fallback for unsupported methods (should not happen)
  // event.respondWith(fetch(event.request));
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});