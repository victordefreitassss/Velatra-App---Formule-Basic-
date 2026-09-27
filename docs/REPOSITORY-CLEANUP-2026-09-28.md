# Audit de nettoyage du dépôt — 28 septembre 2026

## État initial et méthode

HEAD et origin/main après fetch : `d5de8cbb268d657242d6a24df8bb911249dc14e8`. Arbre propre, CI et Vercel verts. Branche dédiée `chore/repository-cleanup`. Les branches antérieures sont conservées. Le check requis `quality-gate` et la protection de main restent intacts.

Inventaire des 208 fichiers versionnés, tailles des blobs Git, fichiers vides, contenus et historique des candidats ; recherche littérale dans tous les textes suivis (imports, npm, CI, documentation, scripts, tests, Vercel et Firebase), puis résolution des imports TypeScript pour la copie de dashboard. Aucun script ponctuel suspect exécuté. Classification enregistrée avant toute suppression.

**37 fichiers examinés en détail : 18 DELETE, 7 KEEP, 12 UNKNOWN conservés ; aucun MOVE.** Les fichiers générés sont également couverts par des règles IGNORE précises.

## DELETE

Pour les 18 fichiers ci-dessous : aucun consommateur actif, aucun rôle de build/runtime/test nécessaire, aucune migration de données et aucune documentation active dépendante. Les deux seules références textuelles résiduelles sont explicitées ci-dessous ; elles appartiennent elles-mêmes aux résidus supprimés.

| Chemin | Octets | Preuve / raison |
| --- | ---: | --- |
| `[path]` | 0 | Fichier vide accidentel ; les seules occurrences sont des fragments de code dans les dumps Recharts. |
| `black_bg.txt` | 0 | Sortie de diagnostic vide, sans consommateur. |
| `fix_blocks2.cjs` | 3153 | Réécriture ponctuelle de MembersPage par numéros de lignes figés ; pas une migration de données. |
| `framer_indexof.txt` | 7566 | Résultat de recherche dans les sources et sourcemaps de node_modules/framer-motion. |
| `indexOfLog.txt` | 8177 | Extraits de recherches dans d’anciens bundles dist nommés par hash. |
| `lint.txt` | 0 | Sortie de lint vide, sans consommateur. |
| `output.txt` | 16996 | Extraits minifiés autour de indexOf ; aucune source produit originale. |
| `recharts_indexOf.txt` | 1999562 | Dump de recherche dans node_modules/recharts, identique à la variante de casse. |
| `recharts_indexof.txt` | 1999562 | Même blob Git que recharts_indexOf.txt ; collision de casse sur macOS/Windows. |
| `refactor_modal.cjs` | 8517 | Transformation textuelle ponctuelle d’une ancienne structure de MembersPage, sans appelant. |
| `remove-borders.cjs` | 984 | Ancienne retouche globale de classes CSS sous src ; aucun rôle runtime. |
| `remove-borders.ts` | 1455 | Autre retouche globale de bordures/rings/dividers ; sans script npm ou appelant. |
| `revert.cjs` | 1639 | Ancien remplacement massif de couleurs ; seulement cité dans un commentaire de revert_dark_mode.cjs. |
| `revert_dark_mode.cjs` | 1915 | Ancien remplacement massif de couleurs, sans appelant. |
| `run-browser.cjs` | 2302 | Diagnostic Puppeteer sans assertions, ancien bouton Accès Coach et identifiants de debug ; ne jamais exécuter pour cet audit. |
| `test-ai.cjs` | 334 | Appel HTTP manuel sans authentification ni assertion ; absent des suites et de la documentation QA active. |
| `test.cjs` | 58 | Affiche uniquement un message Hello, sans assertion ni consommateur. |
| `app/applet/components/MemberDashboard.tsx` | 12016 | Copie abandonnée sans import entrant, exclue du tsconfig, imports locaux vers types/Icons absents. App.tsx charge components/MemberDashboard.tsx. |

## KEEP

| Chemin | Raison |
| --- | --- |
| `scripts/patch-jwks-esm.mjs` | Appelé par postinstall ; indispensable aux tests du runtime. |
| `scripts/assert-test-emulators.mjs` | Appelé par pretest ; protège les tests des configurations non locales. |
| `scripts/ci/assert-test-emulators.test.mjs` | Exécuté par pretest ; cinq tests du garde-fou. |
| `scripts/qa/seed.mjs` | Fixtures locales documentées dans docs/QA-LOCAL.md. |
| `scripts/qa/http-smoke.mjs` | Recette HTTP avec assertions, documentée dans docs/QA-LOCAL.md. |
| `scripts/qa/visual-gallery.html` | Entrée de la galerie documentée dans les audits visuels/compagnon. |
| `scripts/qa/visual-gallery.tsx` | Importée par visual-gallery.html. |

## UNKNOWN — conservés sans modification

