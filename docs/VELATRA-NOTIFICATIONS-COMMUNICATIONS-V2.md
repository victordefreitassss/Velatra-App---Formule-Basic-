# Notifications et communications V2 — Mission 17

Base : `059ae6048aebbe5a22fb1506e9b7aa6afe043300`. Branche : `feat/notifications-communications-v2`.

## Fonctionnement

L’événement métier et sa notification sont écrits dans la même transaction Admin Firestore. Le badge compte les notifications V2 non lues de l’utilisateur authentifié. La page Notifications est accessible par une cloche de 44 px sur téléphone et desktop, sans nouvel onglet mobile principal. Toutes / Non lues, lecture / non-lecture, ouverture et « Tout marquer comme lu » passent par des API authentifiées. Les anciennes notifications disposent d’un onglet de lecture séparé.

La destination réutilise `DashboardLocationState` : conversation membre, réservation, bilan membre ou Client360 / Suivi. Seules ces destinations sont autorisées ; aucune URL fournie dans un payload ne devient une navigation. Un push contient un ID opaque. Son clic ouvre `/dashboard?notification=<id>` ; après authentification, l’API résout uniquement une notification appartenant au compte courant. Un ID étranger ouvre le centre sans révéler sa destination. Le contexte est conservé en session pendant le login. Les anciennes destinations ne donnent aucun droit supplémentaire.

## Modèle et stockage

`notifications/model.ts` définit `NotificationV2` : id, clubId, recipientUid (UID Firebase), category, type, title, body, destination, sourceType, sourceId, eventKey, createdAt ISO, readAt nullable, priority, pushEligible.

Les catégories sont MESSAGE, PLANNING, COACHING, FOLLOWUP, SALES, SYSTEM. COACHING et SYSTEM sont disponibles pour des événements serveur futurs ; aucune API ne permet de fabriquer un événement arbitraire.

- `notificationInboxes/{SHA256(clubId, uid)}` : métadonnées et compteur `unreadCount`.
- `notificationInboxes/{inbox}/items/{SHA256(clubId, eventKey, recipientUid)}` : notification et état interne push.
- `notificationPreferences/{inbox}` : opt-in global, booléens par catégorie, date de passage à l’opt-in.
- `pushDevices/{inbox}/devices/{deviceId}` : uid, clubId, token FCM, platform, createdAt, lastSeenAt, enabled.
- `pushTokenOwners/{SHA256(token)}` : propriétaire du token sur un navigateur partagé. Un transfert désactive l’ancien appareil ; une rotation ne supprime pas la propriété d’un autre compte.

Le compteur est modifié atomiquement avec la création ou la lecture. Le client consulte ce seul document via API toutes les 30 secondes si la page est visible, au focus et après mutation/push foreground. Les listes sont paginées à 20, avec plafond API de 50. Pas de chargement de toutes les notifications du club. « Tout lu » traite au maximum 4 000 éléments par appel en transactions de 200 ; `more: true` permet un nouvel appel. L’index local `items: readAt ASC, createdAt DESC, __name__ DESC` est nécessaire au filtre Non lues en production.

## Événements

| Action concrète | Notification | Destinataire / destination |
| --- | --- | --- |
| Nouveau message serveur | MESSAGE_RECEIVED | Autre participant ; conversation concernée |
| Réservation coaching créée | BOOKING_CREATED | Membre et coach, sauf auteur ; planning / réservation |
| Déplacement réel | BOOKING_RESCHEDULED | Membre ; nouveau coach si changement, sauf auteur |
| Annulation réelle | BOOKING_CANCELLED | Parties concernées, sauf auteur |
| Essai réservé Sales V2 | TRIAL_BOOKED | Coach affecté, sauf auteur |
| Bilan affecté, y compris initial | FOLLOWUP_ASSIGNED | Membre ; questionnaire concerné |
| Réponse à un bilan | FOLLOWUP_RESPONDED | Coach affecté Studio ou Owner canonique Solo ; Client360 / Suivi |

Aucun événement sur un recalcul onboarding, un changement SHOWED_UP / NO_SHOW, une action Pulse ou un recalcul Retain. Pulse décrit les actions à faire ; Notifications décrit ce qui vient de se produire. Retain reste dans Retain, Pulse et Home, sans push « client critique ».

`PROGRAM_READY` est différé : le builder actuel publie côté client et ne fournit pas un trigger serveur fiable. Pas de réécriture du builder, de campagne, de cron ou de faux rappel « dans deux heures ». Les annonces Super Admin restent hors scope.

## Autorité et déduplication

