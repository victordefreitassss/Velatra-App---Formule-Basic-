# VELATRA — Responsive Capability Map

Audit du 29 septembre 2026 · base `dc6d050e76c9c9f6bf22aa8bd9ecb8c79cba0351`.
Référence métier et sources : [Master Feature Map](VELATRA-MASTER-FEATURE-MAP.md).

## RESPONSIVE PRODUCT STRATEGY — règle de référence

**DESKTOP = pilotage complet. TABLETTE = coaching opérationnel. TÉLÉPHONE COACH = action rapide. TÉLÉPHONE ADHÉRENT = expérience principale.**

Cette stratégie est le cadre des prochaines missions Velatra. Elle ne transforme pas une fonctionnalité absente en fonctionnalité livrée. Chaque futur brief responsive doit la rappeler et préciser rôle, type de compte réellement stocké, largeur disponible et contexte.

Préserver les capacités et les données essentielles entre formats ; adapter densité, profondeur d’édition et présentation. Autoriser cartes, bottom sheets, drawers, menus secondaires, étapes et accès à une vue complète. Ne pas masquer définitivement une information utile à cause de la largeur. Ne pas proposer de desktop miniature horizontalement scrollable. Un défilement local de dates ou filtres n’est pas la même chose qu’un écran métier trop large ; il doit néanmoins être découvrable et utilisable.

Les résolutions ci-dessous sont des points de contrôle, pas des valeurs à coder dans les composants. Utiliser les breakpoints selon l’espace nécessaire et les container queries quand pertinent. À partir d’environ 1600px, privilégier liste+dossier+activité, calendrier+journée, pipeline+prochaine action quand ces données existent. Un formulaire peut rester plafonné. Une page adhérent centrée n’a pas à devenir un cockpit desktop.

Navigation téléphone coach souhaitée : **Accueil · Clients · Coaching · Planning · Business**. Actuellement : **Accueil · Clients · Coaching · Business · Plus**, avec Planning dans Clients/Plus. Ne pas perdre les destinations actuelles lors d’une évolution.

## Statut des colonnes

- **B** : base adaptée dans les états inspectés ; ce n’est pas une certification de tous les parcours.
- **A** : amélioration nécessaire, sans blocage systématique démontré.
- **D** : défaut reproduit ou capacité opérationnelle perdue.
- **NV** : pas de validation dédiée de cette capacité/ce format dans cette passe. Une lecture de code ne devient pas une note de réussite.
- **NA** : capacité absente/indisponible ; qualité d’usage non attribuable.

Les qualités **Phone / Tablet / Desktop** décrivent l’existant. `PHONE ROLE`, `TABLET ROLE`, `DESKTOP ROLE` décrivent la **cible recommandée**, y compris pour les capacités futures explicitement identifiées dans la carte maître. Elles ne sont pas des droits d’accès. Pour une même capacité, toujours appliquer les droits du rôle et du compte.

## Matrice des capacités

### F01 — Connexion, Google, réinitialisation du mot de passe

Formulaire dédié ; styles des champs mobiles globaux.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | complète | complète | complète |

### F02 — Inscription coach ou structure sur invitation

Formulaire par étapes ; pas de recette de soumission dans cet audit.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | complète | complète | complète |

### F03 — Invitation et onboarding adhérent

Étapes séquentielles ; contrôles mobiles globaux ; non ouverts ici.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | complète | complète | secondaire |

### F04 — Séparation durable Solo / Studio

Aucune variante responsive spécifique à accountType.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NA | NA | NA | complète | complète | complète |

### F05 — Navigation, recherche de pages, actions rapides

Rail à partir de 1024 ; barre de cinq entrées en dessous ; onglets de contexte défilants.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | B | B | action rapide | complète | complète |

### F06 — Premiers pas coach

Checklist et résumé ; états 0–3 membres ; vue peu dense mais justifiée au démarrage.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | B | action rapide | complète | complète |

### F07 — Pilotage quotidien coach

Cartes/KPI et graphiques empilés ou en grille ; état mature testé avec cinq membres fictifs.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | A | action rapide | complète | complète |

### F08 — Liste, recherche et filtres clients

Cartes compactes sous lg, lignes à colonnes au-dessus ; filtres défilants ; coordonnées complètes dans le dossier.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | A | complète | complète | complète |

### F09 — Création et invitation individuelle de client

Dialog ; bouton principal disponible en mobile ; soumission et clavier non retestés.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | action rapide | complète | complète |

