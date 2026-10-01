# Velatra Retain V1 — Mission 14

Retain explique quels clients nécessitent une attention, les changements observés et les actions possibles. Pulse indique quoi faire maintenant. Aucun score 0–100, aucune IA, aucune prédiction de résiliation, aucune comparaison entre clients ou coachs. Un éventuel futur score devra être calibré avec de vraies données comportementales ; il n’est pas implémenté ici.

## Modèle et fenêtres

`RetentionAssessment` contient l’identifiant numérique et le Firebase UID du membre, son nom, le coach affecté, l’état, les signaux avec leurs preuves, le signal principal, les destinations existantes, l’heure d’évaluation, une fenêtre de 56 jours, la confiance, l’indicateur de données partielles, les volumes d’activité 14/14 jours et une chronologie factuelle. Chaque signal possède un type, une famille, une sévérité, un titre, une preuve, une fenêtre, une source et une clé des faits pour Pulse. Les réponses détaillées aux bilans, les mesures corporelles et les données santé ne sont jamais retournées par ces API.

Les jours calendaires suivent **Europe/Paris**, via les helpers existants. Les timestamps futurs sont ignorés. Les dates seules de séances sont interprétées comme des jours calendaires, y compris juste après minuit. Les séances viennent des `logs` enregistrés, jamais du seul champ `lastWorkoutDate`. Un log prouve un enregistrement dans Velatra, pas une présence déduite d’une réservation.

| Signal | Famille | Fenêtre / baseline | Niveau |
| --- | --- | --- | --- |
| ACTIVITY_STOPPED | ACTIVITY | Dernière séance enregistrée, historique disponible | 8–13 jours watch ; 14–20 attention ; 21+ critical |
| NO_FIRST_ACTIVITY | ACTIVITY | Aucun log, date d’inscription connue | 7–13 jours watch ; 14+ attention, jamais critical seul |
| ACTIVITY_FREQUENCY_DECLINE | ACTIVITY | 14 jours calendaires incluant aujourd’hui vs les 14 précédents ; baseline ≥3 séances | Baisse ≥25 % watch ; ≥50 % attention ; ≥90 % critical |
| BOOKING_CANCELLATIONS | PLANNING | 30 jours calendaires incluant aujourd’hui, `status=cancelled` | 2 watch ; 3+ attention |
| CHECKIN_LATE | FOLLOWUP | Une échéance passée non reçue | 1–6 jours watch ; ≥7 jours attention |
| FOLLOWUP_REPEATEDLY_MISSED | FOLLOWUP | ≥2 échéances passées consécutives non reçues parmi celles observées sur 56 jours | Attention ; remplace CHECKIN_LATE pour cette assignation |
| HABIT_ENGAGEMENT_DECLINE | HABITS | Habitude quotidienne active sur 14 jours complets avant aujourd’hui ; au moins 4 validations la semaine précédente | Baisse relative ≥25 % watch ; ≥50 % attention |
| NO_ACTIVE_PROGRAM | PROGRAM | Programme utilisable absent, inscription depuis ≥7 jours | Watch ; programme antérieur terminé depuis ≥7 jours : attention |
| PROGRAM_ENDING_WITHOUT_NEXT | PROGRAM | Programme utilisable actif se terminant dans ≤14 jours, aucune suite utilisable programmée | Watch |
| VELATRA_INTERACTION_GAP | INTERACTION | Dernier message daté de la conversation personnelle de l’acteur, ≥21 jours | Watch secondaire uniquement |
| PAYMENT_CONTEXT | BILLING | Abonnement past_due/unpaid, Owner autorisé | Contexte ; aucun effet sur le niveau |
| RENEWAL_WINDOW | BILLING | Abonnement actif, échéance dans 0–30 jours | Opportunité commerciale ; aucun effet sur le niveau |

L’arrêt quasi total après une baseline de trois séances ou plus est un **signal critique d’activité**, même si d’autres explications d’activité décrivent le même phénomène. Cela ne constitue pas deux familles indépendantes. Les seuils indiquent une attention requise et ne prédisent pas une résiliation.

La fenêtre d’annulation utilise **la date prévue de séance (`startTime`)**, car aucun timestamp fiable de l’annulation n’est disponible dans le modèle actuel. Une réservation passée `confirmed` ne devient jamais présence ou no-show. Le taux d’habitudes décrit des **validations enregistrées**, pas un comportement hors application : « 2/7 validations contre 6/7 ». Les habitudes récentes et les baselines faibles ne déclenchent aucun signal. Les contacts externes ne sont pas connus ; l’absence totale de conversation n’est pas assimilée à 21 jours sans contact.

