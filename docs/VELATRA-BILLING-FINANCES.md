# Billing & Finances V2

Mission Prompt 11, 30 septembre 2026. Base examinée : `1ccde0b9bd8a6e10d05e4ea7bd0f81decaefa298`. Aucun paiement, remboursement, abonnement, Product/Price ou changement de clé Stripe de production n'a été exécuté pendant cette mission. Aucune donnée métier de production n'a été utilisée pour la recette.

## Audit avant modification

Sources examinées : FinancesPage, MembersPage (Client 360), ProfilePage, SettingsPage, server.ts, server/stripePayments.ts, firebase.ts, types.ts, productCapabilities.ts, firestore.rules, storage.rules et tests existants.

| Domaine | État constaté sur le HEAD initial | Décision |
| --- | --- | --- |
| Plans / abonnements | Collections réelles ; snapshot nom/prix/périodicité déjà présent | Garder les collections et l'historique ; nouveaux champs optionnels |
| Assignation | Plusieurs écritures navigateur : abonnement, crédits, notification | Transaction serveur avec clé stable et détection d'abonnement ouvert |
| Crédits | Solde consommé par Booking V2 ; multiplication initiale weekly×4/52 et monthly×12 ; pas de renouvellement périodique | Préserver et expliciter ce calcul, attribution initiale une seule fois |
| Charge | customerId / amount reçus du navigateur ; statut payé écrit par le navigateur | Charger un Payment canonical côté serveur, vérifier le Customer et relire le PaymentIntent |
| Checkout | Payment Link générique, association membre puis premier abonnement ambigu | Checkout Session individualisée avec références exactes |
| Webhook | Clés globales malgré des secrets Stripe par club | Endpoint signé séparément par club ; endpoint global refusé sans mapping explicite |
| Remboursement | Changement de statut Firestore, pas de transfert Stripe réel ; réutilisation de failed | Option B : Stripe dans son dashboard ; remboursement manuel enregistré séparément |
| Documents | Numéro aléatoire, TVA 20 % supposée et présentation en facture | Justificatif serveur stable et snapshot ; conserver les factures Stripe authentiques |
| Indicateurs | Projections arbitraires, charges fixes extrapolées, « bénéfice net » et TVA approximative | MRR/ARR/ARPU définis ; solde de pilotage ; TVA renseignée seulement |
| Contrats / e-mail | Storage `contracts/{memberUid}/...`, cible e-mail vérifiée dans le club, texte de signature trop affirmatif | Garder Storage, renforcer rôle/cible/attribution ; parler de consultation du contrat |
| SDK / secrets | Secrets privés mais états financiers et crédits modifiables directement par staff | Documents financiers et crédits réservés au serveur ; aucun élargissement des lectures |

## Modèles et compatibilité

- **Plan (`plans`)** : identité, club, nom, prix, description, périodicité et anciens champs engagement / moyens / crédits conservés. `currency`, `vatRate`, `isActive`, dates optionnelles. Une formule est archivée, jamais effacée par ce parcours. Les anciens plans sans devise sont interprétés en EUR ; sans `isTTC`, le montant est traité comme TTC ; sans TVA, celle-ci reste inconnue. Aucun backfill silencieux.
- **Subscription (`subscriptions`)** : snapshot du Plan (nom, prix, périodicité, devise, TVA, HT/TTC), membre/club et référent, contrat/dates, `collectionMode`, snapshot `stripePriceId`, `creditGrant`, marqueur `creditsGrantedAt`. `pending` complète active/cancelled/past_due/unpaid. Interne : actif et crédits attribués atomiquement, sans signifier qu'un paiement est encaissé. Stripe : pending jusqu'à une confirmation de paiement. Un abonnement ouvert par membre (active/pending/past_due/unpaid) ; remplacer demande d'abord de clôturer l'interne ou résilier Stripe dans Stripe. Pas de remplacement silencieux.
- **Payment (`payments`)** : nouveau paiement en attente, montant et devise canonical ; IDs Stripe optionnels, lien abonnement/facture, état refunded/partially_refunded distinct de failed, montant remboursé. Canal de collecte verrouillé pour éviter encaissement manuel + Checkout + prélèvement du même Payment.
- **Invoice (`invoices`)** : collection conservée pour documents historiques et nouveaux `documentType: receipt`. Référence serveur déterministe, transaction et snapshot structure/adhérent/date/montant/devise/TVA/paiement. Un reçu existant n'est pas recalculé après changement de profil. PDF « Justificatif de paiement », pas facture fiscale. Les documents historiques restent consultables sans déclaration rétroactive de conformité.
- **Expenses / FixedCost** : saisies internes et droits historiques conservés. Dépenses datées incluses dans le solde. Charges fixes mensuelles affichées séparément : ni multiplication arbitraire ni double décompte automatique. Pas de comptabilité légale.