`server/notifications.ts` centralise le contrôle de profil, club actif, suspension, Owner canonique et Manager Studio. Les identités du corps HTTP sont ignorées. Les écritures V2, devices et préférences sont réservées au serveur. Les événements comportent une clé déterministe ; la notification utilise `tx.create` et le contrôle de retry métier précède l’écriture.

`POST /api/messages` résout le destinataire dans le club, vérifie l’affectation et crée message + notification atomiquement. Le client fournit un requestId UUID conservé lors d’un échec pour rejouer le même envoi. Identité stable par club, auteur et requestId ; un contenu différent sur le même requestId donne 409. Texte limité à 5 000 caractères, pièces jointes image/PDF limitées à 960 000 caractères encodés. Le client conserve son texte après refus. Les messages V2 ont senderUid / recipientUid ; les champs numériques from / to restent pour les listeners historiques, avec règles propres au participant.

Les réservations réutilisent leurs identités et gardes transactionnelles existantes. Une révision distingue création, déplacement et annulation réels. Un retry confirmé, annulé ou sans changement ne recrée rien. Les anciens bookings sans UID canonique peuvent manquer une notification d’annulation : aucune migration des données production n’est effectuée.

L’affectation de bilan utilise le requestId stable envoyé par l’interface. Pour compatibilité, les anciens appels sans requestId restent acceptés et représentent une nouvelle affectation à chaque appel ; ils ne doivent pas être rejoués automatiquement. La réponse est identifiée par assignmentId + échéance et reste idempotente.

## Rôles

| Rôle | Politique |
| --- | --- |
| Member | Son inbox seulement, messages avec coach affecté ou Owner Solo, séances et bilans propres ; aucune notification Sales interne |
| Solo Owner | Messages privés avec ses membres, réponses de bilans et planning pertinent ; aucune notification de ses propres actions |
| Studio Coach | Membres affectés, conversations et séances pertinentes ; pas d’inbox global Studio |
| Studio Manager | Inbox propre et opérations autorisées ; ni interception de conversation ni copie de chaque bilan |
| Studio Owner | Inbox propre et opérations pertinentes ; pas de copie générale des conversations ou réponses de bilans |

Le refus cross-club, la suspension et l’inactivité sont contrôlés côté serveur. Les deep links conservent les contrôles de la page cible. Les contacts historiques Owner/Manager restent visibles dans l’interface existante, mais l’envoi privé V2 est refusé par l’API s’il ne satisfait pas la relation autorisée ci-dessus.

## Push et confidentialité

L’opt-in est un clic explicite « Activer les notifications push » dans le centre. Aucune demande de permission au login. Permission refusée : explication des réglages navigateur, sans nouvelle sollicitation. États : Non configurées, Activées, Refusées, Indisponibles. L’utilisateur peut changer Messages, Planning, Coaching / Suivi et Commercial (staff). L’in-app transactionnel reste actif même si le push est désactivé.

`notifications/client.ts` enregistre un identifiant d’appareil local et récupère le token via Firebase Messaging, après consentement. Le token est envoyé à l’API, pas enregistré dans User ni dans localStorage. La resynchronisation au focus ne concerne que le compte ayant déjà consenti sur cet appareil, avec permission granted et préférence active. Le client vérifie encore l’UID après récupération du token. Le logout efface l’opt-in local, désactive l’appareil et tente deleteToken ; hors ligne, la désactivation distante reste best-effort. Chaque appareil est désactivable indépendamment ; plafond 30 appareils par utilisateur.

La clé VAPID publique utilise `VITE_FIREBASE_VAPID_KEY`, avec fallback sur la clé publique Firebase déjà présente avant la mission. Aucun nouveau secret ni token Admin dans le frontend. Livraison serveur par `firebase-admin/messaging`, data-only, avec `/sw.js` comme service worker unique. L’ancien chemin `/firebase-messaging-sw.js` importe ce worker pour compatibilité.

Les tokens V2 ne sont ni affichés, ni loggés, ni renvoyés dans GET devices, ni accessibles par SDK Firestore. `User.fcmToken` historique n’est plus écrit ou utilisé par V2 ; il n’est pas purgé. Les règles historiques User peuvent encore exposer ce champ aux lecteurs de profil existants : sa suppression doit relever d’une migration distincte, avant de promettre la confidentialité absolue de tous les anciens tokens.

Les titres et textes des notifications sont des constantes génériques, sans nom, email, message, réponse de bilan, donnée santé ou Stripe. Le worker ignore même un titre/texte sensible reçu et affiche toujours « Velatra — Une nouvelle notification vous attend dans Velatra. ». En foreground, il rafraîchit le badge et ne produit pas de deuxième toast. Le clic transporte seulement l’ID opaque.

## Livraison et limites

