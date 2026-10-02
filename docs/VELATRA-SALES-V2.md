# Velatra Sales V2 — Mission 15

Base : `ec365cbd6cc42502049badca310e3c1eba9ef890`, après intégration de Retain V1 (`02391bda2bc0f6a518da2c8917dbb9f45b09020c`). Branche : `feat/sales-v2`. Aucune migration de données, aucun déploiement Firebase et aucun merge pendant cette mission.

## Sources et pipeline

Le CRM existant propose **Pipeline / Essais / Performance**. Ses données restent `prospects`, `bookings` de type `trial` et la conversion serveur existante. `CRMClient`, `CRMFormula`, `ManualStats`, `DailyLog` et `PendingProspect` ne participent pas aux calculs. Retain continue de traiter les adhérents, séparément des prospects.

La création manuelle, les étapes Nouveau/Contacté/À relancer/Perdu, la relance et l'affectation sont orchestrées sur le serveur. Essai requiert une vraie réservation ; Gagné utilise exclusivement `POST /api/prospects/:id/convert`. Aucun changement de présence ne convertit le prospect ou ne le classe perdu. Les notes restent modifiables par SDK ; leur texte et `activityHistory` ne sont jamais parsés pour le funnel. Les dossiers gagnés restent protégés contre une nouvelle transition commerciale.

## Présence, annulation et corrections

L'`AttendanceStatus` existant reste le type canonical : `PENDING`, `SHOWED_UP`, `NO_SHOW`, `CANCELLED`. Aucun deuxième enum. Les helpers serveur utilisent des imports de types pour préserver l'exécution native Node du graphe API.

Nouveaux essais : `prospectUid` et `prospectId`, `coachUid` et `coachId`, `assignedCoachUid` pour la souscription planning existante, présence initiale `PENDING`. La saisie ajoute `attendanceMarkedAt`, `attendanceMarkedByUid`, `attendanceUpdatedAt`, `attendanceUpdatedByUid` et une petite `attendanceRevision`. La première marque reste conservée ; la dernière modification identifie son acteur.

`POST /api/bookings/:bookingId/attendance` accepte uniquement `{ attendanceStatus: "SHOWED_UP" | "NO_SHOW" }`. Une transaction relit l'acteur, son club, le booking, le prospect et le Coach. Les champs club/prospect/coach/rôle du navigateur ne sont pas des autorités et sont rejetés dans ce body. Présence et no-show sont possibles à partir de `startTime`, jamais avant. Un booking techniquement `completed` sans présence reste inconnu. Le statut technique reste inchangé après la saisie : Planning conserve son fonctionnement ; les libellés commerciaux utilisent exclusivement la présence.

Une correction d'une présence finalisée demande une confirmation UI, accessible au clavier avec focus et retour de focus. Chaque transition écrit un événement, sa date, son acteur et une entrée humaine. Un retry du même résultat ne crée aucun événement supplémentaire ; les transactions sérialisent les retries concurrents.

Annuler utilise le flow réel `POST /api/bookings/cancel`, qui écrit `CANCELLED`, `TRIAL_CANCELLED` et l'activité de façon atomique. Une présence déjà finalisée ne peut pas être transformée en annulation. Un créneau annulé n'est pas réécrit par un retry de réservation : choisir un nouveau créneau conserve l'ancien rendez-vous. Ni annulation ni présence inconnue ne sont des no-shows.

## Événements structurés

`salesEvents` est une collection server-only, inaccessible en lecture/écriture SDK. Format minimal : `eventType`, `at`, `prospectUid`, `clubId`, et si disponibles `actorUid`, `bookingId`, `coachUid`, `sourceSnapshot`, `correction`.

Types : `LEAD_CREATED`, `CONTACTED`, `TRIAL_BOOKED`, `TRIAL_SHOWED_UP`, `TRIAL_NO_SHOW`, `TRIAL_CANCELLED`, `CONVERTED`, `LOST`.

Création publique : le formulaire validé existant et `LEAD_CREATED` sont écrits dans le même batch, sans inventer d'acteur authentifié. Création manuelle : clé stable par acteur/club/requestId, transaction idempotente. Réservation/annulation : clé stable par booking. Présence : clé par booking/révision. Conversion : clé stable par UID prospect dans la transaction finale de l'opération existante, conservant Auth, claims, compensation, affectation et liens adhérent. Son retry conserve un seul événement logique. Les conversions historiques déjà liées sont consultables sans fabriquer un événement rétrospectif.

Le snapshot CONVERTED conserve la source originale et, quand fiable, le Coach du dernier essai présent avant conversion. Il évite qu'une correction ultérieure réécrive l'attribution commerciale.

## Funnel et cohorte