## Autorité et droits

Le middleware Auth existant vérifie le jeton Firebase ; chaque orchestration relit le profil, le club, le membre et le document cible. `clubId`, `role`, `customerId`, `priceId`, statut et IDs Stripe reçus du navigateur ne donnent aucun droit. L'API de création d'un paiement accepte un montant choisi par le staff autorisé ; le prélèvement accepte uniquement sa référence et utilise le montant enregistré.

Owner Solo/Studio/Legacy : gestion des formules, assignations, paiements, crédits, synchronisation/prélèvement/Checkout et remboursement manuel. Owner Solo/Studio doit correspondre à `club.ownerId`. Coach Studio : adhérents canoniquement attribués ET présents dans son index ; assignation interne, création de paiement en attente, encaissement manuel, contrat/dates et reçu. Synchronisation Stripe, prélèvement, Checkout et ajustement libre des crédits restent réservés à l'owner. Pas d'autorité financière cross-club nouvelle pour le super-admin. Legacy préserve son owner existant sans inventer de ownerId.

Member : lecture de ses abonnements/paiements, montant/statut/contrat, factures Stripe si disponibles et portail sur son Customer canonical. Pas de cockpit financier ni de secret. Les documents de reçus utilisent les mêmes lectures par adhérent/attribution que payments. L'abonnement SDK aux reçus et la propagation de changement de coach ont été alignés sur ce périmètre.

Les règles bloquent create/update/delete SDK pour plans/subscriptions/payments/invoices ; les champs User stripeCustomerId/stripeCustomerClubId/credits/sessionCredits/paymentStatus sont server-owned, y compris pour l'admin. stripeSecrets et billingOperations restent illisibles/inaccessibles au client. Expenses/FixedCost restent des écritures staff internes suivant les règles historiques. Storage et ses contrats ne sont pas modifiés.

## Stripe : réponses d'architecture

1. **Propriétaire des comptes** : chaque structure utilise son propre compte Stripe fourni par l'owner. Aucun marketplace ni Connect OAuth nouvellement introduit.
2. **Clé utilisée** : `stripeSecrets/{clubId}.secretKey`, jamais le body du paiement, jamais le Club public. La migration legacy existante vers cette collection reste disponible au manager. Connexion : vérification du compte par le SDK ; status vérifie réellement la clé, pas seulement le booléen du Club. Aucun secret retourné ou log détaillé.
3. **Club du webhook** : `/api/stripe/webhook/:clubId` identifie la configuration privée. Il faut configurer cet endpoint dans le compte Stripe correspondant et enregistrer son secret de signature depuis Paramètres. La mission ne l'a pas fait en production.
4. **Signature** : `express.raw` avant express.json, puis `stripe.webhooks.constructEvent` avec `stripeSecrets/{clubId}.webhookSecret`. Métadonnées contradictoires refusées. Ancien `/api/stripe/webhook` accepté uniquement avec `STRIPE_WEBHOOK_CLUB_ID`, secret global explicite et clé globale identique à celle du club. Sinon 503. L'ancien webhook global ne peut **pas** valider automatiquement tous les comptes configurés.
5. **Subscription Stripe ↔ Velatra** : Checkout créé serveur avec customer canonical, client_reference_id = ID Velatra, metadata club/memberUid/memberId/subscriptionId/planId et subscription_data.metadata. Price relu et comparé à la snapshot, devise, périodicité et metadata. Factures : metadata explicite ou mapping stripeSubscriptionId unique dans le club. Aucun premier abonnement par memberId.
6. **Invoice Stripe ↔ Payment** : ID Payment déterministe sur club+stripeInvoiceId, transaction. IDs/liens facture et PDF sauvegardés. Formats anciens payment_intent/charge et nouveaux `payments.data` supportés pour une association unique. Le handler peut relire la facture avec expansion payments, après signature, dans le bon compte. Doublons invoice.paid / invoice.payment_succeeded ne recréent ni paiement ni crédits.
7. **Endpoints faisant autorité** : POST `/api/billing/plans`, `plans/:id/archive`, `plans/:id/sync`, `subscriptions/assign`, `subscriptions/:id/cancel`, PATCH `subscriptions/:id`, POST `payments`, `payments/:id/manual`, `payments/:id/charge`, `payments/:id/refund`, `payments/:id/receipt`, `members/:id/credits`, `checkout`, `/api/stripe/portal`, `/api/stripe/webhook-config`, webhooks signés. Anciennes APIs create-plan/payment-link/charge-customer retournent 410 et demandent de rafraîchir l'app.
8. **Limites de passage à l'échelle** : provisioning manuel d'un endpoint et secret par club, comptes hérités à réconcilier, configuration des permissions Stripe/portail, supervision et réconciliation des événements refusés. Connect OAuth / provisioning automatisé pourra remplacer cette gestion ultérieurement dans une mission dédiée.

