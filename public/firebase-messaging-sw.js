// public/firebase-messaging-sw.js

// 1. Import the Firebase background scripts
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// 2. Initialize Firebase (Replace this with YOUR config from firebase.ts)
firebase.initializeApp({
  apiKey: "AIzaSyCyuA8a7CPMAC8YKMXcJ5o1-7FDYBEjfcA",
  authDomain: "sticker-responses.firebaseapp.com",
  projectId: "sticker-responses",
  storageBucket: "sticker-responses.firebasestorage.app",
  messagingSenderId: "768304605509",
  appId: "1:768304605509:web:030aca38010148f03af62c"
});

// 3. Set up the background listener
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Hopeline';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new message.',
    icon: '/favicon.ico', // You can change this to a logo path later
    badge: '/favicon.ico',
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
