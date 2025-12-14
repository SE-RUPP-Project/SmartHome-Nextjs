importScripts(
  "https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js"
);

// ✅ Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyCzEH4eCQ8YMYUXWPJcSwlckgnySlQX8yI",
  authDomain: "sample-testing-shipment.firebaseapp.com",
  projectId: "sample-testing-shipment",
  messagingSenderId: "631018768943",
  appId: "1:631018768943:web:d671cc688385eabdf5d4da",
});

// ✅ Retrieve messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'Smart Home Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/icons/alert.png',
    badge: payload.notification?.badge || '/icons/badge.png',
    data: payload.data,
    tag: payload.data?.alert_id || 'smart-home-notification',
    requireInteraction: payload.data?.severity === 'critical',
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'view',
        title: 'View Alert'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);
  
  event.notification.close();

  if (event.action === 'view') {
    // Open the app to the alerts page
    event.waitUntil(
      clients.openWindow('/alerts')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});