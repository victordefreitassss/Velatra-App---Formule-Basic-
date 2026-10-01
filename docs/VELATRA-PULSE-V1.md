# Velatra Pulse V1 — mission 13

Base main: `11221d43bd678f623fed0fbd5d3d24f9bb9bcd3e` (12B). Branche: `feat/pulse-action-center-v1`. PR à laisser ouverte, sans merge ni déploiement production.

Pulse répond aux interventions nécessaires à partir des sources existantes. Il remplace l'affichage Action Center V0 des accueils 12B, sans refonte, score Retain, IA, prédiction, campagne ni notification push. Les autres sections et destinations 12B restent disponibles.

## Modèle et moteur

`pulse/pulseModel.ts` définit PulseAction: key, type, category, priority, title, reason, dueAt, createdFrom, identifiants métier, destination, quickActions, sourceFingerprint, group et état utilisateur. `pulse/pulseEngine.ts` dérive les cartes sans accès Firestore ni mutation. Le serveur fournit des faits vérifiés et les révisions de documents; les selectors 12B filtrent à nouveau les membres, tâches et réservations.

| Type | Source et condition fiable | Priorité |
| --- | --- | --- |
| CLIENT_INACTIVE | Dernière séance réelle connue > 7 jours; sinon création > 7 jours sans activité connue. Logs futurs ignorés. Client non pausé. | normal |
| PROGRAM_MISSING | Aucun programme commencé, exploitable (exercices) et non expiré; ou planRequested. Sessions planifiées exclues. | high |
| PROGRAM_ENDING | startDate valide + durationWeeks positif, fin dans les 14 jours. | high ≤ 7 jours, sinon normal |
| FOLLOWUP_DUE | Assignment actif, fréquence existante, échéance Paris aujourd'hui sans réponse canonique. | normal |
| FOLLOWUP_LATE | Même source, échéance passée; retard exprimé en jours calendaires réels. | urgent ≥ 7 jours, sinon high |
| MESSAGE_UNREAD | read === false, destinataire personnel, conversation membre du périmètre. | normal |
| TASK_OVERDUE | Tâche todo, dueDate valide passée, affectation autorisée. | urgent |
| TASK_TODAY | Même source, échéance aujourd'hui. | normal |
| TASK_UPCOMING | Même source, échéance future. | normal |
| PROSPECT_REMINDER_OVERDUE | nextReminderDate réelle passée, prospect ni won ni lost. | urgent |
| PROSPECT_REMINDER_TODAY | Même source, échéance aujourd'hui. Aucune date implicite pour call_pending. | normal |
| TRIAL_UPCOMING | Booking trial confirmé, début dans les prochaines 24 heures. | normal |
| CLIENT_UNASSIGNED | Client Studio actif sans assignedCoachUid, Owner/Manager seulement. | high |
| PAYMENT_ATTENTION | Subscription past_due/unpaid ou paiement failed; Owner seulement. | urgent |
| SUBSCRIPTION_ENDING | Subscription active, endDate ou commitmentEndDate valide dans les 30 prochains jours. | normal |

Les cartes sont triées urgent/high/normal, puis overdue/today/upcoming, puis instant croissant et clé stable. Les journées et rappels utilisent Europe/Paris et les helpers planning existants; les durées d'inactivité/programme utilisent des jours de 24 heures. Les données historiques sans échéance fiable ne fabriquent pas de fin. Le planning normal reste dans l'agenda; aucun no-show n'est inventé.

## Déduplication, occurrences et états

Une Map par clé élimine les doubles occurrences: followup:{assignmentId}:{dueDate}, task:{taskId}, prospectReminder:{uid}, programMissing:{uid}, inactive:{uid}, etc. Un paiement échoué lié à une subscription déjà signalée ne génère pas une seconde carte équivalente. Une conversation regroupe ses messages non lus.

sourceFingerprint est un SHA-256 d'un tableau de faits stables: dernière séance/création, programme et durée, assignment + échéance, IDs et dates des messages, échéance/affectation de tâche, prochaine relance/statut prospect, réservation ou statut billing. L'âge affiché et la priorité qui évolue avec le temps ne changent pas l'empreinte de la même occurrence.

