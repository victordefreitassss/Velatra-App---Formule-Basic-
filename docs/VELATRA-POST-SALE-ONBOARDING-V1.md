# Velatra — Post-sale Onboarding V1

Mission 16, depuis main `2de0be9ae4db2f12118613c6d45e2fd2e3ff9ad1`.
Retain `02391bda2bc0f6a518da2c8917dbb9f45b09020c` et Sales
`c4cb40e65d6b342853ff34f826a407eaccaf8538` sont des ancêtres vérifiés.
Branche : `feat/post-sale-onboarding-v1`. Livraison par PR, sans merge dans cette mission.

## Modèle et faits

`onboarding/onboardingEngine.ts` dérive un `MemberOnboardingAssessment`.
Aucune collection onboarding, aucun document de lifecycle, aucune tâche automatique,
aucun score, aucun job retardé. Les six étapes sont évaluées depuis les collections
existantes et leurs liens canoniques. La lecture ne modifie aucune source.

| Étape | Condition satisfaite | Action existante |
| --- | --- | --- |
| account_created | Document users member du club, UID Firebase canonique et ID numérique valide | Client360 Administratif |
| profile_completed | onboardingCompleted=true et profileMeasurementsPending différent de true | Contacter le membre dans Client360 Communication |
| coach_reference | Solo : Owner implicite ; Studio : assignedCoachUid vers un coach actif du même club | Éditeur d’affectation existant dans Client360 |
| initial_assessment | Politique facultative, ou réponse authentique au bilan marqué purpose=onboarding et au modèle configuré | Client360 Suivi |
| program_ready | Programme du client, non isPlannedSession, date valide, durée positive non expirée ou sans échéance, jour avec exercice exId valide | Client360 Coaching puis éditeur existant |
| first_session | Log réel, date passée, du client et du club ; après convertedAt pour la cohorte post-vente | Planning avec planningMemberId |

Chaque étape porte pending / complete / blocked / unknown / not_required, son motif et
sa destination. Le compteur exprime des **étapes satisfaites**, y compris l’implicite
Solo et les obligations explicitement facultatives ; il n’est pas un score.
Par exemple une conversion Solo valide avec bilan facultatif démarre normalement à
3/6. Les fixtures 0/6 représentent une observation partielle, pas un compte complet
faussement non créé.

États globaux : NOT_STARTED, IN_PROGRESS, BLOCKED, READY, COMPLETED.
BLOCKED comprend les sources inconnues ; READY exige les cinq autres étapes et une
première séance future confirmée ; COMPLETED exige les six étapes et un log réel.
La réservation passée, même status=completed, ne prouve jamais une séance réalisée.
FIRST_SESSION_BOOKED et FIRST_SESSION_COMPLETED restent distincts.

Priorité nextAction : compte invalide → référent Studio → profil membre → bilan
initial → programme → première séance. Une autre étape bloquée reste visible même
si une action plus prioritaire est encore nécessaire. Aucun bouton « tout terminer ».
`completedAt` reste optionnel et n’est pas inventé : les sources ne datent pas
précisément la complétion de chaque ancien profil.

## Profil membre et mesures provisoires

La conversion existante crée des valeurs techniques et écrit sourceProspectUid et
profileMeasurementsPending=true. Ces valeurs ne satisfont pas le profil.
Le questionnaire `components/Onboarding.tsx` conserve ses quatre écrans : profil,
objectifs/blessures, expérience/fréquence/durée/équipement et récapitulatif.
Âge, poids et taille restent vides quand les mesures sont provisoires ; le membre
saisit et valide ses mesures réelles. Les réponses restent des écritures SDK sur les
champs déjà autorisés par les Rules.

Après la sauvegarde, `POST /api/onboarding/profile-confirmation` relit le membre
identifié par le token et son club, vérifie le questionnaire sauvegardé et les bornes
d’âge/mesures/fréquence/durée, puis retire uniquement le marqueur provisoire.
Aucune identité, valeur de profil ou autorité n’est acceptée dans le body.
Staff, Superadmin, profils suspendus, clubs inactifs et questionnaire incomplet sont
refusés. L’opération est idempotente. Le questionnaire reste affiché tant que la
confirmation nécessaire n’a pas réussi ; une erreur ne simule pas une complétion.

L’éditeur staff historique n’est pas remplacé par un deuxième questionnaire : le
membre conserve la responsabilité de terminer son profil. Aucun ancien profil n’a
été corrigé ou marqué terminé par cette mission.

## Bilan initial

Configuration minimale : `club.settings.onboarding` :

- requireInitialAssessment, false si absent ;
- initialAssessmentTemplateId, optionnel.

