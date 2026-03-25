importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAY7wpl0pigmWaUg4JRA_0y_dKAjnX17nA",
  authDomain: "velatra-75daa.firebaseapp.com",
  projectId: "velatra-75daa",
  storageBucket: "velatra-75daa.firebasestorage.app",
  messagingSenderId: "686153399642",
  appId: "1:686153399642:web:5c28ff2d0872ad4cdac763"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Nouvelle notification';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: payload.notification?.icon || 'https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png',
    badge: 'https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
