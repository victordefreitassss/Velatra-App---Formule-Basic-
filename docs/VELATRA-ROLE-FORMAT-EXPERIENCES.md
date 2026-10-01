# Expériences fonctionnelles par rôle et format — 12B

La route logique reste `/dashboard` : le rôle, l’`accountType` explicite et le format choisissent la composition. Le format ne change aucune permission. Les offres SaaS restent soumises au resolver 12A ; cette mission ne provisionne ni offre ni compte. Les clubs historiques conservent leur accueil historique.

## Architecture et priorités

`ExperienceHome` sélectionne `SoloOwnerHome`, `StudioManagerHome` ou `StudioCoachHome`. Studio Owner utilise la variante Manager enrichie. Les sections, le chargement des bilans et les selectors sont partagés, sans copier trois dashboards. Les cartes et contrôles existants sont réutilisés.

| Expérience | Phone : terrain | Tablet / Desktop : préparation et supervision |
| --- | --- | --- |
| Solo Owner | Prochaine séance, actions, messages, clients à suivre, relances, raccourcis ; Business replié en dernier | Actions, clients, CRM, Billing V2, planning, programmes et séances récentes |
| Studio Manager | Actions, planning du jour, équipe, relances, clients, affectations | Planning Studio, actions, clients, CRM, équipe et affectations ; aucune finance Owner |
| Studio Coach | Agenda personnel, actions, messages, tâches affectées, clients à suivre | Portefeuille affecté avec recherche/pagination, préparation, planning, programmes, suivi, messages et tâches |
| Studio Owner | Supervision Manager avec accès Owner et Business secondaire | Variante Manager enrichie avec Billing V2, équipe, finances, paramètres et organisation selon les capacités existantes |
| Member | Accueil, séances, progression, nutrition, Plus conservés | Expérience existante conservée |
| Superadmin | Console existante conservée | Console existante conservée |

Le resolver central définit Phone `<768`, Tablet `768–1023`, Desktop `1024–1599`, Large Desktop `≥1600` px. La tablette dispose de sections de préparation, du portefeuille Coach complet, de Client 360, du planning, des programmes, et du CRM/équipe selon le rôle ; le shell compact reste actif jusqu’à 1024 px. Large Desktop répartit le travail dans une zone principale et l’agenda/messages/raccourcis dans une colonne latérale, au lieu d’étirer les cartes.

## Navigation

| Expérience | Phone, cinq racines maximum | Desktop |
| --- | --- | --- |
| Solo Owner | Accueil · Clients · Coaching · Planning · Plus | Accueil · Clients · Coaching · CRM · Planning · Business · Messages |
| Studio Manager | Accueil · Clients · Planning · CRM · Plus | Accueil · Clients · CRM · Planning · Équipe · Business |
| Studio Coach | Accueil · Clients · Coaching · Planning · Messages | Accueil · Clients · Coaching · Planning · Messages |
| Studio Owner | Accueil · Clients · Planning · CRM · Plus | Accueil · Clients · CRM · Planning · Équipe · Business · Coaching · Messages |

Plus et le menu « Rubriques et paramètres » donnent accès aux destinations secondaires autorisées, dont les tâches dans Planning pour Coach/Solo et Business pour Manager. Le Business Manager contient uniquement les tâches et relances opérationnelles. CRM, finances et paramètres Owner n’apparaissent pas pour Studio Coach. Les URLs ne sont pas dupliquées par format.

Les actions passent un contexte temporaire dans l’entrée d’historique courante : ID client + section Coaching/Suivi, focus de note, ID conversation, réservation ou tâche. Les consommateurs vérifient le tenant et l’affectation Coach ; les entrées de navigation normales restent neutres. Les actions utilisent des boutons accessibles au clavier et des cibles d’au moins 44 px dans le nouvel accueil.

## Sources et périmètres