Owner et Manager Studio configurent cette politique dans un petit panneau du Suivi
existant. La mutation transactionnelle touche uniquement settings.onboarding et
préserve les autres paramètres, notamment Billing. Le modèle sélectionné doit être
actif et appartenir au club. Exiger un bilan sans modèle produit un blocage explicite
et l’action de configuration dans Suivi ; aucun modèle ou contenu n’est généré.

L’assignation existante accepte purpose=onboarding, pour un bilan ponctuel once ou
manual. Le serveur revalide le modèle et la politique dans sa transaction. La
bibliothèque conserve ses restrictions existantes pour les Coachs ; Owner/Manager
peuvent assigner le modèle tenant. L’assignation seule n’achève rien.
La réponse doit correspondre au membre, club, assignmentId, templateId, échéance et
ID canonique ; les réponses obligatoires sont validées contre les questions de
l’assignation, avec une date de réponse cohérente. Un autre bilan ou une ancienne
réponse non liée ne complète pas cette étape. Une réponse déjà reçue reste une preuve
si le modèle est ensuite archivé ; sans réponse et sans modèle actif, l’étape bloque.

La politique s’applique aux évaluations du club ; elle n’est pas une permission
arbitraire de sauter une étape client. Le défaut facultatif préserve les clubs
historiques. Il n’y a ni exemption individuelle manuelle ni réponse fabriquée.

## Sales, Client360, Home, Pulse et Retain

Sales conserve son endpoint de conversion et son email d’accès existants. La réussite
propose « Voir l’onboarding » et « Voir le client » ; les dossiers déjà convertis
proposent aussi l’onboarding. Le membre apparaît dès que la conversion et son lien
sont enregistrés, sans objet onboarding supplémentaire ni job de synchronisation.
L’appel sendPasswordResetEmail ne produit aucun ACCESS_OPENED.

Onboarding Center est une destination secondaire de Clients, sans sixième racine
mobile. Cartes lisibles sur téléphone, liste de cartes et détail sur desktop,
recherche, états, filtre Coach pour Owner/Manager Studio et pagination par 20.
Client360 ajoute une section compacte, réduite à « Onboarding terminé » après
complétion. Les boutons utilisent dashboardNavigation et les contextes existants,
y compris l’éditeur d’affectation et le client sélectionné dans Planning.

Home utilise le résumé déjà chargé avec Pulse ; elle n’ajoute ni requête par client
ni listener global. Pulse représente l’onboarding par une seule action par membre et
supprime ses doublons programme absent, référent manquant, première activité et bilan
initial. Les tâches explicites, messages, paiements et bilans récurrents restent
indépendants. Un agrégat Retain n’est retiré que si tous ses signaux opérationnels
sont déjà représentés par l’onboarding ; les autres risques restent visibles.
Les priorités, groupes et échéances de Pulse sont conservés. Les empreintes changent
avec les faits et versions de profil/référent ; un progrès réouvre la prochaine
action, la complétion réelle la retire. Aucun document de tâche n’est créé.

Retain garde ses règles new member / insufficient data / première activité et ses
signaux factuels habituels. Seuls les bilans purpose=onboarding sont exclus du calcul
de bilans récurrents manqués. Un nouveau membre de trois jours sans log n’est pas
artificiellement critique ; un membre établi complété suit la rétention normale.

La vue « À poursuivre », Home et les agrégats Pulse ciblent les conversions reliées,
les profils explicitement provisoires et les inscriptions connues depuis 30 jours.
Cette fenêtre sert uniquement à éviter les alertes sur des anciens dossiers sans
preuves d’un parcours en cours ; elle ne change pas les conditions de complétion.
Les autres dossiers restent accessibles dans « Tous les clients » et Client360.
Les historiques avec profil terminé, programme utilisable et log passé réel sont
COMPLETED, sans migration, même avec des logs antérieurs à cette fonctionnalité.

## Dates et observation partielle

startedAt=convertedAt si le prospect exact sourceProspectUid est lié à ce membre ;
sinon createdAt si valide. Aucune recherche par nom, email ou téléphone. Un ancien
membre n’a pas besoin d’un prospect. Une date de réalisation indéterminable n’est
jamais créée à partir du statut technique d’une réservation.

Les sources plafonnées sont déclarées partialSources. Les étapes dépendantes deviennent
unknown, même si une ligne positive a été observée : pas de fausse complétion ou de
signal d’absence tiré d’un historique incomplet. Les autres étapes indépendantes
restent évaluables. La bannière et les motifs expliquent le besoin de vérification ;
aucun agrégat Pulse automatique n’est créé pour une évaluation partielle.

## API, périmètres et performance

GET /api/onboarding : état, coach, recherche, limit (1–50), cursor.
GET /api/onboarding/:memberUid : détail dans le périmètre courant.
GET/PUT /api/onboarding/policy : lecture staff ; écriture Owner/Manager seulement.
POST /api/onboarding/profile-confirmation : confirmation du propre profil membre.