Les révisions Firestore updateTime sont aussi utilisées pour les tâches, messages, paiements/subscriptions en attention, programmes existants, demande explicite de programme et client non affecté. Cela reconnaît une situation revenue après résolution avec les mêmes valeurs métier (par exemple affecté puis à nouveau sans coach). Sans journal spécifique à ces transitions, une autre modification de ces documents peut également rouvrir la carte: choix conservateur explicite, préférable à masquer une nouvelle intervention. Aucun timestamp métier n'est écrit pour produire Pulse.

État per-actor/per-club/per-key: open, handled ou snoozed, appliqué uniquement si le fingerprint correspond encore. Traité signifie « pris en charge »: ne modifie ni séance, ni programme, ni tâche, ni message, ni paiement. Une occurrence différente revient ouverte. Les causes résolues disparaissent à la dérivation suivante: programme exploitable, message lu, tâche done, affectation, relance déplacée, bilan reçu, etc.

Rappels: plus tard aujourd'hui (2 heures, plafonné à 23:59:59 Paris), demain, dans 3 jours ou 7 jours (09:00 Paris). À la toute fin de journée, le serveur demande de choisir demain. Expiration évaluée à la lecture, sans job et sans écriture; l'action revient ouverte. La vue Traité et la vue Rappels sont un historique léger des situations encore présentes, pas un audit métier permanent.

## API, persistance et sécurité

- GET /api/pulse: état open/handled/snoozed, group all/overdue/today/upcoming, catégorie autorisée, limit 1–50 (20 par défaut), cursor.
- POST /api/pulse/:actionKey/handled: sourceFingerprint uniquement.
- POST /api/pulse/:actionKey/snooze: sourceFingerprint + preset uniquement.

Le middleware Firebase vérifie le token. Pulse relit ensuite profil, club actif et politique opérationnelle. Identité UID provient du token, jamais du body ni des données de profil. Owner explicite doit toujours être club.ownerId; Manager nécessite Studio et capacité runtime valide. Member/Superadmin sont refusés, aucun agrégat plateforme. Aucun actorUid/clubId/role n'est accepté dans le body.

Les POST relisent profil, club, affectations et sources dans une transaction; redérivent l'action autorisée actuelle et comparent l'empreinte avant écriture. Action hors périmètre/résolue: 404; occurrence modifiée: 409. Les réaffectations et révocations rendent les anciens tokens/keys insuffisants.

Seule `pulseActionStates/{sha256(actorUid, clubId, key)}` est écrite: actorUid, clubId, key, sourceFingerprint, status, snoozedUntil éventuel, createdAt et updatedAt serveur. Aucun payload de carte ni source métier n'est copié. GET effectue exclusivement des lectures, y compris lors de l'expiration d'un rappel. Les états de deux utilisateurs restent indépendants. Le SDK client ne peut ni lire/lister/créer/modifier/supprimer cette collection: default-deny existant, testé explicitement pour Owner, Manager, Coach, Member, Superadmin et anonyme.

## Rôles

| Expérience | Pulse |
| --- | --- |
| Solo Owner | Coaching, clients, suivi, tâches, messages, planning, CRM et Business ensemble. |
| Studio Owner | Périmètre Studio, affectations, CRM et signaux Business Owner autorisés. |
| Studio Manager | Opérations Studio, clients sans coach, suivi, CRM, essais, planning, tâches. Aucun billing sensible, aucune requête subscriptions/payments. |
| Studio Coach | Membres dont assignedCoachUid = UID vérifié, suivis/programmes/conversations associés, tâches personnelles, réservations propres. Aucun pipeline global, non-affecté ni finance. |
| Member | Pas de Pulse ni de route staff. |
| Superadmin | Console séparée; API Pulse refusée, aucun événement multiclub. |

Les queries sont club-scoped et les membres Coach également assignment-scoped. Les documents métier hérités sont filtrés en mémoire à partir du roster canonique; le cache assignedMemberIds n'élargit jamais le périmètre. Stripe reste inchangé: Pulse lit des statuts autorisés et ouvre la facturation existante, sans opération Stripe.

## Surfaces et destinations

Accueil: maximum 5 cartes sur phone, 8 sur les autres formats, puis « Voir toutes les actions ». Page Pulse secondaire, filtres d'état/échéance/catégorie, liste paginée; aucun sixième onglet mobile. Les catégories interdites sont absentes. Phone = cartes factuelles et boutons ≥44px; desktop = même liste accessible, sans graphiques ni nouvelle mécanique de détail.

