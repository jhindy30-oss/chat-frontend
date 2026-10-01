importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Paste your standard Firebase config here
firebase.initializeApp({
   apiKey: "AIzaSyCyuA8a7CPMAC8YKMXcJ5o1-7FDYBEjfcA",
  authDomain: "sticker-responses.firebaseapp.com",
  projectId: "sticker-responses",
  storageBucket: "sticker-responses.firebasestorage.app",
  messagingSenderId: "768304605509",
  appId: "1:768304605509:web:030aca38010148f03af62c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
