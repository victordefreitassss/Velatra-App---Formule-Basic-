import { apiFetch } from '../firebase';
export interface PurgeProgress {
  clubId: string; state: 'pending' | 'running' | 'completed' | 'failed'; phase: string;
  processed: number; total: number; remaining: number;
  error?: { message?: string; phase?: string; resource?: string | null } | null;
}
const coherentCompletion = (result: any) => result.remaining === 0 && Number.isInteger(result.processed) && result.processed >= 0 && Number.isInteger(result.total) && result.total >= 0 && result.processed === result.total && result.phase === 'completed';
export async function runOrganizationPurge(clubId: string, progress: (value: PurgeProgress) => void) {
  for (let slice = 0; slice < 600; slice++) {
    const response = await apiFetch(`/api/admin/clubs/${encodeURIComponent(clubId)}/purge`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmClubId: clubId }),
    });
    const result = await response.json();
    if (result.clubId !== clubId || !['pending','running','failed','completed'].includes(result.state))
      throw new Error(result.error || 'Réponse de purge invalide. Le club ne sera pas annoncé comme supprimé.');
    if (result.state === 'completed' && (!response.ok || !coherentCompletion(result))) throw new Error('Purge non confirmée : résultat incohérent.');
    progress(result);
    if (!response.ok || result.state === 'failed') {
      const cause = typeof result.error?.message === 'string' ? result.error.message : 'Une étape obligatoire a échoué.';
      throw new Error(`${cause}${result.error?.resource ? ` Ressource : ${result.error.resource}.` : ''} Club conservé et suspendu. Reprenez la purge après vérification.`);
    }
    if (result.state === 'completed') {
      if (!coherentCompletion(result)) throw new Error('Purge non confirmée : résultat incohérent.');
      return result as PurgeProgress;
    }
    // Another request/process may hold the lease; avoid an aggressive polling loop.
    await new Promise(resolve => setTimeout(resolve,1000));
  }
  throw new Error('Purge toujours en cours. Consultez le journal et reprenez ; aucune réussite n’est confirmée.');
}

export async function readOrganizationPurge(clubId: string): Promise<PurgeProgress | null> {
  const response = await apiFetch(`/api/admin/clubs/${encodeURIComponent(clubId)}/purge`);
  if (response.status === 404) return null;
  const result = await response.json();
  if (!response.ok || result.clubId !== clubId || !['pending','running','failed','completed'].includes(result.state) || result.state === 'completed' && !coherentCompletion(result)) throw new Error('Journal de purge indisponible.');
  return result;
}