Navigation partagée dans useHomeDestination, réutilisant dashboardNavigation et l'état history 12B. Client, Coaching, Follow-up, conversation, tâche focusée, prospect et réservation conservent leurs destinations. Billing Owner ajoute le sous-onglet administratif existant, revalidé par MembersPage. Priorités écrites en texte, vrais boutons, select de rappel au clavier, focus visible, annonces de chargement/erreur et bouton de réessai.

Les sources chargées dans l'app provoquent un rafraîchissement différé de 500ms. Focus et minuteur 60s relisent Pulse; un changement de profil/périmètre annule les réponses et mutations UI périmées. Les mutations réussies relisent le flux. Les bilans peuvent donc disparaître au retour d'écran ou au prochain rafraîchissement; aucun listener SDK supplémentaire n'est ajouté pour l'état serveur.

## Volumétrie, caps et legacy

Roster: 1000 membres maximum; collections métier: 10000 documents chacune; états par acteur: 5000. Le serveur lit jusqu'au cap+1 pour annoncer explicitement les sources partielles. En cas de logs/programmes tronqués, les signaux d'absence correspondants sont supprimés plutôt que fabriquer une inactivité/programme manquant. Ces caps concernent les sources, distincts de la pagination des cartes.

Agrégation en mémoire, maps par membre; réponses Follow-up lues par getAll en batches de 250. Pas de requête par client. Le test serveur 500 clients mesure 11 queries de collection pour Owner, indépendamment du nombre de clients; Manager/Coach omettent les queries financières. Coût de lecture proportionnel aux documents du club; aucune promesse de cache serveur ou volumétrie illimitée. Les POST utilisent les mêmes lectures transactionnelles pour garantir l'autorité actuelle.

Cursor: offset + digest de l'identité, club, filtres et liste d'occurrences/états triée. Les changements invalident le cursor (409 + Actualiser Pulse); jamais une page d'un autre tenant. Le digest n'est pas une autorité d'accès: les actions sont toujours recalculées et filtrées avant pagination.

L'ancien CoachDashboard crée des tâches d'inactivité auto_ et anniversaire bday_. Il reste réservé au legacy et ne monte pas dans les expériences 12B. Pulse ignore ces IDs historiques pour éviter les cartes doubles; les tâches et leur historique restent disponibles dans Tasks. Les anniversaires n'ont pas de priorité Pulse V1. Aucune suppression/migration d'historique.

## Validation et publication

Tests ciblés: moteur pur (15 types, tri/dedup, nouvelles occurrences/révisions, rappels et DST, auto-résolution, politiques et 0/1/50/100/500 clients), API avec vrais tokens Auth emulator, 500 clients/queries fixes, refus SDK default-deny.

QA navigateur dédiée: RootApp/Home/Pulse réels et moteur partagé, transport API/Firestore synthétique; tous les accès externes bloqués. Solo/Studio Owner/Manager/Coach, 390×844, 820×1180, 1440×900, 1920×1080, 0/1/20/100 actions, pagination, filtres temporels, Traité/Rappel et destinations 12B. Les scénarios transport fixture ne remplacent pas les tests HTTP authentifiés. Les workflows existants conservent les régressions Member/legacy/12B et ajoutent Pulse; preuves JSON/PNG uploadées par CI.

Validation complète avant PR: npm run lint, npm run build, npm run test:emulators, git diff --check. Résultats finaux consignés dans la PR. Pas de merge automatique.

FIRESTORE RULES CHANGED = NO. STORAGE RULES CHANGED = NO. DEPLOYMENT REQUIRED = NO pour Firebase Rules/Hosting/Functions. Le code frontend/API nécessitera une publication applicative après review/merge; seule une preview Vercel liée à la PR est attendue dans cette mission. Aucune donnée production, aucun rôle ni Manager créés, aucune opération destructive, aucun déploiement Firebase.

Avant Retain V1: pas de score/prédiction, no-show sans présence, suivi de campagnes ni automatisation. Pas de migration des dates historiques insuffisantes, archive permanente des actions ou purge programmée des états anciens. Les caps de lecture et la réouverture conservatrice par révision restent des limites explicites; préparer un modèle d'événements métier dédié avant une volumétrie supérieure.