Les GET relisent actor et club via staffReader ; token Firebase vérifié, suspension,
club actif, Owner canonique et capacités runtime réévalués. Owner Solo/Studio et
Manager Studio : portefeuille du club. Coach Studio : membres assignedCoachUid
uniquement, sans roster global ni finances dans la réponse. Member/Superadmin :
aucun cockpit staff. Un détail hors périmètre retourne 404, l’autorité refusée 403.
Les filtres et curseurs sont validés et les curseurs liés à l’acteur et aux faits.
Aucune mutation de rôle, de Stripe ou d’attribution de coach par ce nouveau moteur.

| Lecture | Owner | Manager | Coach | Documents d’autorité |
| --- | ---: | ---: | ---: | ---: |
| Onboarding liste ou détail, 0 / 1 / 100 / 500 membres | 8 | 8 | 8 | 2 |
| Pulse enrichi | 16 | 14 | 14 | 2 |
| Home (résumé dans Pulse) | aucune requête supplémentaire | idem | idem | idem |

Huit collections Onboarding : users, programs, logs, bookings, prospects,
coachCheckInAssignments, coachCheckInResponses, coachCheckInTemplates.
Requêtes filtrées par clubId et bornées : 2 000 profils staff+membres, 10 000 lignes
par autre source, lecture de cap+1 pour détecter la troncature. Indexation en mémoire
par memberId, memberUid et UID ; aucune boucle de requêtes par membre.
Un détail fait la même lecture bornée, déclenchée uniquement à l’ouverture.
Aucune requête subscriptions/payments/invoices dans Onboarding, quel que soit le rôle.
Pulse garde ses deux sources financières uniquement pour Owner.

## Validation et publication

- 62 nouveaux tests : 47 moteur/intégrations pures, 15 HTTP sur Auth/Firestore locaux.
- Suite complète : 645 tests applicatifs, 0 échec ; 5 gardes d’isolation, 0 échec.
- Mesures réelles du reader sur 0 / 1 / 100 / 500 membres : 8 requêtes et 2 documents
  pour chaque rôle staff ; refus des lectures financières et des boucles par membre.
- Tests HTTP : conversion Sales réelle sur émulateurs puis onboarding immédiat,
  politique/bilan, réponse membre, confirmation des mesures, périmètres et révocations.
- QA RootApp synthétique : 1 049 contrôles, 0 erreur ; SOLO_OWNER, STUDIO_OWNER,
  STUDIO_MANAGER, STUDIO_COACH à 390×844, 820×1180, 1440×900 et 1920×1080.
- QA : 0/6, 2/6, 5/6, 6/6, blocage, conversion nouvelle, sources partielles, parcours
  Suivi/affectation/Programme/Planning, questionnaire membre, pagination 100/500,
  contrôles >=44 px, absence de débordement et de listeners financiers staff interdits.
- TypeScript et build Vite passent. Avertissement préexistant de chunks >500 kB.
- Workflow Mobile browser conserve toutes ses recettes et ajoute Onboarding ; délai
  porté de 10 à 15 minutes pour absorber la matrice supplémentaire, sans retirer de tests.

Les preuves navigateur sont des fixtures isolées, pas des tests sur appareils physiques
ni des sessions avec données de production. Elles sont archivées par GitHub Actions.
La validation finale distante doit porter sur le HEAD exact de la PR : CI, Mobile
browser et preview Vercel. Aucun merge n’est autorisé dans cette mission.

FIRESTORE RULES CHANGED: NO. STORAGE RULES CHANGED: NO.
DEPLOYMENT REQUIRED: YES pour mettre le frontend/API en production après revue et
merge futurs ; aucun déploiement Firebase nécessaire pour cette PR.
Aucune donnée production, aucun rôle, aucune migration de compte, Stripe, Hosting ou
Functions n’a été modifié ou déployé pendant cette mission.

## Limites explicites

Une séance réellement faite mais jamais enregistrée reste non prouvée. Un ancien
bilan sans purpose=onboarding n’est pas relabelisé. Une source tronquée exige une
vérification plutôt qu’une supposition ; la V1 ne promet pas une lecture exhaustive
au-delà de ses plafonds. Les identités de profils corrompues restent bloquées et ne
sont pas réparées automatiquement. L’heure historique de fin de tout l’onboarding
reste inconnue sans timestamp fiable de chaque étape.

La configuration exige un modèle existant ; elle ne fabrique pas de questionnaire.
Les Coachs gardent la restriction existante sur les modèles qu’ils peuvent assigner.
Le rafraîchissement des données Suivi se fait à l’ouverture, au focus, manuellement
ou au plus tard à 60 secondes ; les sources déjà présentes dans App déclenchent un
rafraîchissement après modification. Pas de listener supplémentaire massif.
