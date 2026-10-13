/* Pocket Party: offline-first static shell with runtime asset caching. */
"use strict";

const SHELL_CACHE = "pocket-party-shell-v3";
const ASSET_CACHE = "pocket-party-assets-v3";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/game.js",
  "/manifest.webmanifest",
  "/assets/pocket_party_icon.svg"
];
const EXTERNAL_ASSETS = [
  "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Racing%20Pack/Cars/car_red_1.png",
  "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Racing%20Pack/Cars/car_blue_1.png",
  "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Racing%20Pack/Cars/car_green_1.png",
  "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Racing%20Pack/Cars/car_black_1.png",
  "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Racing%20Pack/Cars/car_red_2.png",
  "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Racing%20Pack/Cars/car_blue_2.png",
  "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Racing%20Pack/Cars/car_green_2.png",
  "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Racing%20Pack/Cars/car_black_2.png",
  "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Puzzle%20Pack%201/element_red_square_glossy.png",
  "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Puzzle%20Pack%201/element_blue_square_glossy.png",
  "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Puzzle%20Pack%201/element_yellow_square_glossy.png",
  "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Puzzle%20Pack%201/element_green_square_glossy.png",
  "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Puzzle%20Pack%201/particleCartoonStar.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil((async function () {
    const shell = await caches.open(SHELL_CACHE);
    await Promise.all(APP_SHELL.map(async function (url) {
      try {
        const response = await fetch(url, { cache: "reload" });
        if (response.ok) await shell.put(url, response);
      } catch (_) { /* A partial shell is still useful when a network request fails. */ }
    }));

    const assets = await caches.open(ASSET_CACHE);
    await Promise.all(EXTERNAL_ASSETS.map(async function (url) {
      try {
        const request = new Request(url, { mode: "no-cors" });
        const response = await fetch(request);
        if (response.ok || response.type === "opaque") await assets.put(request, response);
      } catch (_) { /* The image will be retried when it is first needed online. */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    const names = await caches.keys();
    await Promise.all(names.filter(function (name) {
      return name.indexOf("pocket-party-") === 0 &&
        name !== SHELL_CACHE && name !== ASSET_CACHE;
    }).map(function (name) { return caches.delete(name); }));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (!/\.(?:png|jpe?g|webp|svg|gif)$/i.test(url.pathname)) return;
    event.respondWith((async function () {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok || response.type === "opaque") {
          const cache = await caches.open(ASSET_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        return new Response("", { status: 504, statusText: "Offline asset not cached" });
      }
    })());
    return;
  }

  event.respondWith((async function () {
    try {
      const response = await fetch(request);
      if (response.ok && !request.url.includes("/api/")) {
        const cache = await caches.open(SHELL_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") {
        return (await caches.match("/")) ||
          (await caches.match("/index.html")) ||
          new Response("Pocket Party is offline and this page has not been cached yet.", {
            status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
      }
      return new Response("", { status: 504, statusText: "Offline resource not cached" });
    }
  })());
});