### F10 — Import CSV clients

Importer est hidden sous sm ; sélection et aperçu desktop/tablette ; pas de test d’import massif ici.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | NV | NV | absente volontairement | simplifiée | complète |

### F11 — Dossier client, identité et statut

Plein écran mobile avec onglets horizontaux ; sidebar dès md ; modal max 1360px.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | B | B | complète | complète | complète |

### F12 — Notes de suivi, mensurations et bilan client

Dossier commun ; saisie de date mesurée à 34px de haut ; pas de vue split liste/dossier.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | B | B | action rapide | complète | complète |

### F13 — Affectation adhérent → coach

Action dans le dossier, pas un espace équipe autonome.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | action rapide | complète | complète |

### F14 — Gestion de plusieurs coachs

Long formulaire partagé téléphone/tablette/desktop ; état équipe activée et désactivée testé.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | A | A | simplifiée | simplifiée | complète |

### F15 — Permissions avancées et rôles personnalisables

Aucune interface avancée à noter comme disponible.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NA | NA | NA | consultation uniquement | simplifiée | complète |

### F16 — Modèles de programmes et attribution

Cartes/filtres ; actions duplication/suppression nommées, mesurées à 312×42px à 390px après stabilisation des styles. Pas de défaut de cible minuscule confirmé sur ces actions.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | B | simplifiée | complète | complète |

### F17 — Builder manuel complexe

Une colonne puis trois panneaux au conteneur ≥1040px ; pas de miniature desktop horizontale.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | B | B | simplifiée | complète | complète |

### F18 — Programmation et synthèses assistées par IA

Dialogs intégrés au dossier ; génération et erreurs externes non testées aux 16 formats.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | simplifiée | complète | complète |

### F19 — Bibliothèque exercices et médias

Grille responsive ; actions iconiques petites sur tous les formats.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | A | A | consultation uniquement | complète | complète |

### F20 — Séance coach en direct

Plein écran avec inset et couche supérieure au shell ; lancement non ouvert dans cette passe (preuve PR8 antérieure).

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | action rapide | complète | complète |

### F21 — Accueil et prochaine action adhérent

Contenu mobile dédié ; largeur membre plafonnée à 1120px sur desktop.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | B | complète | complète | secondaire |

### F22 — Mes séances et consultation du programme

Action principale + sections À venir/Terminées ; responsive mesuré avec un programme réel en fixture.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | B | complète | complète | secondaire |

### F23 — Workout : saisie série, charge, répétitions

Expérience téléphone principale ; champs 22px ; bouton principal 288×52 à 320px, clic reçu.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | B | complète | complète | secondaire |

### F24 — Repos, pause et reprise de séance

Séance plein écran ; état de repos et progression 1/3 observés à 320px.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | B | complète | complète | secondaire |

### F25 — Fin de séance et synchronisation

Bilan et validation dédiés ; hors matrice visuelle détaillée de cette passe.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | complète | complète | secondaire |

### F26 — Check-in quotidien adhérent

Entrée dans l’accueil ; formulaire pas soumis ni mesuré séparément ici.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | complète | complète | secondaire |

### F27 — Progression, statistiques et historique sportif

Vue membre condensée, disclosures et cartes ; consultation desktop secondaire et centrée.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | B | complète | complète | secondaire |

### F28 — Photos d’évolution et mensurations adhérent

Galerie responsive ; état vide testé ; comparateur/photo ouverte non couvert.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | B | complète | complète | secondaire |

### F29 — Nutrition : création et suivi coach

Liste adhérents mesurée ; formulaire détaillé non couvert initialement par cette matrice.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | NV | NV | simplifiée | complète | complète |

### F30 — Nutrition : plan et journal adhérent

Priorité Noter un repas ; détails macros/IA dans disclosures ; état sans plan explicite.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | B | complète | complète | secondaire |

### F31 — Messagerie coach–adhérent et pièces jointes

Split discussion/liste coach ; conversation membre dédiée ; viewport mobile géré.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | B | complète | complète | complète |

### F32 — Conversation IA persistante

Conversation dédiée, bascule Mon coach/Velatra AI ; tests de géométrie seulement.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | B | complète | complète | complète |

### F33 — Planning, réservation, annulation

Jours défilants horizontalement, créneaux en cartes ; filtres coach ; pas une grille horaire complète desktop.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | A | action rapide | complète | complète |

### F34 — Configuration disponibilités, crédits et types de séances