| Chemin | Raison |
| --- | --- |
| `functions/index.js` | Ancien backend de notifications ; état des fonctions éventuellement déployées non vérifié. Aucun retrait du backend. |
| `functions/package.json` | Manifeste du backend historique Node 18 ; conservé avec sa source, sans upgrade. |
| `metadata.json` | Métadonnées de l’environnement AI Studio ; consommateur externe possible, non établi. |
| `firebase-blueprint.json` | Schéma historique AI Studio ; pas une migration. Usage externe non établi. |
| `src/assets/images/stickman_bench_press_1777041161899.png` | Ressource visuelle historique ; aucun import textuel trouvé mais références de catalogue/données externes non exclues. Conservée. |
| `src/assets/images/stickman_bicep_curl_1777041212728.png` | Ressource visuelle historique ; aucun import textuel trouvé mais références de catalogue/données externes non exclues. Conservée. |
| `src/assets/images/stickman_burpee_1777041262908.png` | Ressource visuelle historique ; aucun import textuel trouvé mais références de catalogue/données externes non exclues. Conservée. |
| `src/assets/images/stickman_crunch_1777041229149.png` | Ressource visuelle historique ; aucun import textuel trouvé mais références de catalogue/données externes non exclues. Conservée. |
| `src/assets/images/stickman_overhead_press_1777041197888.png` | Ressource visuelle historique ; aucun import textuel trouvé mais références de catalogue/données externes non exclues. Conservée. |
| `src/assets/images/stickman_pull_up_1777041182050.png` | Ressource visuelle historique ; aucun import textuel trouvé mais références de catalogue/données externes non exclues. Conservée. |
| `src/assets/images/stickman_stretching_1777041278794.png` | Ressource visuelle historique ; aucun import textuel trouvé mais références de catalogue/données externes non exclues. Conservée. |
| `src/assets/images/stickman_treadmill_1777041244067.png` | Ressource visuelle historique ; aucun import textuel trouvé mais références de catalogue/données externes non exclues. Conservée. |

## Doublons, taille et ressources

Les deux dumps Recharts ont été ajoutés ensemble par `793528a`. Ils sont le même blob `f7b17104d2965e6ffb3c8ee19f6ed0dcadc53d2a`, de 1 999 562 octets chacun : leur retrait supprime la seule collision de casse détectée. Les trois fichiers vides partagent également un blob mais ne contiennent rien à préserver.

| Gros fichier / groupe | Taille initiale | Utilité et action |
| --- | ---: | --- |
| Deux dumps Recharts | 3 999 124 octets | Extraits générés de dépendances ; DELETE |
| `package-lock.json` | 405005 octets | Installation reproductible ; KEEP |
| `pages/MembersPage.tsx` | 294399 octets | Écran produit actif ; KEEP |
| `src/assets/images/` (8 PNG) | 1210292 octets | Ressources historiques ; UNKNOWN conservé |
| `public/brand/` et `public/product/` | 605876 octets | Logo, compagnon, icônes PWA et illustrations ; KEEP |

Taille logique initiale : **8 518 897 octets**, somme des 208 fichiers suivis. Retraits bruts réalisés : **4064236 octets**. Cette mesure compte les deux chemins Recharts, même lorsqu’un disque insensible à la casse n’en matérialise qu’un. Elle exclut node_modules, dist et .git. Aucun historique réécrit : la taille d’un clone et celle des objets Git ne sont pas réduites d’autant.

## IGNORE et README

Ajout uniquement des sorties de debug connues à la racine (`/output.txt`, `/indexOfLog.txt`, `/lint.txt`, `/black_bg.txt`, `/framer_indexof.txt`, `/recharts_index[Oo]f.txt`) et les répertoires temporaires `/.runtime-test-*/` créés par les tests runtime. Les logs, dist, node_modules et fichiers .env sont déjà ignorés. Aucun glob global sur les textes, les tests ou les captures QA.

Le README est limité à l’identité technique, au démarrage local et à la validation. Retrait de la bannière et des instructions génériques AI Studio, sans contenu marketing. Les audits récents restent inchangés.

## Vérification sensible

Contrôle ciblé des candidats pour clés API, jetons, clés privées et identifiants codés en dur. Dans `run-browser.cjs` : **contenu sensible détecté** (identifiants de debug), non reproduit dans ce rapport. Le script est supprimé sans être exécuté. Ce contrôle ne constitue pas un audit exhaustif de secrets ni de l’historique Git.


## Validation du lot

- `npm run lint`, `npm run build`, `npm run test:emulators` : réussis après le seul lot de suppressions.
- **81/81 tests applicatifs + 5/5 tests du garde-fou**, aucun ignoré ; Auth, Firestore et Storage sous `demo-velatra`, puis arrêt des émulateurs.
- Les **113 fichiers du build** ont les mêmes chemins et les mêmes SHA-256 qu’avant nettoyage : sortie produit identique octet pour octet.
- Aucun import ni chemin actif ne cible un fichier retiré. Seules les entrées d’ignore et ce rapport citent ces noms après nettoyage. Les liens locaux du README et des documents actifs restent valides.
- `git diff --check` propre ; workflow CI, package.json, lockfile, règles Firebase, configuration Vercel et sources actives inchangés.
- Aucune collision de casse restante dans l’index Git. Les nouveaux patterns ignorent les sorties ciblées, mais laissent les textes de documentation, tests, scripts et configurations versionnables.
- Les données fictives de la recette locale ont été exportées avant les tests ; aucune donnée de production n’a été modifiée.

Taille logique finale (rapport compris) : **4465194 octets** pour **191 fichiers** ; gain net : **4053703 octets**. Historique Git conservé.
