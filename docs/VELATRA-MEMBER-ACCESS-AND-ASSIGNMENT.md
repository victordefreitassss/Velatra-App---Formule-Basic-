# Création, référent et accès des adhérents

## Création

`POST /api/create-member` authentifie le demandeur et relit son profil et son club côté serveur. Le navigateur fournit les données du membre et, uniquement pour un propriétaire Studio, une intention facultative `coachUid`. Le serveur fixe le club, le rôle et l'UID du nouveau membre. Il crée le compte Firebase Auth avec un mot de passe aléatoire fort, non renvoyé et non stocké dans Firestore. Les anciens clients qui envoient encore un mot de passe restent acceptés pendant la transition.

La transaction Firestore crée le profil et, s'il existe une affectation, met à jour `assignedMemberIds` du coach. En cas d'échec avant la création du profil, le compte Auth créé est supprimé. Le `requestId` permet de reprendre la même création sans rattacher une autre identité ayant la même adresse. Un email déjà utilisé par un autre compte est refusé.

## Référent coaching

- **Solo** : le propriétaire désigné par `club.ownerId` est le référent implicite. Le profil membre ne reçoit aucun `assignedCoachUid` artificiel. Le formulaire n'affiche pas de sélecteur.
- **Studio, propriétaire** : peut sélectionner un coach réel du même club ou choisir « À attribuer plus tard ». Le serveur vérifie le rôle et le club du coach avant et pendant la transaction.
- **Studio, coach** : tout adhérent créé par ce coach lui est affecté par le serveur. Le coach ne peut pas désigner un collègue.
- **Legacy** : un coach créateur est affecté comme auparavant ; le propriétaire ne reçoit aucune nouvelle affectation implicite.

`assignedCoachUid` reste une affectation explicite à un profil `coach`. `GET /api/member/assigned-coach` résout le contact via le propriétaire canonique pour Solo, ou via l'affectation explicite validée pour Studio et Legacy. Il renvoie le rôle réel `owner` ou `coach`, ou `null` s'il n'y a aucun référent. Client 360 utilise les mêmes critères pour afficher le référent. L'endpoint d'affectation existant permet au propriétaire Studio de changer le coach après création et synchronise les index et enregistrements dérivés.

## Accès et messagerie

Après création, l'interface utilise `sendPasswordResetEmail` pour que l'adhérent définisse son propre mot de passe. L'envoi peut échouer sans supprimer le compte ; Client 360 affiche alors « email d’accès non envoyé » et permet de le renvoyer. Renvoyer l'email ne recrée pas le membre. Le lien `/login` est présenté uniquement comme lien de connexion, jamais comme invitation à usage unique. Les imports CSV appliquent le même principe et distinguent créations, emails envoyés et échecs.

Le membre Solo voit son propriétaire comme contact dans Messages. Ses messages n'ont pas de faux `assignedCoachUid`. Les règles Firestore vérifient le propriétaire canonique, le même club et les identifiants numériques des interlocuteurs. Pour Studio, la conversation privée avec le coach n'est disponible qu'après affectation ; les règles exigent le coach explicitement affecté. Les conversations interclubs, avec un coach non affecté ou avec un utilisateur non connecté sont refusées. Les règles Storage ne changent pas.

## Limites

Firebase Auth et Firestore ne partagent pas de transaction ; la création applique une compensation lorsque Firestore échoue. La livraison réelle d'un email dépend de la configuration Firebase du projet et doit être vérifiée après déploiement. Les comptes Legacy ne sont pas migrés automatiquement. Cette passe n'ajoute ni invitation à usage unique, ni affectation multiple, ni propriétaire Studio assignable comme coach.
