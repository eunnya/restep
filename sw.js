// Re:Step 서비스워커
// - 푸시를 받으면 알림을 띄우고(payload: { title, body, url }), 클릭하면 알림이 가리키는 url로 이동한다.
// - 앱이 이미 열려 있으면 페이지를 새로고침/이동시키지 않고 postMessage로만 알린다 →
//   앱이 지금 작업 중이던 화면과 입력 상태를 그대로 두고 상세만 열고, 뒤로가기 시 원래 화면으로 복원한다.
// - 앱이 닫혀 있으면 url로 새 창을 열고, 앱이 URL 파라미터(?open=...)를 읽어 알림 종류에 맞는 홈을 뒤로가기 기본값으로 쓴다.
// restep_app.html과 반드시 같은 폴더(같은 scope)에 둘 것.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'Re:Step', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Re:Step';
  const options = {
    body: data.body || '',
    data: { url: data.url || '' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const rel = (event.notification.data && event.notification.data.url) || '';
  const target = rel ? new URL(rel, self.registration.scope).href : self.registration.scope;

  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const inScope = wins.filter(c => c.url && c.url.startsWith(self.registration.scope));
    if (inScope.length) {
      // 보이는 창을 우선, 없으면 첫 창. 새로고침하지 않고 메시지로만 전달한다.
      const client = inScope.find(c => c.visibilityState === 'visible') || inScope[0];
      client.postMessage({ type: 'restep-notif-click', url: target });
      if ('focus' in client) await client.focus();
      return;
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});