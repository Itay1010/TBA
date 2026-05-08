
/// <reference lib="webworker" />
export default null
declare let self: ServiceWorkerGlobalScope

import "../services/indexedDB.h"
import { IDBGetSchedule, IDBSetSchedule } from "../services/indexedDb"

const CACHE_NAME = 'TBA-v1';

// Install event: cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]);
    })

    const apiRes = await fetch('/api/schedule');
    if (apiRes.ok) {
      try {
        const apiSchedule: Schedule = await apiRes.json();
        IDBSetSchedule(apiSchedule);
      } catch (error) {
        console.log(error);
      }
    } else {
      const dbSchedual = await IDBGetSchedule();
      if (dbSchedual) {
        localStorage.setItem('calendarSchedule', JSON.stringify(dbSchedual))
      } else {
        console.error("failed to get schedule from IDB", dbSchedual)
      }
    }


  })()
  );
  self.skipWaiting();
});


async function networkFirst(request: Request) {
  try {
    const isApiRequest = (new URL(request.url)).pathname.includes("/api")
    const networkResponse = await fetch(request);
    if (!networkResponse.ok)
      return networkResponse;
    
    if (request.method == "GET" && /^https?:$/i.test(new URL(request.url).protocol) && !isApiRequest) {
      const cache = await caches.open(CACHE_NAME);
      console.log("caching files in path: ", request.url);

      cache.put(request, networkResponse.clone());
    }

    if (isApiRequest && (new URL(request.url)).pathname.includes("/api/schedule") && request.method == "GET") {
      console.log("caching files in path: ", request.url);

      try {
        const reqSchedule: Schedule = await networkResponse.clone().json();
        IDBSetSchedule(reqSchedule);
      } catch (e) {
        console.error(e);
      }
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || Response.error();
  }
}


// Fetch event: serve from network if available, otherwise go to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(networkFirst(event.request));
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