Les fréquences et échéances des bilans réutilisent `dueDateFor` et `parseFrequency`, y compris les assignations manuelles. Aujourd’hui n’est pas encore une échéance en retard. Les réponses et validations sont reconnues par leurs identifiants canoniques assignation/habitude + date et leur périmètre membre/club. La chronologie montre séances, annulations, bilans reçus et habitudes validées, sans leurs réponses ou valeurs personnelles : au plus 100 événements sur 56 jours, avec indication du total.

## Classification et absence de données

On retient la **sévérité maximale par famille primaire** ACTIVITY / PLANNING / FOLLOWUP / HABITS / PROGRAM. Aucune addition de points :

1. Une famille avec un signal critical, ou deux familles indépendantes attention → **Critical**.
2. Une famille attention → **Attention**.
3. Au moins une famille watch → **Watch**. Plusieurs watch restent watch dans V1.
4. Une interaction secondaire ancienne peut produire watch mais ne renforce jamais attention/critical.
5. Aucun signal significatif et observation suffisante → **Stable**.
6. Sinon → **Insufficient data**.

L’observation est suffisante lorsque l’inscription connue remonte à ≥28 jours, ou lorsqu’au moins trois séances ont été enregistrées et que l’inscription remonte à ≥7 jours. Sans date d’inscription, trois séances enregistrées sont nécessaires. Un nouveau membre créé hier sans historique reste insuffisant. Un signal factuel d’onboarding à 7/14 jours peut néanmoins justifier watch/attention sans baseline de fréquence.

Toute source significative plafonnée rend les évaluations **insufficient_data / partial=true**, conservativement sur le portefeuille chargé. Un historique de séances mal daté rend le membre insuffisant et ne fabrique pas une absence de première séance. Les faits connus restent visibles mais ne justifient pas un label Stable sur des données coupées. Les plafonds sont 1 000 profils et 10 000 documents par source ; 5 000 interventions ou états Pulse. Le dépassement est détecté par `limit(cap+1)`.

Les membres `status=paused` sont exclus du portefeuille actif. Pour l’Owner uniquement, un membre avec abonnement connu cancelled/canceled sans abonnement active/trialing/past_due/unpaid est exclu. Une résiliation historique avec un abonnement courant ne l’exclut pas. Manager/Coach ne chargent pas les abonnements et ne peuvent donc pas déduire cette exclusion commerciale ; leur périmètre suit le statut opérationnel du profil. Cette différence protège la confidentialité financière.

## Rôles et sécurité

- Solo Owner : portefeuille de son entreprise, contexte commercial autorisé.
- Studio Owner : Studio entier, filtre coach, contexte commercial autorisé.
- Studio Manager : Studio opérationnel, filtre coach, **aucune requête subscriptions/payments/invoices**.
- Studio Coach : uniquement les membres dont `assignedCoachUid` égale son Firebase UID actuel. Une liste historique `assignedMemberIds` ne peut pas élargir ce périmètre.
- Member et Superadmin : API refusée ; aucune vue Retain membre ni agrégation globale inter-clubs.

Le lecteur serveur partagé `staffReader` relit le profil canonique de l’acteur depuis le token vérifié, puis son club, son état actif, la capacité produit et la politique d’autorisation existante. L’Owner moderne doit correspondre au propriétaire du club. Les sources sont bornées et filtrées par club ; les conversations sont limitées à l’expéditeur/destinataire acteur. L’agrégation filtre ensuite les membres autorisés, sans requête par membre. Aucun tableau brut, champ santé, réponse de bilan ou champ financier caché n’est envoyé aux rôles non autorisés.

GET `/api/retention` : compteurs complets du périmètre, filtres état/signal/coach/recherche, page de 20 (maximum 50), curseur lié à l’identité, aux filtres et aux faits. Une liste modifiée invalide le curseur (409).

GET `/api/retention/:memberUid` : évaluation légère et interventions, 404 pour un membre hors périmètre ou exclu. GET ne persiste ni évaluation ni mutation des sources.

POST `/api/retention/:memberUid/interventions` : seulement `requestId`, `kind`, `note`. Kind : contacted, called, checkin_planned, program_adapted, other ; note facultative ≤1 000 caractères. Actor, club et date proviennent du serveur. Une transaction relit l’acteur, le club et l’affectation actuelle avant toute création **et avant une réponse idempotente**. Même requestId et même payload → même intervention ; payload différent →409. Le document est déterminé par SHA-256(acteur, club, membre, requestId). Les tentatives d’imposer actor/club/role sont rejetées.

`retentionInterventions` est server-owned et protégée par le default-deny existant. Tests SDK de lecture, liste, création, modification et suppression pour Owner, Manager, Coach, Member, Superadmin et anonyme. **Aucune modification de firestore.rules ou storage.rules. Firebase deployment required : NO. Aucun déploiement Firebase effectué.**

