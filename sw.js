/* 闲来一卦 — 最小化 Service Worker
 * 作用：托管环境下缓存应用文件，实现离线可用 + 触发「添加到主屏幕」安装横幅。
 * 注意：file:// 直接打开时无法注册（浏览器限制），本文件仅在 http(s) 托管时生效。
 */
const CACHE = 'xl-yg-v1'
const ASSETS = ['./', './index.html', './manifest.webmanifest', './assets/avatar.png']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  // 页面导航：网络优先（保证更新可感知），离线时回退缓存
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html'))
    )
    return
  }

  // 静态资源：缓存优先，未命中再回源并缓存
  e.respondWith(
    caches.match(req).then((hit) => {
      return hit || fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy))
        return res
      })
    })
  )
})
