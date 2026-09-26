importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAY7wpl0pigmWaUg4JRA_0y_dKAjnX17nA",
  authDomain: "velatra-75daa.firebaseapp.com",
  projectId: "velatra-75daa",
  storageBucket: "velatra-75daa.firebasestorage.app",
  messagingSenderId: "686153399642",
  appId: "1:686153399642:web:e9283968d105d098dac763"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Nouvelle notification';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: payload.notification?.icon || '/brand/velatra-mark.png',
    badge: '/brand/velatra-mark.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