## Interventions, Pulse et surfaces

Consigner Contacté / Appel effectué / Bilan planifié / Programme adapté / Autre ajoute seulement un historique. Cela **ne résout aucun signal**, ne crée pas un rendez-vous, ne change pas un programme et ne réécrit aucune source métier. Le niveau évolue avec les faits : reprise de séance, bilan reçu, programme actif, nouvelles annulations. Les surfaces se rafraîchissent au retour de focus, toutes les 60 secondes, et lors des changements de sources front chargées.

Pulse charge les faits supplémentaires Retain dans le même chargement borné. Une seule action `RETENTION_ATTENTION` par membre attention/critical, avec Voir Retain et Message. Les avertissements équivalents d’inactivité, programme absent/finissant et bilan en retard sont remplacés uniquement quand leur signal est représenté dans Retain. Les tâches réelles, messages, paiements et demandes explicites de programme restent distincts. Les avertissements d’engagement d’un membre connu comme résilié sont retirés pour l’Owner. Une réponse ou assignation tronquée ne crée pas un faux bilan absent dans Pulse.

Les fingerprints incluent état, types, sévérités et clés des faits, pas le texte qui vieillit chaque jour ni les interventions. Un changement factuel significatif réactive une action prise en charge ; le simple passage de 21 à 22 jours ne la réactive pas. Traité reste propre à chaque acteur, club et fingerprint.

Retain est une surface secondaire du hub Plus, sans sixième racine mobile. Téléphone : priorité critical/attention/watch, cartes avec au plus deux raisons et action principale. Desktop : lignes lisibles avec détail léger. Le détail montre évolution 14/14, signaux, chronologie, actions existantes et lien Client 360. Client 360 ajoute la section Rétention avec niveau, raisons et dernières interventions. Home réutilise les compteurs du résultat Pulse pour son résumé compact : **aucun appel Retain supplémentaire depuis Home**. Planifier un bilan ouvre le planning existant du membre ; préparer la suite, le bilan, le message, l’affectation et le renouvellement ouvrent les destinations existantes.

## Performance et validation

Les sources sont indexées en mémoire par membre/UID. Pour **500 clients**, le test API compte **12 requêtes de collection Owner / 11 Manager ou Coach**, plus deux lectures de documents d’autorité. Ce nombre ne varie pas avec le nombre de clients ; aucune requête Firestore dans une boucle de membres. POST intervention ne charge pas le portefeuille : quatre lectures de documents transactionnelles, au plus une création. Pulse Owner utilise désormais 15 requêtes de collection (13 Manager / 12 Coach), sans les anciennes lectures groupées de réponses par échéance.

Tests ajoutés : seuils, familles, données insuffisantes et partielles, timezone/minuit, annulations sans no-show, bilan reçu/répété, habitudes et baseline, programmes/suite, finance secondaire, exclusions, rôles et tenants, interventions idempotentes, révocation après token, intégration/fingerprints Pulse, auto-résolution et 500 clients. Les tests de runtime serveur natif incluent les nouveaux modules.

QA automatisée du vrai RootApp, avec API de fixtures et moteur partagé réel, sans accès externe/production : 390×844, 820×1180, 1440×900, 1920×1080 ; Solo Owner, Studio Owner, Manager, Coach ; 0/1/100/500 clients, les cinq états, pagination, filtres, Home, Pulse agrégé, détail, interventions et Client 360. Chromium isolé ; cela ne remplace pas une recette sur appareils physiques ou données métier réelles. Le workflow Mobile browser regression ajoute cette QA aux régressions existantes.

Validation finale : lint, build, suite complète en émulateurs, diff-check. Les résultats chiffrés et checks du HEAD publié sont indiqués dans la PR.

## Limites V1

Seuils déterministes à valider progressivement sur les usages réels. Pas de présence/no-show sans donnée dédiée ; annulation datée par séance ; validations d’habitudes et interactions limitées à Velatra. Pas de facteurs douleur, blessures, âge, sexe, poids ou performance. Pas de campagne, email/SMS/push automatique, ML, IA ou instrumentation analytics nouvelle. Pas de cache d’évaluation persistant ; deux requêtes messages personnelles par lecture. Au-delà des plafonds, le portefeuille devient insuffisant et nécessitera des sources paginées ou agrégats dédiés. Les interventions sont append-only en V1 ; une correction se consigne dans une nouvelle note. Les données habituellement reçues uniquement au travers des API follow-up sont réévaluées au plus sous 60 secondes. La classification ne promet jamais qu’un client sera perdu ou sauvé.