Réglages imbriqués et grille de créneaux ; boutons supprimer mesurés 30×40.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | A | A | simplifiée | complète | complète |

### F35 — CRM : consultation, notes et pipeline

Liste sous 1280 ; six colonnes avec drag/drop dès xl ; noms tronqués au seuil 1280 mais lisibles dans le dossier.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| D | D | A | complète | complète | complète |

### F36 — Conversion prospect, séance d’essai et suivi commercial

Drawer de prospect ouvert à 390 ; coordonnées complètes, notes, date, Gagné et Supprimer ; formulaire de conversion ouvert, non soumis.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | NV | NV | action rapide | complète | complète |

### F37 — Relances programmées

Header trop large sur 320–390 ; cartes ensuite ; mêmes fonctions tablette/desktop.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| D | A | A | action rapide | complète | complète |

### F38 — Tâches automatiques et priorités

Synthèse sur accueil ; destination Tâches = relances prospects, continuité à clarifier.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | A | A | action rapide | complète | complète |

### F39 — Finances et analytics activité

Même richesse empilée mobile ; graphiques, KPI, période et onglets ; cartes paiements sous lg.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | B | A | simplifiée | simplifiée | complète |

### F40 — Encaissement, paiements et facturation client

Dossier facturation mobile mesuré ; actions disponibles sans réduction de profondeur ; clavier non testé.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | B | B | action rapide | complète | complète |

### F41 — Formules, abonnements, contrats et portail client

Cartes/formulaires ; contrat et portail accessibles via profil ; flux externes non ouverts.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | simplifiée | complète | complète |

### F42 — Exports CSV/PDF et factures

Bilan PDF/Export CSV visibles sur mobile ; téléchargement à valider, pas de gros tableau nécessaire.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | action rapide | complète | complète |

### F43 — Connexion Stripe et encaissement sécurisé serveur

Formulaire partagé ; accès UI ne garantit pas autorisation backend.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | A | A | consultation uniquement | simplifiée | complète |

### F44 — Drive commun, dossiers et partage

Header coach déborde à 320/360/375 ; vue membre vide sans ce défaut ; modales distinctes.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| D | B | B | action rapide | complète | complète |

### F45 — Documents client, avatar, contrats et médias

Contrôles répartis dans les dossiers ; état upload non couvert aux 16 formats.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | action rapide | complète | complète |

### F46 — Profil, objectifs et infos club

Profil membre centré ; infos club en sections ; formulaires non soumis.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | B | complète | complète | secondaire |

### F47 — Notifications et annonces

Badges/menus partagés ; pas de recette notifications système dans cette passe.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | action rapide | complète | secondaire |

### F48 — Chronomètre autonome

Panneau ouvert depuis le shell ; pas de mesure propre dans cette passe.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | action rapide | complète | secondaire |

### F49 — Campagnes marketing

Page statique adaptée à la largeur, aucune différence fonctionnelle.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NA | NA | NA | simplifiée | simplifiée | complète |

### F50 — Boutique adhérent et caisse/stock studio

Guide responsive ; aucune expérience caisse à tester.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NA | NA | NA | action rapide | complète | complète |

### F51 — Administration globale

Console dense ; KPI et onglets défilants sur téléphone ; contrôles de perspective de 34px.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| A | A | B | consultation uniquement | simplifiée | complète |

### F52 — PWA, entrée app et hors ligne

Safe areas/champs/viewport prévus ; matrice desktop Chromium, pas appareils physiques.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | complète | complète | secondaire |

### F53 — Compagnon officiel, aide et guides

Guide mesuré ; composant mascotte pas réaudité dans tous ses états.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| B | B | B | action rapide | complète | complète |

### F54 — Site public produit et contact

Architecture publique distincte ; homepage non modifiée.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | complète | complète | complète |

### F55 — Apple Health / MyFitnessPal

Aucun parcours utilisable à qualifier.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NA | NA | NA | complète | complète | secondaire |

### F56 — Fidélité, XP, trophées et communauté

Aucune recette de page trophées via navigation normale ; données de profil seules.

| Qualité phone | Qualité tablet | Qualité desktop | PHONE ROLE | TABLET ROLE | DESKTOP ROLE |
| --- | --- | --- | --- | --- | --- |
| NV | NV | NV | complète | complète | secondaire |

## Matrice de recette exécutée

Les 41 vues/états listés plus bas ont été mesurés à **chacun** de ces 16 formats. Les valeurs d’overflow correspondent au maximum observé du document au-delà du viewport, et non aux rubans de filtres volontairement défilants.

