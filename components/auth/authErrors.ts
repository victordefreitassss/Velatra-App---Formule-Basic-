/** Public messages only: never surface Firebase codes, credentials or raw server errors. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request': return '';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Adresse e-mail ou mot de passe incorrect.';
    case 'auth/user-disabled': return "Ce compte n'est actuellement pas accessible.";
    case 'auth/invalid-email': return 'Vérifiez le format de votre adresse e-mail.';
    case 'auth/network-request-failed': return 'Impossible de se connecter pour le moment. Vérifiez votre connexion et réessayez.';
    case 'auth/account-exists-with-different-credential':
    case 'auth/credential-already-in-use':
    case 'auth/email-already-in-use': return "Un compte Velatra existe déjà avec cette adresse. Connectez-vous d'abord avec votre méthode habituelle.";
    case 'auth/weak-password': return 'Choisissez un mot de passe de 6 caractères minimum.';
    case 'auth/popup-blocked': return 'Autorisez les fenêtres contextuelles pour continuer avec Google, puis réessayez.';
    case 'auth/too-many-requests': return 'Trop de tentatives. Patientez quelques instants avant de réessayer.';
    case 'auth/unauthorized-domain':
    case 'auth/operation-not-allowed': return 'Cette méthode de connexion est momentanément indisponible. Vous pouvez utiliser votre adresse e-mail.';
    default: return 'Impossible de continuer pour le moment. Réessayez dans quelques instants.';
  }
}

export const resetSuccessMessage = 'Si cette adresse est associée à un compte, un lien de réinitialisation vient de vous être envoyé.';

export function registrationErrorMessage(status: number): string {
  if (status === 403) return "Le code d’invitation bêta est invalide. Vérifiez le code qui vous a été transmis.";
  if (status === 409) return 'Un espace existe déjà pour ce compte. Revenez à la connexion pour le retrouver.';
  if (status === 400) return 'Vérifiez les informations de votre espace avant de continuer.';
  if (status === 401) return 'Votre session a expiré. Reconnectez-vous pour continuer.';
  return "La création de l’espace est momentanément indisponible. Vos informations sont conservées dans ce formulaire ; réessayez.";
}