- Clients : utilisateurs `member` du tenant pour Owner/Manager ; pour Coach, uniquement `assignedCoachUid === actor.firebaseUid`. La liste cachée `assignedMemberIds` n’étend jamais le portefeuille.
- Programmes : programmes des clients du périmètre, démarrés et non expirés, hors séances planifiées. Un programme demandé ou absent donne une action de préparation.
- Séances : réservations confirmées non terminées ; Coach limité à ses réservations et clients affectés. Les intitulés viennent des types de séance existants. Aucun taux d’occupation ou présence n’est inventé.
- Tâches : tâches ouvertes du tenant, ou tâches affectées au Coach sans prospect et sans client hors périmètre. La page Tâches affiche aussi les tâches terminées et permet leur clôture/réouverture explicite via transaction, avec relecture du document. Les relances CRM restent réservées aux rôles dont cette destination est autorisée.
- Messages : messages personnels entrants non lus du tenant ; Coach limité aux expéditeurs affectés. Ouvrir une conversation utilise le comportement existant de marquage comme lu.
- Prospects : pipeline existant et dates de relance, pour Solo/Manager/Studio Owner. Aucun agrégat commercial global Coach.
- Bilans/check-ins : GET existant `/api/followup/priorities`, filtré à nouveau par UID client et échéance. Une erreur expose un état indisponible et une action Réessayer.
- Inactivité : jours depuis la dernière séance réellement enregistrée, en combinant logs et `lastWorkoutDate`. Sans date réelle, aucun délai ni score de risque n’est affiché.
- Équipe : coachs enregistrés, affectations par UID, réservations confirmées restantes du jour, tâches dues. Un UID absent ne compte pas les clients sans coach.
- Finance : uniquement Owner autorisé, données Billing V2 du tenant en EUR, MRR mensualisé, ARPU récurrent et encaissements nets des remboursements sur mois/7 jours/année. Aucune addition de devises. Sans données, un état vide remplace les indicateurs.

Le Today / Action Center V0 dérive et ordonne les rendez-vous, tâches dues, messages, demandes de programme, bilans, relances et inactivité. Il ne crée aucune collection, tâche automatique, score Retain ou nouveau moteur d’automation. L’accueil affiche cinq actions sur Phone, huit ailleurs, puis renvoie aux sections et destinations de travail.

Les listeners Studio Coach excluent désormais aussi les formules, paiements, abonnements, factures, dépenses et statistiques financières, y compris l’ancien listener direct `plans`. Les tâches Studio Coach utilisent la requête existante par `assignedTo` numérique ; les prospects nécessaires aux essais restent filtrés par `assignedCoachUid`. Les listeners Manager protégés en 12A.3 restent protégés. L’accueil historique évite également les calculs financiers lorsque la capacité est refusée. Les permissions backend, Firestore Rules et Storage Rules restent inchangées.

## Validation et limites

Les tests ciblés couvrent les quatre rôles, 0/1/100 clients, dates/programmes, affectations révoquées, tenants étrangers, absence d’UID, rôles suspendus, finances non lues pour Manager/Coach, remboursements, navigation et contexte d’historique. Le scénario navigateur utilise le véritable RootApp avec Firebase simulé, bloque toute requête externe, et contrôle les onze dimensions demandées ainsi que les actions directes. La régression Member/Legacy reste couverte par la suite navigateur existante ; les tests de navigation conservent les racines et restrictions Superadmin.

Limites avant Pulse/Retain : l’API de priorités renvoie au maximum quatre bilans/check-ins (et interroge au maximum 100 affectations) ; ce panneau n’est donc pas une liste exhaustive. Les actions sont dérivées de ce que les listeners autorisés ont chargé. Les rendez-vous du jour représentent les confirmations restantes, pas une preuve de présence ou une mesure de charge complète. L’inactivité est un délai réel, pas un diagnostic. L’accueil final Studio Owner, Sales V2, Retain, no-show et analytics avancés restent hors périmètre. La recette est réalisée en navigateur automatisé sur données synthétiques, sans appareils physiques ni données de production.

Aucun déploiement Firebase, Hosting ou Functions, aucune modification de rôles/données de production, ni nouvelle intégration Stripe n’est effectué par cette mission. La PR reste ouverte pour revue.

Validation locale : lint et build réussis ; 369 tests applicatifs et 5 gardes d’isolation passent ; 333 vérifications navigateur 12B et 48 vérifications de la suite mobile existante passent. Aucune modification des Rules, aucun déploiement Firebase requis.