| Format | Viewport CSS | Vues mesurées | Débordement global constaté |
| --- | --- | ---: | --- |
| Phone XS | 320×568 | 41 | Drive coach : scrollWidth 385 (+65) ; relances : 414 (+94) |
| Phone S | 360×800 | 41 | Drive : 385 (+25) ; relances : 414 (+54) |
| Phone standard | 375×812 | 41 | Drive : 380 (+5) ; relances : 414 (+39) |
| Phone modern | 390×844 | 41 | Relances : 414 (+24) |
| Phone large | 430×932 | 41 | Aucun >3px dans les états mesurés |
| Tablette portrait | 768×1024 | 41 | CRM : scrollWidth 801 (+33), bouton Nouveau Lead tronqué |
| Tablette portrait | 820×1180 | 41 | Aucun >3px dans les états mesurés |
| Tablette paysage / petit desktop | 1024×768 | 41 | Aucun >3px dans les états mesurés |
| Tablette paysage | 1180×820 | 41 | Aucun >3px dans les états mesurés |
| Laptop | 1280×800 | 41 | Aucun >3px dans les états mesurés |
| Laptop | 1366×768 | 41 | Aucun >3px dans les états mesurés |
| Desktop standard | 1440×900 | 41 | Aucun >3px dans les états mesurés |
| Desktop large | 1600×1000 | 41 | Aucun >3px dans les états mesurés |
| Desktop large | 1728×1117 | 41 | Aucun >3px dans les états mesurés |
| Wide | 1920×1080 | 41 | Aucun >3px dans les états mesurés |
| Ultrawide | 2560×1440 | 41 | Aucun >3px dans les états mesurés |

Un document qui ne déborde pas peut toujours contenir un panneau tronqué, des actions peu découvrables, un composant inaccessible au clavier, un champ masqué par un clavier virtuel ou des colonnes peu lisibles. Les résultats ci-dessus ne sont donc pas un certificat de conformité responsive.

### Vues et états couverts

| Rôle / état | Clés ou surfaces contrôlées | Nombre |
| --- | --- | ---: |
| Owner, base avec 1 membre/programme, 6 prospects et paiement fictif | users, home débutant, coaching, presets, crm_pipeline, crm_finances, calendar, settings, nutrition liste, exercises, history vide, drive vide, chat, crm_tasks, marketing, about, guide | 17 |
| Member, même base | home, calendar, planning, performances sans historique, nutrition sans plan, ai_coach, history vide, profile, messages, supplements, drive vide, evolution vide | 12 |
| Surfaces ouvertes par interaction | owner/editor modèle existant, owner/dossier vue d’ensemble, owner/dossier-facturation, member/workout première série | 4 |
| Owner mature | home avec 5 membres et historique fictif | 1 |
| Coach salarié | users, settings | 2 |
| Superadmin | admin, onglet initial, sans clubs dans la fixture | 1 |
| Owner équipe désactivée | settings, canAddStaff=false | 1 |
| Member données remplies | nutrition avec un repas, performances avec log/performance, history avec une séance | 3 |
| **Combinaisons uniques** | **41 × 16** | **656** |

La fixture reproduit les formes de données et les composants, pas un moteur de règles Firebase. Les conditions de rôle de l’interface sont observables, mais les jeux retournés par les fausses collections ne démontrent pas le cloisonnement entre coachs. Pour ce sujet, se référer aux tests de règles et audits de sécurité dédiés, sans les déclarer rejoués ici.

### Interactions effectivement effectuées

- Ouvrir un dossier depuis une vraie ligne client ; changer vers Facturation ; lecture de la vue tablette 820px.
- Ouvrir l’éditeur depuis Modifier sur un modèle ; inspection mobile/large écran ; aucune sauvegarde.
- Ouvrir le dossier d’un prospect sur téléphone ; retrouver ses coordonnées complètes ; cliquer Gagné pour ouvrir le formulaire de conversion ; ne pas créer le membre.
- Démarrer une séance fictive ; saisir 20 kg ; valider une série à 320×568 ; constater 1/3 et le repos de 90 secondes. Le bouton principal était à x=16, y=508, 288×52px, et `elementFromPoint` identifiait bien son contenu au centre.
- La navigation via paramètres QA sert uniquement à accéder rapidement aux autres états dans le banc local. Ce n’est pas un test de tous les liens du produit.

### Méthode géométrique

