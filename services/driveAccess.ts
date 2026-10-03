import { auth } from '../firebase';

async function driveRequest(path: string, options: RequestInit = {}) {
  if (!auth.currentUser) throw new Error('Authentification requise.');
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(path, { ...options, cache: 'no-store', headers: {
    ...options.headers, Authorization: `Bearer ${token}`,
  } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Accès au fichier refusé.');
  }
  return response;
}
export async function finalizeDriveFile(fileId: string, input: { clubId: string; name: string; folderId: string | null; sharedWith: number[] }) {
  return (await driveRequest(`/api/drive/files/${encodeURIComponent(fileId)}/finalize`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })).json();
}
/** Every click reauthorizes. A Blob URL represents bytes already downloaded, never access authority. */
export async function openDriveFile(file: { id: string; name: string }, download = false) {
  let preview = download ? null : window.open('about:blank', '_blank');
  if (preview) preview.opener = null;
  let url: string | undefined;
  try {
    const path = `/api/drive/files/${encodeURIComponent(file.id)}/content${download ? '?download=1' : ''}`;
    let response = await driveRequest(path);
    const type = response.headers.get('Content-Type') || 'application/octet-stream';
    if (preview && response.headers.get('Content-Disposition')?.startsWith('attachment')) { preview.close(); preview = null; }
    const etag = response.headers.get('ETag');
    const chunks: Blob[] = [];
    for (;;) {
      chunks.push(await response.blob());
      if (response.status !== 206) break;
      const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('Content-Range') || '');
      if (!range || !etag || Number(range[2]) < Number(range[1])) throw new Error('Réponse Drive invalide.');
      const next = Number(range[2]) + 1;
      if (next >= Number(range[3])) break;
      response = await driveRequest(path, { headers: { Range: `bytes=${next}-`, 'If-Match': etag } });
    }
    url = URL.createObjectURL(new Blob(chunks, { type }));
    if (preview) preview.location.replace(url);
    else { const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); }
    // Allow PDF/video viewers to consume the data, then dispose the local downloaded copy.
    window.setTimeout(() => URL.revokeObjectURL(url!), 5 * 60 * 1000);
  } catch (e) { preview?.close(); if (url) URL.revokeObjectURL(url); throw e; }
}