### Customer, charge et idempotence

Un Customer relu via la clé du club doit porter metadata clubId + memberUid exactes. Un historique sans ces preuves est refusé ; pas de déduction par e-mail ou d'association silencieuse. Nouveau Customer : création idempotente et association serveur au User.

PaymentIntent : montant/devise du Payment et Customer canonical ; moyen enregistré vérifié. Aucun moyen enregistré : message explicite et usage de Checkout. Résultat relu chez Stripe ; succeeded uniquement devient paid. Un CardError contenant un PaymentIntent identifiable peut être réconcilié par lecture ; sans preuve, l'état n'est pas déclaré payé. L'authentification supplémentaire peut rester en attente et nécessite réconciliation ; aucun second PaymentIntent arbitraire.

`billingOperations` conserve signature et résultat d'opération, clé Stripe stable liée au club et contexte du compte/mode. Les arguments changés sont refusés. Une opération incertaine de plus de 23 heures est refusée pour réconciliation plutôt que recréée au-delà de la durée minimale de rétention Stripe. Le Payment / Subscription épingle aussi son contexte Stripe et son canal. Doubles clics/retry et événements en doublon sont couverts par transactions et clés stables. Une Checkout Session réutilisée reste la même ; son expiration nécessite actuellement une réconciliation par l'owner, pas une nouvelle session automatique.

### Remboursement et résiliation

Aucun appel refunds.create n'est exposé. Le remboursement Stripe se fait dans le dashboard Stripe ; charge.refunded met à jour un paiement associé par PaymentIntent unique et garde le montant remboursé monotone, sans ressusciter un paiement remboursé sur un événement payé tardif. Les factures payées par plusieurs sources nécessitent une réconciliation manuelle, aucune association devinée.

Cash/transfer : action distincte « enregistrer le remboursement manuel complet », après confirmation que le montant a déjà été rendu. Transaction/idempotence ; aucun transfert bancaire déclenché par cette action. Résiliation Stripe : dashboard/portail Stripe, suivi par webhook. Clôture interne : serveur, historique conservé, crédits déjà attribués non supprimés.

## Crédits et Booking V2

Calcul historique maintenu : monthly+weekly = base×4 ; yearly+weekly = base×52 ; yearly+monthly = base×12 ; autres = base. Même calcul pour sessionCredits par type. C'est une allocation **initiale**, pas un moteur de renouvellement : aucun cron hebdomadaire/mensuel. Les renouvellements invoice.paid ne recréditent pas l'allocation initiale. Les anciens abonnements sans snapshot de crédit ne reçoivent pas de crédit nouveau deviné.

Assignation interne transactionnelle abonnement+User+notification. Stripe : attribution initiale au premier paiement confirmé, protégée par creditsGrantedAt. Ajustements manuels owner avec requestId et transaction, solde non négatif. Booking V2 et son annulation gardent leurs consommations/restitutions serveur existantes ; tests de régression inclus dans la suite complète.

## Indicateurs et documents

- MRR : somme des snapshots des abonnements récurrents actifs en EUR, mensuel entier + annuel/12 ; once, pending, cancelled, past_due, unpaid exclus. Ce sont les prix enregistrés, suivant leur base HT/TTC ; pas une simulation des encaissements ni une normalisation fiscale des anciens prix.
- ARR = MRR×12. ARPU récurrent = MRR / nombre d'abonnements récurrents actifs. Pas « revenu total par client ».
- Encaissements nets : paid/refunded/partially_refunded moins remboursements enregistrés ; pending/failed exclus.
- Solde de pilotage : encaissements nets moins dépenses saisies sur période. Pas bénéfice net ni déclaration fiscale exhaustive.
- TVA : extraction du montant TTC seulement quand le taux est renseigné, y compris zéro. Données inconnues exclues et dénombrées ; aucune valeur 20 % injectée pour l'historique. Prix HT sans TVA refusé pour facturation Stripe.
- Périodes : calendrier mois/année ou 7/30 jours glissants ; dates futures exclues sauf « Toutes les dates ».
- CSV financier : statuts explicites, montants bruts/TVA connue, cellules échappées (séparateurs, guillemets, nouvelles lignes, formules). Synthèse PDF avec période, définitions et limitation. jsPDF/autotable chargés à la demande.
- Projection arbitraire et intitulés « bénéfice net » / « bilan comptable » retirés. Facture Stripe authentique consultable quand son URL existe ; justificatif Velatra ne prétend pas la remplacer.

