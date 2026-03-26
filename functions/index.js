const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// 1. Notification when a new message is received
exports.onNewMessage = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    
    // Get the recipient's user document to get their FCM token
    const userDoc = await admin.firestore().collection('users').doc(message.receiverId.toString()).get();
    const userData = userDoc.data();

    if (userData && userData.fcmToken) {
      const payload = {
        notification: {
          title: 'Nouveau message',
          body: `Vous avez reçu un nouveau message.`,
          clickAction: 'FLUTTER_NOTIFICATION_CLICK' // Adjust based on your client app
        },
        data: {
          type: 'message',
          senderId: message.senderId.toString()
        }
      };

      try {
        await admin.messaging().sendToDevice(userData.fcmToken, payload);
        console.log('Notification sent successfully');
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }
  });

// 2. Notification when a new program is assigned
exports.onProgramAssigned = functions.firestore
  .document('programs/{programId}')
  .onCreate(async (snap, context) => {
    const program = snap.data();
    
    if (!program.memberId) return;

    const userDoc = await admin.firestore().collection('users').doc(program.memberId.toString()).get();
    const userData = userDoc.data();

    if (userData && userData.fcmToken) {
      const payload = {
        notification: {
          title: 'Nouveau programme',
          body: `Un nouveau programme d'entraînement vous a été assigné.`,
        },
        data: {
          type: 'program',
          programId: snap.id
        }
      };

      try {
        await admin.messaging().sendToDevice(userData.fcmToken, payload);
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }
  });

// 3. Notification when a new nutrition plan is assigned
exports.onNutritionPlanAssigned = functions.firestore
  .document('nutritionPlans/{planId}')
  .onCreate(async (snap, context) => {
    const plan = snap.data();
    
    if (!plan.memberId) return;

    const userDoc = await admin.firestore().collection('users').doc(plan.memberId.toString()).get();
    const userData = userDoc.data();

    if (userData && userData.fcmToken) {
      const payload = {
        notification: {
          title: 'Nouveau plan alimentaire',
          body: `Un nouveau plan alimentaire vous a été assigné.`,
        },
        data: {
          type: 'nutrition',
          planId: snap.id
        }
      };

      try {
        await admin.messaging().sendToDevice(userData.fcmToken, payload);
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }
  });

// 4. Notification when a file is shared in Drive
exports.onFileShared = functions.firestore
  .document('driveFiles/{fileId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if new users were added to sharedWith
    const newShares = after.sharedWith.filter(uid => !before.sharedWith.includes(uid));

    if (newShares.length > 0) {
      const payload = {
        notification: {
          title: 'Nouveau document partagé',
          body: `Le document "${after.name}" a été partagé avec vous.`,
        },
        data: {
          type: 'drive',
          fileId: change.after.id
        }
      };

      for (const userId of newShares) {
        const userDoc = await admin.firestore().collection('users').doc(userId.toString()).get();
        const userData = userDoc.data();

        if (userData && userData.fcmToken) {
          try {
            await admin.messaging().sendToDevice(userData.fcmToken, payload);
          } catch (error) {
            console.error('Error sending notification to user', userId, ':', error);
          }
        }
      }
    }
  });