`GET /api/sales/overview?from=YYYY-MM-DD&to=YYYY-MM-DD` authentifie et calcule côté serveur. La **cohorte** contient les prospects dont la date de création est dans les journées Paris inclusives `from` et `to`. Préréglages 7/30/90 jours et bornes personnalisées. Les résultats de ces prospects sont observés jusqu'à l'instant de lecture, y compris après la fin de la période de création. UI : **Conversions observées à ce jour** ; une cohorte récente n'est pas un résultat final.

| Étape | Preuve |
|---|---|
| Lead | Prospect réellement créé (`date`) |
| Contacté | Au moins un événement structuré CONTACTED |
| Essai réservé | Au moins un vrai booking trial, y compris annulé |
| Présent | Au moins un trial explicitement SHOWED_UP, commencé |
| Converti | Lien `convertedMemberUid` issu de la conversion serveur ; `won` seul ne suffit jamais |
| Perdu, séparément | Statut lost avec un `lostAt` valide |

Ces ensembles ne sont pas nécessairement imbriqués : une conversion directe est possible. Plusieurs essais ne comptent qu'une fois pour chaque étape prospect. Les statistiques de rendez-vous comptent chaque booking et son résultat courant ; les corrections restent dans l'historique événementiel.

Ratios et dénominateurs affichés : contactés/leads ; prospects avec essai/leads ; prospects présents/prospects avec essai ; **prospects à la fois présents et convertis/prospects présents** ; convertis/leads. Une conversion directe ne gonfle pas le ratio présent→adhérent. Dénominateur nul : 0%, avec `0/0` visible.

No-show : nombre de rendez-vous NO_SHOW / nombre de rendez-vous (SHOWED_UP + NO_SHOW), dans la même cohorte, commencés à l'instant de lecture. Annulés, futurs et non renseignés sont exclus du dénominateur. Une erreur corrigée retire le booking de son ancien groupe et conserve sa trace humaine et structurée.

## Sources et attribution Coach

Les sources sont regroupées par trim/casse/accents uniquement au calcul. La valeur historique n'est pas réécrite ; les sources personnalisées sont conservées. Sources inconnues : `non renseignee`. Chaque ligne utilise exactement la même cohorte et affiche leads, essais réservés, présents, convertis et convertis/leads. Pas de CA attribué, de Stripe, de paiements ou de revenus Owner dans Sales.

Vue Coach uniquement en Studio pour Owner/Manager : rendez-vous présents, no-shows et conversions liées. Attribution au dernier trial SHOWED_UP dont le début et la saisie de présence précèdent la conversion ; égalité de derniers rendez-vous, date inconnue, Coach absent ou identité ambiguë => **Non attribué**. Le snapshot serveur d'une nouvelle conversion prévaut. Sans snapshot historique, le fallback utilise les liens uniques actuels et n'attribue pas une présence corrigée après conversion. Le taux Coach utilise les prospects présents distincts chez ce Coach et leur intersection avec les conversions qui lui sont attribuées, pas le nombre de rendez-vous. Ordre alphabétique, aucun podium.

## Rôles et affectation

| Acteur | Sales global | Présence |
|---|---|---|
| Solo Owner | Complet, sans vue équipe ; responsable implicite | Essais de son espace |
| Studio Owner | Funnel, sources, essais, résultats Coach, affectation | Essais de son Studio |
| Studio Manager | Même cockpit opérationnel, aucune finance sensible | Essais de son Studio |
| Studio Coach | Aucun funnel/global analytics ; liste de ses essais dans Planning | Uniquement Coach réel du trial |
| Member / Superadmin | Refus API Sales | Refus |

La politique existante de conversion CRM est réutilisée sans étendre ses droits. Owner/Manager affectent un responsable prospect uniquement à un utilisateur `role=coach` actif du même Studio, ou désaffectent. Coach ne peut pas s'approprier un prospect. Aucun rôle commercial nouveau.

Acteur suspendu, club inactif, Owner détaché de `club.ownerId`, autre club : refus. La lecture spécifique d'un trial permet à Pulse d'ouvrir un rendez-vous historique même lorsqu'il n'est pas dans les souscriptions SDK du Coach. Elle expose uniquement les noms prospect/Coach et le rendez-vous, sans fiche CRM complète. Un essai dont les liens canoniques ne peuvent pas être vérifiés reste à régulariser avant toute saisie.

## Pulse et opérationnel

Les mêmes helpers purs de présence, jointures et signaux servent Sales et Pulse.

- `TRIAL_ATTENDANCE_MISSING` : essai commencé, PENDING/inconnu ; staff du club et Coach réellement concerné. Disparaît après saisie explicite.
- `TRIAL_NO_SHOW_FOLLOWUP` : dernier essai NO_SHOW, prospect actif, aucun essai futur confirmé, aucune relance datée déjà prévue. Une relance échue est prise en charge par le signal de rappel existant, évitant un doublon. Nouvel essai/relance/conversion/perte supprime ce signal. Historique bookings/prospects partiel : pas de signal d'absence de follow-up.
- Aucun signal automatique d'après-essai présent : la variante optionnelle à 24h est différée. Aucun rappel immédiat une minute après l'essai.