Le dispatcher est une abstraction testable avec transport injecté. Il réclame chaque notification en transaction avant une tentative vers chacun des appareils actifs. Preferences / catégories / date d’opt-in sont vérifiées ; aucun envoi d’historique à l’activation. Un token invalide désactive uniquement l’appareil concerné si son token n’a pas été remplacé entre-temps. Un échec temporaire conserve l’appareil et ne fait jamais échouer l’action métier déjà enregistrée.

Livraison best-effort : pas de scheduler, de retry automatique ou de garantie exactly-once FCM. Un arrêt après claim peut perdre un push ; la notification in-app reste disponible. Le dispatcher traite au maximum 20 éléments pending par appel. Aucun push réel n’est autorisé lorsque les émulateurs, CI ou NODE_ENV=test sont actifs ; tous les tests injectent un transport factice. La réception réelle sur iOS/PWA/Android/Mac reste à valider sur appareils consentants après release.

## API

GET notifications/bookings/:bookingId (projection limitée à une séance propre ou aux opérations autorisées, jamais au dossier privé du membre), GET notifications (cursor, limit, unread, legacy), GET notifications/unread-count, GET notifications/:id, POST notifications/:id/read ou unread, POST notifications/read-all, GET / PUT notifications/preferences, GET / POST notifications/devices, DELETE notifications/devices/:deviceId. Toutes nécessitent Firebase Auth et profil actif ; aucune API publique de création de notification.

## Rules et release

FIRESTORE RULES CHANGED = YES. STORAGE RULES CHANGED = NO. DEPLOYMENT REQUIRED = YES.

Les règles retirent la création SDK des messages et notifications historiques, autorisent uniquement les reçus de lecture des messages destinés au compte, et la lecture V2 propre au recipientUid. Les collections appareils, propriétaires de tokens et préférences sont interdites au SDK. L’index est déclaré pour la base default dans firebase.json ; les deux bases conservent leur configuration de règles. Les nouveaux services serveur utilisent la base Admin default STANDARD ; aucune nouvelle requête client vers la base Enterprise n’est introduite.

Aucun déploiement Firebase dans cette mission, aucune modification de données production et aucun merge. Après approbation/merge, coordonner une release séparée des règles/index et de l’application : une ancienne version frontend qui crée encore les messages par SDK sera refusée une fois les règles resserrées. Préserver les autres index de production lors de la release : ce fichier décrit uniquement le nouvel index de la mission et ne constitue pas un inventaire de suppression. Attendre l’index READY avant de valider Non lues en production. Firebase Admin Messaging doit disposer des permissions FCM du compte de service serveur existant ; aucun secret ou droit cloud n’est inventé ici.

## Validation

- Tests moteur : retries concurrents, read/unread atomiques, conversations affectées, scopes/roles, destinations, opt-out, cutoff, transport fake multi-device, token invalide et panne, événements planning et essais.
- Tests HTTP avec Firebase Auth emulator : sender/club forgés ignorés, cross-scope refusé, pagination 100 éléments, read-all, rotation/transfert de tokens, préférences, suspension/inactivité, bilan Studio et Solo, compatibilité historique.
- Rules : lecture propre UID, refus de notification forgée / SYSTEM, absence d’accès SDK aux devices/préférences, messages serveur uniquement et reçus propres.
- Worker : payload sensible ignoré, navigation same-origin opaque, absence de toast doublé foreground.
- QA Chromium isolée : 4 rôles × 4 formats (390×844, 820×1180, 1440×900, 1920×1080) × 0/1/20/100 notifications ; badge, pagination, lu/non lu/tout lu, filtres, destinations, préférences, permission granted simulée et denied. Aucun appareil production. Le vrai RootApp vérifie aussi les ouvertures conversation / booking / Client360 Suivi pour les rôles staff et Member, ainsi que la réservation d’un nouveau coach hors portefeuille privé.
- Validation locale : lint, build et git diff --check verts ; npm run test:emulators : 673 tests applicatifs + 5 garde-fous CI verts. 22 tests Notifications ajoutés. QA Notifications intégrée à Mobile browser regression ; 64 cas de matrice + 4 cas denied, et 43 contrôles RootApp / destinations. La suite Mobile browser regression vérifie aussi les foundations existantes. Aucun push réel. Les validations distantes CI / navigateur / Vercel doivent porter sur le HEAD de la PR avant sa remise.

Références Firebase : [gestion des tokens](https://firebase.google.com/docs/cloud-messaging/manage-tokens), [réception web](https://firebase.google.com/docs/cloud-messaging/web/receive-messages), [API Messaging web](https://firebase.google.com/docs/reference/js/messaging).
