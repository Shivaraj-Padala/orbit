// Imported into the generated service worker. Focuses (or opens) the app
// when a reminder notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(
    (event.notification.data && event.notification.data.url) || './',
    self.registration.scope,
  ).href
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            client.navigate(target).catch(() => {})
            return client.focus()
          }
        }
        return self.clients.openWindow(target)
      }),
  )
})