## Surfaces et accessibilité

Finances : Résumé → paiements à suivre → Abonnements → Formules → Dépenses. Quatre KPI de pilotage et trois indicateurs récurrents distincts. Téléphone : cartes/actions, pas tableau horizontal. Tablette : opérations et fiches lisibles. Desktop : cockpit ; à partir de 1600px liste/détail paiement. Données jamais cachées définitivement par la largeur. Recherche et période, états textuels, labels/focus visibles, menus natifs details clavier ; confirmation de remboursement via dialogue navigateur natif. Formulaires Finances inline, donc pas de modal bloquante.

Client 360 > Administratif > Facturation : formule/statut/contrat/crédits/paiements, assignation atomique, encaissement manuel, justificatif et actions Stripe owner. Pas de redesign du reste de Client 360. Profil adhérent : abonnement et paiements propres. Paramètres conserve l'édition détaillée des crédits et la configuration Stripe.

## Vérification et éléments différés

Tests Stripe : SDK mocké, signatures hors ligne, fixtures et émulateurs demo-velatra uniquement. La recette navigateur utilise des composants réels, Firebase/APIs remplacés et toutes les requêtes externes bloquées. Elle contrôle les 15 formats demandés, zéro/1/100 adhérents, cinq sections Finances, états paid/pending/failed/refunded/partially_refunded, déconnexion/connexion simulées, plans historiques/archivés, Client 360, profil et Paramètres. Captures inspectées localement. Ce n'est pas une preuve d'une transaction live, de clés de production valides ou d'un webhook provisionné sur chaque compte.

Validation locale : lint et build réussis ; 298 tests applicatifs/émulateurs et 5 tests de garde CI réussis. Nouvelle suite Billing (32 tests exécutés, avec variantes Solo/Studio/Legacy), tests de règles financiers et signatures HTTP, et régressions runtime natif/compilé. La validation a reproduit une compensation CRM concurrente déjà présente : un compte Auth sans profil était classé comme préexistant via son horodatage et le claim pouvait être supprimé pendant la transaction concurrente. Correction minimale : ne pas relâcher le claim sur cette seule hypothèse ; retry sûr et test déterministe ajouté. Aucun nouveau parcours CRM ni changement de droits.

QA : 276 contrôles uniques de rendu sur les 15 formats (272 initiaux dont deux débordements Paramètres corrigés, puis 19 contrôles Paramètres/éditeur réussis et 15 contrôles Client 360 réussis). Contrôles de largeur, erreurs navigateur, confidentialité visuelle du profil et labels. Les autres surfaces restent celles de la passe complète réussie ; les captures locales ne sont pas ajoutées au dépôt. Résultats/PR/HEAD de livraison dans le rapport final.

Le serveur utilise la base Firestore `(default)` comme les APIs existantes et le site de production. L'override local AI Studio vers la base nommée peut diverger du serveur ; la QA de cette mission utilise des fixtures/émulateurs, pas cet override. Aucune migration ou changement de base introduit. Aucune opération live, aucune donnée financière de production modifiée, aucun déploiement Firestore effectué.

**FIRESTORE RULES CHANGED: YES**

**DEPLOYMENT REQUIRED: YES — PROMPT 11.1 FIRESTORE DEPLOY REQUIRED.**

Tant que les règles ne sont pas publiées séparément sur les deux bases, le verrouillage des anciennes écritures SDK n'est pas effectif en production. Le merge/déploiement Vercel ne publie pas les règles. La mission suivante doit tester puis déployer exactement les règles validées, conserver les releases précédentes et vérifier default + base nommée.

Différé : comptabilité certifiée, déclaration TVA, rapprochement bancaire, caisse/stock, SEPA complet, remboursements Stripe depuis Velatra, dunning et coupons avancés, renouvellement périodique fiable des crédits, provisioning Connect, récupération automatique de sessions expirées et reconciliation/migration contrôlée des Customers historiques.
