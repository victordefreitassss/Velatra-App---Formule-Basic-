# Activation des comptes existants

Migration exécutée le **2 octobre 2026**, sur **velatra-75daa / (default)**, depuis la branche `feat/activate-current-accounts`, basée sur `ec365cbd6cc42502049badca310e3c1eba9ef890`.

## Résultat production

| Mesure | Avant | Après |
| --- | ---: | ---: |
| Clubs, inventaire complet | 2 | 2 |
| Déjà / désormais solo | 0 | 2 |
| Déjà / désormais studio | 0 | 0 |
| Clubs legacy, champ absent | 2 | 0 |
| Clubs NEEDS_REVIEW | 0 | 0 |
| Clubs sains encore legacy | 2 | 0 |

**2 clubs migrés vers solo ; 0 vers studio.** Un utilisateur est lié à un club inexistant. Cette anomalie distincte est signalée dans l'audit privé ; ce profil est laissé intact et n'affecte pas la structure des deux clubs existants. Aucun compte sans club n'a été trouvé.

Seul `clubs/{clubId}.accountType` a été écrit. Aucun changement de `saasPlanId`, `plan`, `isActive`, rôles, affectations, utilisateurs, Auth, Storage, Stripe ou autre donnée métier. Les champs projetés des clubs hors accountType et les versions des documents utilisateurs sont identiques avant/après. Les transactions ne contiennent qu'un `update({ accountType })`.

Une deuxième application, après nouveau dry-run, a produit **0 mutation**. Deux relectures indépendantes ont confirmé **0 club legacy** et les expériences effectivement représentées : **2 SOLO_OWNER et 3 MEMBER**. Pulse et Retain sont accessibles aux deux Owners via leurs capacités existantes. Aucun Studio, Manager ou Coach n'est présent dans cet inventaire ; leurs expériences ont été vérifiées avec des fixtures synthétiques.

## Classification et protections

- `solo` ou `studio` explicite : préservé, indépendamment du staff et du plan.
- Champ absent et au moins un coach ou Manager dans `users` avec le même `clubId` : `studio`.
- Champ absent sans coach ni Manager interne : `solo`, y compris pour un plan premium.
- Un club suspendu sain est migré ; son `isActive` reste inchangé.
- Valeur présente invalide, propriétaire manquant/incohérent, plusieurs Owners, identifiant de club incohérent, affectation de coach inexistante ou d'un autre club, référence de coach entre clubs : `NEEDS_REVIEW`, aucune mutation automatique.
- Manager legacy : avertissement explicite, compatible avec la migration attendue vers Studio. Un club explicitement Solo avec staff reste Solo et fait l'objet d'un avertissement.
- Utilisateurs sans club ou liés à un club inexistant : signalement séparé ; aucune création ni correction de profil. Un Super Admin sans club est distingué d'un compte métier sans club.

Le plan historique et les notes ne servent jamais à classifier. Le script lit intégralement les collections nécessaires via une transaction en lecture seule avec projections minimales. L'audit conserve une empreinte de cet inventaire. L'application exige le même inventaire, crée une sauvegarde exclusive synchronisée sur disque, puis relit le club et les profils dans chaque transaction. Toute modification concurrente du staff ou de la classification fait ignorer le club et produit un résultat incomplet, sans écraser son état.

L'identité du projet est contrôlée avant connexion. Le CLI refuse un autre projet, un environnement CI ou des variables d'émulateurs en mode production. La cible est exclusivement `(default)` ; la seconde base de preview n'est pas migrée. L'Admin SDK côté serveur utilise ADC ou le compte déjà connecté du CLI Firebase **15.31.0**, via `--cli-auth-module`. Aucun secret n'est imprimé ou exporté. Les tests utilisent uniquement `demo-velatra` et les émulateurs locaux.

## Exécution reproductible

Depuis la racine du dépôt, dans une session serveur autorisée, définir des chemins absolus **hors dépôt**, dans un répertoire privé existant. Les fichiers audit/sauvegarde sont créés en mode `0600`, avec création exclusive : ils ne sont jamais remplacés. Le mode par défaut est dry-run.

```sh
node --import tsx scripts/migrations/activate-modern-account-types.ts \
  --dry-run --project velatra-75daa --audit "$VELATRA_MIGRATION_AUDIT"

node --import tsx scripts/migrations/activate-modern-account-types.ts \
  --apply --project velatra-75daa \
  --audit "$VELATRA_MIGRATION_AUDIT" --backup "$VELATRA_MIGRATION_BACKUP"
```

Avec le compte Firebase CLI connecté, ajouter `--cli-auth-module "$VELATRA_FIREBASE_CLI_AUTH_MODULE"`, pointant sur le fichier `lib/auth.js` de l'installation 15.31.0. Sans cette option, ADC est utilisé. Ne jamais passer de jeton en argument ni enregistrer de credentials dans le dépôt.

En cas d'échec partiel, conserver la sauvegarde initiale, relire avec un nouveau dry-run et utiliser de nouveaux chemins pour une reprise. Les clubs déjà migrés sont préservés. Après chaque application, inspecter `healthyLegacyRemaining`, les clubs ignorés et les indicateurs d'intégrité, puis effectuer une nouvelle relecture indépendante. Aucun script de migration n'est lancé automatiquement par CI ou lors d'un déploiement.

## Sauvegarde et rollback exact

