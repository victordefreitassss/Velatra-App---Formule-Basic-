# CRM et navigation — livraison des phases 1 et 2

## Périmètre livré

Base : `main` à `24b9a755b7e10d1949295eae1954a50e0324a9de`. Branche : `feat/navigation-sales-crm`.
L'audit et le plan des sept phases sont dans [VELATRA-PRODUCT-PHASES.md](VELATRA-PRODUCT-PHASES.md).

### Navigation

Le catalogue existant, déjà filtré par permissions, reste la source d'autorité. Le desktop réordonne ses destinations :

- Coach indépendant : Tableau de bord, Clients, Prospects, Planning, Coaching, Messages, Drive.
- Owner Studio : Tableau de bord, Membres, Prospects, Planning, Équipe, Ventes, Messages, Drive.
- Manager : même organisation, uniquement les destinations autorisées ; aucun nouvel accès financier accordé.
- Coach salarié : Tableau de bord, Mes clients, Planning, Coaching, Messages, Drive.

Notifications reste accessible. Les autres destinations sont conservées dans Gestion / Gestion du club et Paramètres. Les sous-navigations Clients, Coaching et Prospects réutilisent les vraies pages. Aucun onglet d'équipe sans fonctionnalité existante. La navigation mobile/tablette reste celle de l'application ; les pages CRM réorganisées restent utilisables sur ces formats.

### CRM approfondi

- Pipeline compatible avec les six étapes actuelles ; `pending` reste affiché comme Nouveau. Déplacement par glisser-déposer et changement d'étape accessible dans la fiche.
- Liste paginée par 20 : identité, étape, responsable/source, offre, dernier contact consigné, prochaine action et ancienneté réelle.
- Recherche dans les prospects chargés, filtres combinables (étape, responsable, source, dates, tags, segment), tri, chips et remise à zéro. Aucune prétention de recherche globale intermodules.
- Dossier avec Vue d'ensemble, Activité, Notes & échanges, Rendez-vous et Offre. Champs optionnels éditables et avertissement de doublon email/téléphone, sans fusion automatique.
- Timeline calculée à partir des journaux existants ; une nouvelle note et son événement ne sont affichés qu'une fois.
- Appels, emails et messages consignés manuellement, distincts de leur envoi effectif. Les liens tel/mail ne fabriquent pas d'événements.
- Relances Aujourd'hui / En retard / À venir / Sans relance planifiée à partir de `nextReminderDate`, avec programmation, report et clôture par les actions Sales existantes. Aucun deuxième moteur de tâches ; la page Tâches reste accessible. Les catégories utilisent les jours Europe/Paris.
- Essais, présence, historique d'essais et Performance réutilisent `SalesSurface`. L'affectation existante est accessible dans le résumé du dossier.
- Conversion conserve l'API et les claims idempotents existants, les champs préremplis et le lien prospect/membre. Le contexte affiche source, offre et note pertinente ; il ne copie pas ces informations dans de nouveaux champs membre et ne souscrit aucun abonnement.

### Modèle et sécurité

Champs optionnels ajoutés au prospect : `firstName`, `lastName`, `proposedOffer`, `tags`, `nextAction`, `lastContactAt`. Le nom affiché historique reste conservé. Les événements peuvent porter `kind`, `content` ou `noteId`.

Deux endpoints Sales étendent la même collection :

- `POST /api/sales/prospects/:id/profile` : liste blanche de champs descriptifs, types et longueurs validés ; refuse notamment club, rôle, statut, plan, affectation et liens de conversion.
- `POST /api/sales/prospects/:id/activity` : date et auteur définis côté serveur, transaction et identifiant de requête pour éviter les doublons d'une action déjà présente dans le journal.

Ils exigent l'identité authentifiée, un Owner/Manager actif dans son organisation active et un prospect de ce tenant. Les commandes métier restent sur leurs endpoints existants. Aucun changement de Rules, IAM, Stripe, rôle ou collection. Aucune migration, suppression de données ou écriture production effectuée pour cette livraison.

### Composants

- `components/internal/InternalUI.tsx` et `internal.css` : PageHeader, ViewTabs, EmptyState, StatusBadge, Pagination, styles de formulaire/table/filtres/focus.
- `components/crm/ProspectWorkspace.tsx`, `ProspectRecord.tsx`, `crmModel.ts`, `crm.css` : vues et dossier sur les données existantes.
- `components/desktop/desktopNavigation.ts` : classement du catalogue autorisé et sous-navigation.
- `DesktopSidebar`, `Layout`, `ProspectFlowPage`, `SalesSurface` : intégration et conservation des actions métier existantes.

## Validation

Recettes locales avec données synthétiques isolées ; aucun compte ni contact production utilisé pour les captures.

| Vérification | Résultat |
| --- | --- |
| `npm run lint` (TypeScript) | PASS |
| `npm run build` | PASS ; avertissement Vite de chunks > 500 kB conservé |
| `npm run test:emulators` | 843 tests PASS, plus 5 contrôles CI d'isolation |
| Backend CRM/Sales/conversion/Rules ciblés | 51 tests PASS |
| Modèle CRM et navigation | 7 tests PASS |
| Navigateur CRM approfondi | 99 contrôles PASS ; 320 / 768 / 1440 px, deux rôles |
| CRM/Tâches responsive existant | 63 contrôles PASS ; 320 à 2560 px |
| Sales navigateur | 884 contrôles PASS |
| Rôles et formats | 433 contrôles PASS |
| Desktop navigation | 206 contrôles PASS |
| `git diff --check` | PASS |

Le workflow navigateur reçoit un job CRM dédié et ses captures en artifact. Les tests Sales existants ouvrent désormais l'onglet Rendez-vous avant de vérifier les essais ; leurs assertions métier restent conservées. Les tests couvrent notamment filtres, pagination, états vides, notes, retry, brouillon conservé après erreur, doublons explicites, relances, conversion, rôles refusés, tenant étranger et organisations/comptes suspendus.

Captures 1440 px générées par `scripts/qa/crm-workspace-browser.mjs` : `owner-navigation-1440.png`, `owner-pipeline-1440.png`, `owner-list-1440.png`, `owner-record-1440.png` et les quatre équivalents `manager-*`. En CI, elles figurent dans l'artifact `crm-workspace-evidence`.

## Limites et suite

- Les journaux existants restent bornés à 80 événements et 100 notes : ce n'est pas un historique exhaustif illimité. Les événements déjà éliminés ne sont pas reconstitués. La déduplication des interactions vaut pour les entrées encore conservées.
- Pas de boîte de réception ni de liaison canonique prospect/document : aucun onglet ou bouton fictif ajouté. Les documents et les échanges intégrés nécessitent une relation métier et ses permissions dans une phase ultérieure.
- `lastContactAt` signifie dernier échange consigné dans cette version ; ne pas interpréter une ancienne absence de date comme une preuve d'absence de contact.
- L'offre est descriptive. La facturation conserve son autorité serveur. La conversion ne crée pas de formule ou de paiement.
- Les filtres et la pagination opèrent sur le périmètre déjà chargé par l'application. Une pagination serveur complète est une évolution distincte si la volumétrie l'exige.
- Les pages non concernées conservent leur UI : Client 360, Tasks/Pulse/Retain, Planning/Coaching, Team/Drive puis recherche/polish seront traitées dans les phases 3 à 7. `ProspectsPage.tsx` legacy non routée reste en place ; Marketing et la boutique suppléments restent explicitement incomplets.

Cette PR ne merge et ne déploie rien automatiquement.