Sur téléphone, Essais privilégie les présences à renseigner, avec accès aux essais à venir et no-shows ; Performance est un onglet secondaire. Prospect 360 expose source, responsable, essais paginés, dernier résultat, présence, relance et historique existant. Présent : Convertir/Relancer. No-show : Reprogrammer/Relancer/Perdu avec la confirmation existante. Aucun automatisme.

## Historique et qualité

Un ancien trial sans attendance reste non renseigné, jamais converti en présence/no-show par défaut. `date`, lien adhérent/`convertedAt`, statut lost/`lostAt` restent les seuls fallbacks légitimes. Le contact historique ne se déduit ni du statut ni d'un texte d'activité. Les nouveaux essais ont des UID explicites ; les anciens identifiants numériques ne sont joints que si uniques dans le club. Un UID explicite invalide ne retombe jamais sur une identité numérique. Un ancien prospect sans id numérique utilise le hash stable déjà partagé par le CRM.

L'UI indique les essais historiques sans présence dans la cohorte, les dates de création inconnues et les bookings sans lien prospect fiable dans le club. Un lien incomplet/ambigu réduit les métriques prouvables et n'est jamais deviné.

## Performance et sécurité des champs

Overview : quatre requêtes club, sans requête par prospect, ni lecture de finance : prospects (5 000), bookings (10 000), salesEvents (20 000), users/roster (2 000). Les outcomes pouvant se produire après la période de création, ces sources bornées sont lues par club et la cohorte est filtrée par date côté serveur. Pour 500 prospects et plusieurs centaines d'essais, les calculs utilisent des index en mémoire. Aucun index composite nouveau requis.

Chaque source lit cap+1 et signale `partial=true`/`partialSources` si tronquée. Un historique numérique partiel ne peut pas prouver l'unicité d'un lien. Essais : 20 lignes par défaut, maximum 50, pagination bornée et rafraîchissement 60s/focus. La pagination opérationnelle par offset n'est pas un snapshot figé : un changement concurrent peut déplacer les pages ; actualiser la liste. Changement d'utilisateur/club : réponse obsolète ignorée et lecture annulée.

Firestore Rules changées : création et champs analytiques des prospects server-owned ; seuls notes/notesHistory/activityHistory restent modifiables par SDK. Les nouveaux prospects ne sont pas supprimables via SDK, même si l'activité humaine est vidée. La politique de suppression limitée des anciens dossiers sans historique demeure ; aucun effacement de production n'est exécuté par cette mission. Les événements et les mutations de bookings sont interdits par SDK.

**FIRESTORE RULES CHANGED YES. STORAGE RULES CHANGED NO. DEPLOYMENT REQUIRED YES.** Règles et serveur/client doivent être publiés de manière coordonnée avant utilisation en production. Aucun déploiement Firebase Rules, Hosting ou Functions pendant cette mission.

## Validation et limites

Tests purs : cohortes 0/1/100/500, ratios exacts, essais multiples, présence inconnue, annulation, sources, Paris/DST, attribution et ambiguïtés, résultats partiels et Pulse. HTTP avec Auth/Firestore émulés : timing, rôles, cross-club, corrections, retries/concurrence, création/étapes/affectation, conversion, 500 prospects avec quatre requêtes et historique spécifique. Rules émulées : interdiction des événements et champs analytiques SDK, notes encore autorisées.

QA Chromium isolée : RootApp, CRM, Sales, essais Planning et Pulse, quatre rôles staff, quatre dimensions (390×844, 820×1180, 1440×900, 1920×1080), 0/1/100/500 prospects, groupes de présence, pagination et corrections au clavier. Fixtures synthétiques, aucun accès production ; il ne s'agit pas de tests sur iPhone physique. Le workflow Mobile browser regression archive les résultats et captures Sales.

Validation complète finale et résultats : voir le rapport de PR. Pas de backfill, de campagnes email/SMS/WhatsApp, de revenu approximatif, d'IA commerciale, de refonte ou d'onboarding automatique. Avant la prochaine mission : merge explicite puis release coordonnée, améliorer si nécessaire les liens historiques non attribuables, définir les étapes onboarding et leur idempotence. La conversion existante fournit déjà le point d'entrée ; questionnaire/bilan/programme/échéances automatiques ne sont pas construits ici.

Validation locale finale : lint OK, build OK (avertissement de taille des chunks déjà présent), `test:emulators` **563/563 tests applicatifs + 5/5 garde-fous CI** ; aucun skip. **71 tests ajoutés** : 35 purs, 27 HTTP, 9 Rules. QA Sales **788 contrôles / 0 échec**, matrice complète et pagination à 500 prospects. `git diff --check` OK. Les checks distants CI, Mobile browser regression et Vercel sont suivis sur la PR avant remise du résultat.
