# Planning Velatra

## Architecture et état réel

`CalendarPage` reste l'entrée « Séances » de l'adhérent : elle présente son programme et ses prochaines réservations, puis ouvre `PlanningPage` pour réserver. `PlanningPage` est le moteur visuel commun : agenda et vues jour/semaine pour le coach, choix de créneau et confirmation pour l'adhérent. Client 360 affiche une projection filtrée des `bookings` du membre ; il ne possède pas de moteur de réservation distinct. Le passage Client 360 → Planning transmet seulement `planningMemberId` dans l'état de navigation éphémère, et le bouton « Retour au dossier » conserve ce contexte. La navigation globale l'efface selon `dashboardNavigation`.

La source de vérité demeure `bookings` et `Club.settings.booking`. Les disponibilités hebdomadaires sont stockées dans `settings.booking.schedule` (jour, plage, type facultatif, coach facultatif) et converties en créneaux à l'affichage ; aucun document futur n'est créé par créneau. `sessionTypes` définit le nom, la durée et `maxParticipants`. Une capacité de 1 est individuelle ; une capacité supérieure permet plusieurs membres au même **horaire, coach et type**. Des types ou horaires partiellement superposés pour un même coach sont refusés côté serveur. Les essais CRM conservent `type: trial` et n'exigent pas de disponibilité hebdomadaire ; ils restent hors du parcours de réservation adhérent.

```text
AVAILABILITY (Club.settings.booking.schedule)
    ↓
GENERATED SLOT (heure de Paris)
    ↓
RESERVATION (transaction serveur)
    ↓
BOOKING (Firestore)

BOOKING → CANCEL → éventuel REFUND, une seule fois
BOOKING → RESCHEDULE → NEW SLOT, sans nouveau débit
```

Le document `Booking` conserve `clubId`, `memberId` ou `prospectId`, `coachId` (identifiant numérique sur les nouvelles réservations), heures ISO, statut, type et éventuellement `sessionTypeId`. Les champs optionnels `memberUid`, `assignedCoachUid` et `creditDebited` sont écrits par le serveur : ils servent aux droits, à l'isolation et au remboursement. Le frontend ne les modifie pas. Les anciens essais peuvent encore porter un `coachId` Firebase UID ; leur lecture et leur annulation restent compatibles.

## Opérations et crédits

`POST /api/bookings/reserve` vérifie le profil, le club, le membre, le coach, le type, la disponibilité, la durée, les conflits, la capacité et les limites de réservation. L'ID déterministe rend un double clic ou un retry sur la même réservation idempotent. Les verrous transactionnels par coach/jour **et** membre/jour sérialisent la dernière place ainsi que deux réservations simultanées du même membre auprès de coachs différents. Les verrous ne sont pas des données métier.

La politique historique est conservée : lorsqu'un membre réserve lui-même, un crédit général ou propre au `sessionType` est débité dans la transaction ; lorsqu'un coach ou propriétaire planifie, aucun crédit n'est débité. `minAdvanceBookingHours` et `maxBookingsPerWeek` s'appliquent à la réservation faite par le membre. `POST /api/bookings/cancel` respecte `minCancellationHours` pour le membre et rembourse exactement une fois si `creditDebited` était vrai. `POST /api/bookings/reschedule` est réservé au propriétaire ou au coach affecté, vérifie le nouveau créneau dans une seule transaction et conserve l'ID du booking, son statut de crédit et tout lien `Program.bookingId`. Le type de séance ne change pas pendant le déplacement. Le membre peut annuler puis réserver selon les règles existantes, mais ne dispose pas encore d'un bouton « Déplacer » autonome.

`POST /api/bookings/trial` remplace l'ancienne écriture directe du CRM : la réservation d'essai et le statut du prospect changent dans la même transaction, sans crédit membre. `GET /api/bookings/availability?date=YYYY-MM-DD` renvoie seulement les **comptages** des séances confirmées de la semaine. Il n'expose aucun nom ni identifiant de participant et borne les comptes au coach du membre ou du salarié ; le serveur reste seul juge lors de la confirmation.

Les statuts réellement écrits ici sont `confirmed` et `cancelled`. La fin d'une séance peut marquer `completed` via `server/completeWorkout.ts`. `pending` et `rejected` restent lisibles pour les documents historiques ; le Planning ne crée aucune transition vers ces états. Les programmes préparés liés par `bookingId` sont signalés dans le détail ; les séances lancées depuis `CoachingPage` sans `bookingId` restent distinctes.

## Rôles et formats

- **Solo** : le propriétaire désigné par `club.ownerId` est le coach implicite. Le filtre multi-coachs est absent.
- **Studio propriétaire** : filtre des coachs du club et réservation pour tout membre du club. Les rendez-vous existants restent visibles dans la grille. Les conflits sont toujours vérifiés côté serveur.
- **Studio salarié** : uniquement ses membres affectés et ses propres créneaux. Un `memberId` ou `coachId` envoyé par le navigateur ne suffit jamais à autoriser l'opération.
- **Adhérent** : parcours court « type (si plusieurs) → date → créneau → confirmation », solde général ou par type, places restantes, délai d'annulation. La disponibilité est vérifiée avant d'ouvrir la confirmation ; aucun crédit n'est décrémenté avant la réponse serveur.
- **Téléphone coach (320–767 px)** : agenda du jour, navigation jour par jour, cartes de rendez-vous et action `+ Rendez-vous`. La semaine n'est pas réduite en grille miniature.
- **Tablette (768–1023 px)** : vues jour/agenda et résumé de semaine ouvrant la journée ; actions accessibles au toucher.
- **Desktop (≥1024 px)** : semaine avec axe horaire et colonnes de jours, filtres, détails et création depuis un créneau ; vues jour et agenda disponibles.
- **Grand écran (≥1536 px)** : le détail de réservation se place dans un panneau latéral, avec un calendrier qui conserve sa largeur utile.

Les heures de réservation et les semaines métier sont interprétées en `Europe/Paris`. Les créneaux de l'heure inexistante au passage à l'été et ceux dont la durée serait étirée au passage à l'hiver ne sont pas proposés. Une timezone propre à chaque club nécessiterait une migration explicite du modèle et n'est pas incluse.

## Sécurité, exploitation et limites

`firestore.rules` interdit désormais les créations et modifications directes de `bookings` depuis le SDK client. Les lectures restent limitées par `canReadMemberRecord`. Les fonctions serveur utilisent l'Admin SDK, qui contourne ces règles et effectue toutes les mutations autorisées. **Après fusion, publier séparément ces règles sur les deux bases Firestore configurées dans `firebase.json`** ; un déploiement Vercel ne les publie pas. Ne considérer la protection effective en production qu'après vérification des releases des deux bases. Les tests d'émulateur couvrent la lecture isolée et le refus d'écriture directe.

Les essais historiques sans `memberUid` peuvent encore être annulés par le propriétaire ou leur coach. Les réservations coaching historiques sans `memberUid` peuvent être déplacées si le membre numérique est résolu sans ambiguïté. Les anciennes réservations déjà créées ne sont ni migrées ni modifiées automatiquement.

Les éléments suivants restent différés : liste d'attente, salles et multi-sites, récurrence de cours, présence/contrôle d'accès, synchronisation de calendriers externes, déplacement en autonomie par l'adhérent et timezone par club. L'agrégation de disponibilité lit aujourd'hui les réservations confirmées du club avant de réduire à la semaine ; à forte volumétrie, il faudra une requête bornée par période et l'index Firestore correspondant.
