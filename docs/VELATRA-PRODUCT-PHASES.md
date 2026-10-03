# Velatra — consolidation produit par phases

Base analysée : main `24b9a755b7e10d1949295eae1954a50e0324a9de`.

## Audit et sources conservées

| Module | Existant réutilisé | Limite constatée / phase |
| --- | --- | --- |
| Navigation | `Layout`, catalogues filtrés par capacités, shell desktop | Messages enfouis et destinations métier dispersées ; phase 1 |
| CRM | `ProspectFlowPage`, `prospects`, six statuts + `pending` legacy | Pas de vraie table filtrable ; tiroir vertical surchargé ; phase 2 |
| Sales | Création/stages/affectation serveur, essais, présence, performance | Conserver les événements Sales et les calculs de cohorte |
| Conversion | `convertProspect` + `createManagedMember`, claims idempotents | Conserver lien prospect/membre et retry ; ne pas souscrire implicitement une offre |
| Notes / activité | `notesHistory`, `activityHistory` du prospect | Journaux bornés 100 notes / 80 événements, pas un historique exhaustif ; phase 2 organise et expose cette limite |
| Relances / tâches | `nextReminderDate`, `TasksPage`, collection `tasks` | Ne pas recopier une relance dans tasks ; moteur transversal en phase 4 |
| Client 360 | Fiche existante, coaching, progression, administratif | Réorganisation métier en phase 3 |
| Pulse / Retain | Actions et moteur explicable existants | Garder leurs responsabilités ; intégrations supplémentaires en phase 4 |
| Planning / Coaching | Réservations transactionnelles, programmes, exercices, nutrition | Approfondissement en phase 5 |
| Équipe / Drive | Team V2, affectations, accès Drive révocables par API | Connexions portefeuille/charge/documents en phase 6 |
| Recherche / notifications / historique | Command palette, routes contextuelles et modules existants | Recherche groupée et cohérence des liens en phase 7 |
| Billing | Permissions et autorité serveur existantes | Aucune vente ni modification de plan par une simple offre CRM |

`pages/ProspectsPage.tsx` est un ancien composant non routé ; aucune suppression dans cette PR. Les composants métier restent accessibles. Les vues prospect Messages/Documents ne disposent pas de relation canonique exploitable : ne pas afficher de boutons simulant une intégration.

## Plan d'exécution

1. **Navigation et UI internes** : hiérarchie desktop par rôle ; destinations existantes conservées ; composants de page, onglets, filtres, badges, table et pagination ; bleu/indigo comme accent principal des pages concernées.
2. **CRM Prospects — même PR** : conserver six étapes compatibles ; pipeline et liste ; filtres/recherche/tri ; dossier avec résumé, notes CRM, activité et rendez-vous ; offres indicatives et tags ; interactions manuelles explicites ; relances existantes et conversion existante. Tests d'isolation, de permissions, workflows et formats. Captures Coach indépendant et Manager 1440 px.
3. **Client / Member 360** : harmoniser les sections existantes, rendez-vous et abonnement autorisé, documents liés. Définir les liens manquants avant toute nouvelle donnée.
4. **Tasks / Pulse / Retain** : enrichir le moteur de tâches existant, résultats et reports ; relier les signaux Retain aux actions sans dupliquer le scoring.
5. **Planning / Coaching** : opérations jour/semaine, contexte client, espace de travail programmes/bilans ; conserver transactions et workout engine.
6. **Team / Drive** : portefeuille, capacité factuelle, affectations traçables, vues fichiers basées sur relations réelles ; maintenir contrôle d'accès à chaque téléchargement.
7. **Recherche globale / polish** : résultats groupés tenant-scoped, commandes existantes, pages legacy restantes ; import/export seulement après les workflows principaux.

Chaque phase doit disposer de sa PR, ses tests et sa validation visuelle. Aucun déploiement de données, merge automatique ou migration destructive.

## Fonctions incomplètes identifiées (sans élargir cette PR)

- `MarketingPage` annonce explicitement les campagnes indisponibles ; phase ultérieure distincte, aucune campagne simulée ajoutée.
- `MemberSupplementsPage` affiche un message « boutique partenaire bientôt » au clic ; reste à remplacer par une vraie intégration ou une information sans promesse d'action, hors phases 1–2.
- La recherche du shell trouve des pages/sections, pas encore tous les contacts et documents : phase 7.
- La vitrine publique `HomePage` possède un aperçu illustratif avec des chiffres statiques ; ce n'est pas le dashboard connecté. Les vues CRM connectées utilisent exclusivement les données chargées.
- Pas de relation canonique documents/prospect ni boîte de réception CRM. Les échanges manuels consignés sont clairement distingués d'un envoi effectif. Aucun onglet Documents simulé.