La sauvegarde locale conservée par l'opérateur est `account-type-rollback-backup.json`, hors Git. Elle contient uniquement un tableau de `{ clubId, previousAccountType, nextAccountType, reason }`. Le champ absent est représenté par **`previousAccountType: { present: false }`**, et non par `null`. Les identités, noms de clubs et données privées ne sont pas publiés dans ce document.

**Le rollback n'a pas été exécuté.** Il restaure exclusivement `accountType`, avec un contrôle transactionnel de la valeur écrite par la migration. Pour les deux clubs de cette exécution, restaurer signifie supprimer le champ. Si la valeur courante diffère de `nextAccountType`, arrêter et vérifier manuellement plutôt que d'écraser un changement ultérieur.

Procédure depuis la racine du dépôt : définir `VELATRA_MIGRATION_BACKUP` sur la sauvegarde originale et, si nécessaire, `VELATRA_FIREBASE_CLI_AUTH_MODULE` sur le CLI connecté. Le code suivant est **read-only par défaut**. Examiner son rapport avant une éventuelle exécution explicitement autorisée avec `VELATRA_ROLLBACK_APPLY=true`. Ne pas lancer ce rollback pour valider la migration.

```sh
node --import tsx --input-type=module <<'JS'
import { readFile } from 'node:fs/promises';
import { FieldValue } from 'firebase-admin/firestore';
import { createProductionClient } from './scripts/migrations/activate-modern-account-types.ts';
const apply = process.env.VELATRA_ROLLBACK_APPLY === 'true';
const rows = JSON.parse(await readFile(process.env.VELATRA_MIGRATION_BACKUP, 'utf8'));
if (!Array.isArray(rows) || new Set(rows.map(row => row.clubId)).size !== rows.length ||
    rows.some(row => typeof row.clubId !== 'string' || !row.clubId || row.clubId.includes('/') ||
      !['solo', 'studio'].includes(row.nextAccountType) ||
      !row.previousAccountType || typeof row.previousAccountType.present !== 'boolean' ||
      (row.previousAccountType.present && !['solo', 'studio'].includes(row.previousAccountType.value)))) {
  throw Error('INVALID_BACKUP');
}
const db = createProductionClient('velatra-75daa', process.env.VELATRA_FIREBASE_CLI_AUTH_MODULE);
try {
  console.log('Project velatra-75daa; database (default); rollback apply:', apply);
  // Preflight all rows before any rollback mutation.
  for (const row of rows) {
    const doc = await db.collection('clubs').doc(row.clubId).get();
    if (!doc.exists || doc.get('accountType') !== row.nextAccountType) throw Error('ROLLBACK_CONFLICT');
  }
  for (const row of rows) {
    await db.runTransaction(async tx => {
      const ref = db.collection('clubs').doc(row.clubId);
      const doc = await tx.get(ref);
      if (!doc.exists || doc.get('accountType') !== row.nextAccountType) throw Error('ROLLBACK_CONFLICT');
      if (apply) tx.update(ref, { accountType: row.previousAccountType.present
        ? row.previousAccountType.value : FieldValue.delete() });
    }, apply ? { readOnly: false } : { readOnly: true });
    console.log(row.clubId, apply ? 'RESTORED' : 'WOULD_RESTORE');
  }
  if (apply) for (const row of rows) {
    const doc = await db.collection('clubs').doc(row.clubId).get();
    const data = doc.data();
    if (!data || (row.previousAccountType.present
      ? data.accountType !== row.previousAccountType.value : Object.hasOwn(data, 'accountType'))) {
      throw Error('ROLLBACK_VERIFICATION_FAILED');
    }
  }
} finally { await db.terminate(); }
JS
```

Conserver tous les backups si plusieurs applications partielles ont eu lieu. Un conflit lors du rollback peut laisser un rollback partiel ; relire et traiter uniquement les entrées restantes. Ne modifier ni plans ni profils, et ne lancer aucun déploiement pour restaurer le champ.

## Validation

- `npm run lint` : succès.
- `npm run build` : succès ; avertissement existant sur les chunks supérieurs à 500 kB.
- `npm run test:emulators` : **512/512 tests**, dont **20 tests de migration**, et **5/5 protections d'isolation**.
- Classification solo/studio, valeurs explicites, plan sans effet, suspension conservée, anomalies locales, sauvegarde avant écriture, cible erronée, audit périmé, changement concurrent du staff et deuxième application : couverts.
- QA après migration : **86 contrôles, 0 échec**, sur SOLO_OWNER, STUDIO_OWNER, STUDIO_MANAGER, STUDIO_COACH à **390×844 et 1440×900**. ExperienceHome, navigation, Pulse, Retain, absence de finance globale Coach et compositions Phone/Desktop différentes sont vérifiés dans Chromium avec fixtures isolées, sans données de production.
- Les recettes habituelles Phone, Tablet, Desktop et Large Desktop restent dans le workflow Mobile browser regression ; la nouvelle recette de migration y est ajoutée.
- `registerClub` exige toujours une sélection explicite valide et écrit `solo` ou `studio` ; les aliases de formulaire déjà supportés sont normalisés. Aucun changement de ce service.
- Application, Pulse, Retain, autorisations métier et Firestore Rules : **inchangés**. `accountType` reste protégé contre les écritures client par les règles existantes.
- **FIRESTORE RULES CHANGED: NO. DEPLOYMENT REQUIRED: NO.** Aucun déploiement Firebase effectué. La PR contient le script, sa politique, les tests, la recette QA et cette documentation ; elle reste à revoir et n'est pas fusionnée automatiquement. La PR Sales #35 reste indépendante.
