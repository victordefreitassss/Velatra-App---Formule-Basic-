importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
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
