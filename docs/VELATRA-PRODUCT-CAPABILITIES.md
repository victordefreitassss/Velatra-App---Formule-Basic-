# Velatra — Product Model & Capability Foundation

Base : `f6c96b3a3c5f6acdd213f03268d1ebcdd6051eca` (main, PR #9). Références : [Master Feature Map](VELATRA-MASTER-FEATURE-MAP.md), [Responsive Capability Map](VELATRA-RESPONSIVE-CAPABILITY-MAP.md). Ces deux audits restent des photographies de leur commit, pas des descriptions réécrites de cette livraison.

## Contrat produit

`clubs/{clubId}.accountType?: 'solo' | 'studio'` est la seule source de vérité du type de structure. Il n'est pas dupliqué dans `users` et n'est jamais déduit de `plan`, du nom, des notes, de la description ou du nombre d'adhérents/coachs.

| Dimension | Signification | Source |
| --- | --- | --- |
| accountType | Type de structure : Solo ou Studio | Document club, écrit par le serveur |
| role | Identité métier : owner, coach, member, superadmin | Profil serveur et contrôles Firebase/API |
| plan | Niveau commercial historique basic/classic/premium | Champ conservé tel quel, indépendant du type |
| capability | Fonction implémentée, compatible avec le type et éventuellement activée | Catalogue partagé `productCapabilities.ts` |
| Autorisation sur un enregistrement | Droit sur ce client, programme, fichier ou club précis | API et règles Firebase, inchangées hors protection accountType |

Un coach indépendant est un `owner` d'un club `solo`. Un salarié reste un `coach`. Le propriétaire d'un Studio est aussi `owner`. Aucun nouveau rôle n'est créé. Les champs de rôle, club et capacités reçus dans le corps d'une requête ne constituent pas une preuve d'autorisation.

## Inscription et lecture

- `ClubRegistration.tsx` envoie `solo` ou `studio` à `POST /api/register-club`, sans changement visuel du formulaire.
- Le serveur valide la session Firebase, le code d'invitation et le type. Il crée atomiquement le club et le profil `owner` à partir d'une liste explicite de champs. Les champs `ownerId`, `role`, `canAddStaff`, `capabilities` supplémentaires envoyés par le navigateur sont ignorés.
- Les anciens clients déjà chargés peuvent encore envoyer les choix explicites `coach` → `solo` et `club` → `studio`. Ce pont concerne uniquement une nouvelle inscription ; il ne transforme jamais un document existant.
- Un profil existant obtient 409 : rappeler l'inscription ne permet pas de changer son type. Les valeurs absentes, objets, tableaux, `legacy`, `premium`, etc. sont refusées sur une inscription.
- Les deux points de chargement du club dans `App.tsx` utilisent `readClubDocument`. L'identifiant du document fait foi ; un type absent/invalide n'empêche pas le dashboard de charger. Le chargement ne déclenche aucune écriture de migration.
- Le bootstrap technique du superadmin, s’il doit créer un club vide sans choix produit, reste non classifié ; aucun type arbitraire ne lui est attribué. Il est distinct de l’inscription professionnelle.
- L'inscription conserve les activations existantes : sélectionner Studio n'active pas automatiquement `canAddStaff`, ne sélectionne aucun plan et ne crée aucun abonnement payant.

## Legacy et valeurs invalides

`resolveAccountType` retourne `legacy` quand le champ est absent ou invalide. Cet état est uniquement interne ; il n'est ni une troisième offre ni une valeur autorisée à l'inscription. La lecture normalise le type invalide en champ absent dans l'objet client, sans modifier le document d'origine. Les autres données sont préservées.

Les anciens comptes continuent de charger avec leurs autorisations historiques. Aucune navigation n'est filtrée par accountType dans cette passe. Aucun backfill, migration automatique ou écriture de données de production n'est effectué.

## Sémantique du catalogue

`getProductCapabilities(club, actor)` est une fonction pure partagée. Elle ne dépend ni de la largeur, ni du navigateur, ni de localStorage, ni de `Club.plan`. L'acteur contient rôle, club et preuve de superadmin vérifié ; côté serveur ces valeurs viennent exclusivement de la session vérifiée et du profil chargé en base.

| Champ | Sens |
| --- | --- |
| implemented | Une capacité utilisable existe dans le code, avec les limites du catalogue |
| available | Compatibilité produit cible avec le type : true/false ; null pour les capacités Studio d'un ancien club |
| enabled | Fonction implémentée, club chargé, type compatible ou legacy, et activation existante satisfaite |
| roleAllowed | Rôle admis et même club, ou superadmin vérifié ; ne prouve pas le droit sur un enregistrement |
| usable | enabled ET roleAllowed : résultat prévu pour le futur affichage produit |

**Cette fondation prépare le filtrage produit du Prompt 2 ; `usable` ne filtre pas encore les écrans ni les API historiques.** La politique d'autorisation administrative actuelle est centralisée séparément dans `canManageClub`. Cela évite qu'introduire Solo/Studio coupe un accès ancien ou transforme un flag commercial en permission de sécurité.

Un superadmin non vérifié est refusé. Même vérifié, il ne rend pas une fonction non implémentée disponible. Le serveur n'accepte pas un `trustedSuperAdmin` fourni par le client : il le calcule depuis le jeton Firebase vérifié et le rôle stocké.

## Matrice des 29 capacités

O = owner, C = coach, M = member, A = superadmin vérifié. M signifie uniquement ses propres données ; C conserve le périmètre de ses affectations. La présence dans le catalogue ne garantit pas la configuration d'un service externe.

| Capacité | Implémentée | Solo cible | Studio cible | Rôles | Activation / limite |
| --- | --- | --- | --- | --- | --- |
| clients | Oui | Oui | Oui | O/C/A | Affectations coach inchangées |
| coaching | Oui | Oui | Oui | O/C/A | Séance coach |
| programs | Oui | Oui | Oui | O/C/M/A | M consulte/utilise son programme |
| exercises | Oui | Oui | Oui | O/C/M/A | M via sa séance, pas gestion globale |
| nutrition | Oui | Oui | Oui | O/C/M/A | Programmes et suivi existants |
| progress | Oui | Oui | Oui | O/C/M/A | Données personnelles et affectées |
| planning | Oui | Oui | Oui | O/C/M/A | Réservations selon configuration |
| crm | Oui | Oui | Oui | O/C/A | Limites responsive de l'audit toujours ouvertes |
| billing | Oui | Oui | Oui | O/C/M/A | M consulte son compte ; Stripe distinct |
| finances | Oui | Oui | Oui | O/C/A | Droits actuels, pas nouveaux droits d'encaissement |
| analytics | Oui | Oui | Oui | O/C/A | Agrégats réellement présents |
| messages | Oui | Oui | Oui | O/C/M/A | Périmètre existant |
| documents | Oui | Oui | Oui | O/C/M/A | Règles Storage inchangées |
| aiAssistance | Oui | Oui | Oui | O/C/M/A | Gemini doit être configuré ; validation coach |
| clubManagement | Oui | Oui | Oui | O/A | Modification du club |
| bookingSettings | Oui | Oui | Oui | O/A | Réglages globaux du planning |
| stripeConnection | Oui | Oui | Oui | O/A | Configuration serveur requise |
| teamManagement | Partielle | Non | Conditionnelle | O/A | canAddStaff=true ; création staff, pas permissions sur mesure |
| multipleCoaches | Oui | Non | Conditionnelle | O/C/M/A | canAddStaff=true ; ne retire pas les coachs existants |
| coachAssignments | Oui | Non | Oui | O/A | Affectation via endpoint protégé |
| sharedPlanning | Oui | Non | Oui | O/C/M/A | Filtres et créneaux coachs existants |
| groupClasses | Partielle | Non | Oui | O/C/M/A | Capacité maxParticipants des réservations uniquement |
| advancedPermissions | Non | Non | Non disponible | O/A | Rôles personnalisables non implémentés |
| cashRegister | Non | Non | Non disponible | O/C/A | Aucune caisse créée |
| inventory | Non | Non | Non disponible | O/C/A | Types legacy seuls, pas suite stock |
| accessControl | Non | Non | Non disponible | O/C/A | Aucun contrôle d'accès salle |
| multiLocation | Non | Non | Non disponible | O/A | Aucun multi-site |
| marketingCampaigns | Non | Non disponible | Non disponible | O/C/A | Placeholder |
| healthIntegrations | Non | Non disponible | Non disponible | O/C/M/A | Flags seuls, pas connecteurs exécutables |

`implemented=true` pour teamManagement/groupClasses décrit leur sous-ensemble utilisable, pas une suite commerciale complète. Les limites sont aussi stockées dans les notes du catalogue.

Pour legacy : cœur produit disponible ; compatibilité Studio `available=null`. `enabled` conserve les flags existants pour l'équipe et ne déduit jamais une offre. Un club legacy avec `canAddStaff=false` reste legacy, même s'il possède déjà des coachs.

## Cohérence des droits livrée

| Action | Owner du club | Coach salarié | Member | Superadmin vérifié |
| --- | --- | --- | --- | --- |
| Modifier fiche/logo et réglages club | Oui | Consultation | Non, hors ses infos personnelles | Oui dans le contexte chargé |
| Configurer booking | Oui | Consultation | Non | Oui |
| Connecter/déconnecter Stripe, synchroniser une formule | Oui | Non | Non | Oui |
| Créer un staff | Droit API conservé ; formulaire selon flag bêta existant | Non | Non | Oui |
| Affecter un adhérent | Oui | Non | Non | Oui, contexte club de l'endpoint inchangé |
| Lire/modifier le suivi | Selon règles existantes | Adhérents affectés | Propres opérations autorisées | Selon règles existantes |
| Modifier accountType directement dans Firestore | Non | Non | Non | Non, serveur uniquement |

Les formulaires administratifs de Paramètres restent visibles en consultation pour le coach, avec explication et fieldset désactivé. Copier le code du club et les fonctions déjà autorisées restent possibles. La fiche du club ne propose plus d'édition aux coachs salariés. Les handlers ont également des gardes ; **la sécurité repose toujours sur l'API et les règles**, pas sur ces gardes UI.

Les formules locales restent modifiables selon les règles historiques. Les actions de synchronisation et liens Stripe réservées au propriétaire ne sont plus proposées aux coachs. Une explication signale la différence lorsque Stripe est connecté.

### Ambiguïté commerciale préservée, pas résolue silencieusement

Avant cette passe, `canAddStaff` contrôlait le formulaire bêta, mais l'API autorisait un owner du club indépendamment de ce flag. Transformer ce flag en droit serveur retirerait un accès existant. Cette passe conserve et teste ce comportement, centralise le contrôle de rôle et documente la distinction. Le choix du mode d'activation équipe, de son autorité d'écriture et de son éventuel lien à l'abonnement reste à décider avant d'utiliser `usable` comme entitlement serveur.

Même principe pour un nouveau Solo : les capacités équipe sont préparées comme exclues de la **cible**, sans supprimer les écrans/API aujourd'hui. Ne pas présenter cette livraison comme l'application de restrictions commerciales Solo/Studio.

## Protection Firebase ciblée

La règle historique d'update club permettait à l'owner de modifier presque tous les champs. Ajouter un accountType servant de référence sans le protéger aurait permis de falsifier cette référence. Le seul changement de règles interdit toute modification de `accountType` par un client, y compris ajout legacy, valeur invalide, suppression et superadmin via SDK web. Les écritures serveur Admin SDK passent par un contexte de confiance distinct.

Les règles d'accès existantes aux autres champs, aux données adhérents et à Storage sont conservées. Le verrouillage ne bloque pas une sauvegarde légitime qui réécrit le même accountType inchangé.

Évaluation ciblée suivant la checklist Firebase (ne vaut pas audit exhaustif du dépôt) :

```json
{"score":5,"summary":"Périmètre accountType : création serveur validée, update/add/delete client refusés, aucune autorité issue du body ; tests émulateurs positifs et négatifs.","findings":[]}
```

Le déploiement de ces règles est indépendant du déploiement Vercel ; ne pas considérer la protection active en production sans publication et vérification de la release Firebase.

## Migration future explicite

1. Inventorier en lecture seule les documents sans type/avec valeur invalide, sans inférence. Aucun outil de migration n'est exécuté dans cette passe.
2. Faire confirmer `solo` ou `studio` pour chaque club par un processus autorisé, avec journal du choix et de son auteur. Ne pas permettre un upgrade implicite via une description libre.
3. Définir le contrat d'activation équipe et l'impact sur les accès déjà accordés avant toute restriction. `plan` historique reste séparé ; ses prix/quotas ne sont pas interprétés ici.
4. Préparer un dry-run listant les IDs, ancienne valeur, valeur explicitement approuvée ; contrôler les structures possédant déjà plusieurs coachs sans leur attribuer automatiquement un type.
5. Appliquer via un outil serveur avec précondition sur l'ancienne valeur, journal et possibilité de revenir à l'absence du champ. Refaire les tests d'accès avant/après. Aucune mutation massive implicite.

## Responsive et validation

Même politique quel que soit le format : desktop pilotage complet, tablette coaching opérationnel, téléphone coach actions rapides, téléphone adhérent expérience principale. Aucun champ de largeur n'entre dans les décisions de capacité. Les adaptations de présentation restent au Prompt 2.

Tests ajoutés : matrice owner Solo/Studio, coach Studio, member Solo/Studio, superadmin vérifié/non vérifié, legacy, types invalides, chargement normalisé, non-disponibilité des placeholders et invariance aux 16 largeurs ; inscription HTTP réelle sur émulateurs Auth/Firestore, refus de réinscription et de champs forgés, compatibilité staff historique, protection Firestore accountType et non-régression des réglages owner/coach.

Validation locale : `npm run lint`, `npm run build`, `npm run test:emulators`, `git diff --check`. Après correction de deux erreurs détectées par la première exécution : **184 tests applicatifs réussis, 0 ignoré, plus 5 contrôles du garde-fou d'isolation**. Java 21 utilisé depuis un runtime temporaire officiel vérifié, caches et projet demo isolés ; aucun credential explicite transmis aux tests.

La recette navigateur utilise les composants réels avec données fictives et écritures refusées. Paramètres owner Solo/Studio/legacy et coach Studio, dashboards member Solo/Studio, choix d'inscription Solo/Studio, formulaire de connexion et fiche club owner/coach contrôlés aux 16 formats : **176 combinaisons**, sans débordement global détecté sur ces états. L’édition de fiche club est proposée à l’owner et absente pour le coach sur toutes ces tailles. Les tests HTTP couvrent la session de connexion et l'inscription côté backend ; ils ne certifient pas Google Sign-In, SMTP ou Stripe réels. Polices de repli et absence de clavier physique/mobile : aucune certification iOS/Android.

## Laissé au Prompt 2

Navigation Solo/Studio, masquage d'écrans selon la cible, raccourcis phone, édition tablette, densité desktop, correctifs CRM/Drive/relances, activation commerciale équipe, quotas, migration explicite des anciens clubs, capacités futures. Aucun redesign, nouvelle page métier, site marketing, caisse, stock, campagne ou intégration santé dans cette passe.