Après rendu des composants et contre-vérification des styles : largeur réelle `innerWidth`, `documentElement.scrollWidth`, rects DOM, scrolls internes, titres et petits contrôles. Tolérance de 3px pour l’overflow global ; échantillonnage des contrôles de moins de 40px dans une dimension pour trouver les candidats à inspection. Le seuil 40px est un détecteur de risque, pas une affirmation normative WCAG. La cible produit recommandée pour les actions tactiles principales est 44px ou davantage.

Les relevés inspectent le main et les dialogues déclarés avec `role=dialog`. Les portails sans sémantique de dialogue nécessitent une inspection spécifique ; les modales non ouvertes ne sont pas couvertes. Les cases à cocher peuvent disposer d’un label agrandissant leur cible réelle ; l’input fichier 1×1 de la messagerie est volontairement masqué. Ces cas ne sont pas comptés automatiquement comme bugs.

Les premiers relevés des modèles précédaient la génération complète des styles Tailwind : une mesure de 19px a été écartée après vérification des boutons à 42px de hauteur. Le CRM à 768px a été remesuré après animation (801px de largeur document). Les mesures sont propres au banc et aux données indiquées.

Certaines animations/décorations ont des rects hors écran tout en étant coupées par leur conteneur. Elles ne constituent pas, à elles seules, une perte de donnée. Les observations ci-dessous séparent ces faux positifs des défauts confirmés.

## Défauts et recommandations vérifiables

| ID | Priorité | Constat actuel et conséquence | Preuve / reproduction | Critère d’acceptation de la correction future |
| --- | --- | --- | --- | --- |
| R01 | P1 | Drive coach : titre écrasé, Importer partiellement hors écran | `drive`, 320/360/375 ; screenshot 320 ; `pages/DrivePage.tsx` | Aucun overflow global aux 16 formats, deux actions lisibles et accessibles à 320 |
| R02 | P1 | Relances : filtres et CTA débordent ; le bouton À rappeler avant ne fait rien | `crm_tasks`, 320–390 ; screenshot 320 ; bouton sans onClick dans `TasksPage.tsx` | Header adapté ; CTA conduit à une vraie action ou disparaît avec explication |
| R03 | P1 | CRM : changement d’étape générique lié au drag/drop absent sous xl ; pas de sélecteur équivalent dans le drawer | `ProspectFlowPage.tsx` : liste mobile vs `hidden xl:flex`, handleDrop ; drawer 390 ouvert | Toutes les transitions autorisées disponibles par menu/bouton sur phone/tablet et au clavier desktop |
| R04 | P1 | Type de compte non persistant ; la stratégie Solo/Studio ne peut pas être appliquée de façon fiable | F04 ; création serveur et `types.ts` | Contrat accountType explicite, migration vérifiable, règles d’accès cohérentes, sans déduire des notes |
| R05 | P1 | CRM tablette : titre comprimé et bouton Nouveau Lead partiellement hors écran | F35 ; 768×1024 ; capture et scrollWidth stabilisé à 801px | Header capable de se réorganiser selon la largeur utile, bouton intégralement accessible |
| R06 | P2 | Exercices 32×40, éditeur environ 30–36×40, édition dossier 30×30 ; crédits +/- 32×44 | F19/F17/F11/F40, 390 ; rects DOM | Actions tactiles plus larges ; pas de changement métier ; inspection des labels et états disabled |
| R07 | P2 | Au seuil laptop, six colonnes CRM tronquent déjà les noms courts ; ouvrir le dossier restitue la donnée | Screenshot 1280 ; noms Prospect exemple… | Basculer selon largeur utile ou permettre une vue liste complète ; ne pas supprimer la donnée |
| R08 | P2 | Import CSV entièrement caché sous sm, sans entrée vers une vue complète | `MembersPage.tsx`, label `hidden sm:flex` ; Importer présent desktop, absent phone | Absence volontaire expliquée et continuité vers desktop ; ne pas cacher les exports simples |
| R09 | P2 | L’interface Paramètres présente des réglages administratifs au coach salarié alors que certaines API refusent ce rôle | Vue coach/settings, serveur create-staff et Stripe | Ne proposer que les actions permises, ou expliquer lecture seule ; ne pas élargir les droits pour résoudre une gêne UI |
| R10 | P2 | Grand écran : Clients max 1440, accueil max 1320, pipeline max 1600 ; grandes marges, pas de liste+dossier persistante | `visual-polish.css`, `ProspectFlowPage.tsx` ; captures Clients 1920 et builder large | Utiliser l’espace supplémentaire pour du contexte métier utile ; garder les formulaires lisibles |
| R11 | P2 | Navigation téléphone coach différente de la cible ; Planning demande une entrée secondaire | Shell observé et `appShellHelpers.ts` | Rendre Planning immédiatement trouvable sans perdre Plus et les autres destinations |
| R12 | P2 | Builder phone : métadonnées puis séance puis paramètres très bas ; beaucoup de défilement pour une modification simple | Screenshot 390 ; aucune largeur globale excessive | Raccourci d’édition rapide ou panneau dédié, toujours accès à l’édition complète |
| R13 | P2 | Finance phone garde une profondeur presque desktop et des rubans d’onglets défilants | F39 ; vue initiale 320–2560 | Synthèse et action paiement immédiates ; détails consultables à la demande, aucune donnée perdue |
| R14 | P2 | Tables legacy : règle globale `display:block; overflow-x:auto` sous 600px | `app-shell.css` ; risque source, pas preuve que toutes les tables débordent | Vérifier chaque table peuplée ; cartes/accordéons pour les tâches phone, pas de miniature générale |

