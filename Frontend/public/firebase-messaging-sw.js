// Firebase Cloud Messaging Service Worker (SOP Standard)
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase configuration (Live Project)
const firebaseConfig = {
  apiKey: "AIzaSyCTPH6aJv5ZVqJZvhzyoHq7ug5Vm-d-a18",
  authDomain: "swdms-681e9.firebaseapp.com",
  projectId: "swdms-681e9",
  storageBucket: "swdms-681e9.firebasestorage.app",
  messagingSenderId: "990297902089",
  appId: "1:990297902089:web:e4bbb9309555826d8cbcd8",
  measurementId: "G-B8BWS8KVNV"
};

try {
  // Initialize Firebase in Service Worker
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Handle background push messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background push message:', payload);
    
    const notificationTitle = payload.notification?.title || payload.data?.title || 'ShippNex Notification';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || '',
      icon: payload.notification?.icon || payload.data?.icon || '/LogoSavitri.png',
      badge: '/LogoSavitri.png',
      data: payload.data || {},
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn('[firebase-messaging-sw.js init warning]:', err.message);
}

// Handle notification click and navigation (SOP Standard)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  const targetUrl = data?.link || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl !== '/') {
            return client.navigate(targetUrl);
          }
          return client;
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