P1 signifie ici capacité importante bloquée ou fondation manquante ; P2 signifie amélioration nécessaire. Ce classement ne constitue pas un nouvel audit de sécurité exhaustif.

## Points à préserver

- Cartes clients sous 1024px : identité, programme, activité et coach restent consultables ; `visual-polish.css` restaure l’activité mobile malgré le `hidden` initial du JSX. Ne pas conclure à une perte à partir du JSX seul.
- CRM : le passage en liste est la bonne base. Corriger la parité des actions sans remettre six colonnes scrollables sur téléphone.
- Paiements/dépenses : variantes en cartes sous lg ; ne pas revenir à une table miniature.
- Builder : container query à 1040px de largeur **du composant**, trois panneaux quand l’espace est suffisant. La liste des exercices n’impose pas un scroll horizontal.
- Séance membre : saisie lisible, progression, repos, sauvegarde locale explicitée, CTA touchable à 320px. Les interactions locales ont été constatées.
- Dossier tablette : sidebar et contenu coexistent à 820px ; le max-width garde une lecture raisonnable.
- Les blancs d’une liste vide, d’un compte débutant ou d’un contenu membre centré ne sont pas automatiquement des défauts. Les améliorations de densité concernent surtout le pilotage coach avec des données.

## Limites restant à lever avant une certification complète

- Pas de téléphone physique, Safari iOS, clavier virtuel réel, mode installé, lecteur d’écran ni zoom 200% testé.
- Pas de test de charge avec 100/1000 clients, milliers de messages, programmes très longs, libellés extrêmes ou comptes possédant plusieurs structures.
- Pas de validation réseau réel pour création de compte, emails, Firebase, Stripe, Gemini, paiement, upload ou sauvegarde. Les écritures de la fixture sont refusées ; les appels IA automatiques peuvent donc afficher une erreur locale attendue.
- Pas de parcours complet des quatre étapes d’onboarding, des pages publiques, de tous les onglets admin, des modales nutrition/CSV/documents et des états hover/focus/erreur.
- Le journal des vues couvre géométrie/états rendus ; seuls les moments décrits ont fait l’objet d’une inspection screenshot et d’interactions. Il ne faut pas le renommer « toutes les pages validées manuellement ».
- Les polices de repli du banc, le navigateur desktop et l’absence d’insets physiques limitent la précision visuelle. Les résultats de densité sont des diagnostics, pas une validation pixel-perfect.
- Les tests automatisés de PR antérieures ne sont pas des preuves d’exécution de cet audit ; voir `MOBILE-FOUNDATIONS-REVIEW-2026-09-28.md` pour leur périmètre.

## Ordre proposé pour la prochaine passe

1. Rétablir CRM et relances comme actions opérationnelles sur téléphone/tablette ; corriger les headers Drive/relances/CRM tablette et les petites cibles. Tester immédiatement aux 16 formats et avec clavier.
2. Définir le modèle de comptes, l’activation équipe et la présentation des droits ; réconcilier offres commerciales et plans legacy sans migration implicite.
3. Améliorer les surfaces de pilotage desktop et l’édition terrain tablette, en préservant l’expérience principale adhérent et les couleurs/polices/mascotte existantes.

Cette mission livre les deux cartes et les défauts à traiter. Aucun redesign ni correctif métier n’est inclus.
