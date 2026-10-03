import { createHash, randomUUID } from 'node:crypto';
import { type Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import type { Bucket } from '@google-cloud/storage';
import type { Express } from 'express';
import { MemberCreationError } from './createMember.ts';
import { notificationHash } from './notifications.ts';

export type PurgeState = 'pending' | 'running' | 'failed' | 'completed';
export interface PurgeServices { databases: Firestore[]; auth: Auth; bucket: () => Bucket; batchSize?: number; }
type Identity = { uid: string; email?: string; email_verified?: boolean };
type Row = { db: number; path: string; data: Record<string, any>; stamp: string };
type Item = { kind: 'document' | 'storage' | 'auth'; path: string; db?: number; stamp?: string; generation?: string; metageneration?: string; uid?: string; unlink?: boolean; claimsHash?: string; inherited?: boolean; uidScoped?: boolean; numericIds?: string[]; authBirth?: string; };
const scalar = ['clubId', 'organizationId', 'tenantId'], lists = ['clubIds', 'organizationIds', 'tenantIds'];
const excluded = new Set(['organizationPurgeJobs', 'admin_audit_logs', 'system_announcements']);
const validId = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(v);
const hash = (v: any) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail = (status: number, message: string): never => { throw new MemberCreationError(status, message); };
const stamp = (s: any) => `${s.updateTime.seconds}:${s.updateTime.nanoseconds}`;
const incarnation = (s: any) => `${s.createTime.seconds}:${s.createTime.nanoseconds}`;
const tenantValue = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string' && validId(value)) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  return fail(409, 'Identifiant de tenant ambigu : revue manuelle requise.');
};
const protectedAuth = (claims: any) => claims.superadmin === true || claims.isSuperAdmin === true || claims.admin === true || claims.role === 'superadmin';
const tenants = (data: any): string[] => {
  const result = scalar.flatMap(k => { const value = tenantValue(data?.[k]); return value ? [value] : []; });
  for (const k of lists) if (data?.[k] !== undefined) {
    if (!Array.isArray(data[k]) || data[k].some((v: any) => typeof v !== 'string')) fail(409, 'Affiliation ambiguë : revue manuelle requise.');
    result.push(...data[k]);
  }
  if (data?.memberships !== undefined) {
    if (!Array.isArray(data.memberships)) fail(409, 'Affiliation ambiguë : revue manuelle requise.');
    for (const m of data.memberships) {
      if (typeof m === 'string') result.push(m);
      else if (m && typeof m === 'object' && scalar.some(k => typeof m[k] === 'string')) result.push(...scalar.flatMap(k => typeof m[k] === 'string' ? [m[k]] : []));
      else fail(409, 'Affiliation ambiguë : revue manuelle requise.');
    }
  }
  return [...new Set(result)];
};
function unlinkTenant(data: any, clubId: string) {
  const next = { ...data };
  for (const k of scalar) if (tenantValue(next[k]) === clubId) delete next[k];
  for (const k of lists) if (Array.isArray(next[k])) next[k] = next[k].filter((v: string) => v !== clubId);
  if (Array.isArray(next.memberships)) next.memberships = next.memberships.filter((m: any) => typeof m === 'string' ? m !== clubId : !scalar.some(k => m[k] === clubId));
  return next;
}
const uidLinks = (row: Row) => [...new Set([
  ...(row.path.split('/')[0] === 'users' && row.path.split('/').length === 2 ? [row.path.split('/')[1]] : []),
  ...(row.path.startsWith('clubs/') && typeof row.data.ownerId === 'string' ? [row.data.ownerId] : []),
  ...['uid','firebaseUid','memberUid','userUid','ownerUid','recipientUid','assignedCoachUid','coachUid','actorUid','createdByUid','convertedUid'].flatMap(k => typeof row.data[k] === 'string' ? [row.data[k]] : []),
])];

/** Bounded read inventory, including missing parent documents. Never an unfiltered deletion. */
async function scanDocuments(databases: Firestore[]): Promise<Row[]> {
  const rows: Row[] = []; let visited = 0; const deadline = Date.now() + 25000;
  const projection=[...scalar,...lists,'memberships','role','id','ownerId','path','uid','firebaseUid','memberUid','userUid','ownerUid','recipientUid','assignedCoachUid','coachUid','actorUid','createdByUid','convertedUid','memberId','userId','adherentId','relatedMemberId','from','to'];
  async function walk(db: number, col: any, depth: number) {
    if (Date.now() > deadline || ++visited > 1000 || depth > 16) fail(409, 'Inventaire trop volumineux : purge conservée, traitement opérateur requis.');
    const refs = await col.listDocuments();
    if (rows.length + refs.length > 10000) fail(409, 'Inventaire trop volumineux : purge conservée, traitement opérateur requis.');
    const snapshot=await col.select(...projection).limit(10001).get();
    if(rows.length+snapshot.size>10000)fail(409,'Inventaire trop volumineux : traitement opérateur requis.');
    for(const snap of snapshot.docs) rows.push({db,path:snap.ref.path,data:snap.data(),stamp:stamp(snap)});
    for (const ref of refs) for (const child of await ref.listCollections()) await walk(db, child, depth + 1);
  }
  for (let i = 0; i < databases.length; i++) for (const col of await databases[i].listCollections()) if (!excluded.has(col.id)) await walk(i, col, 0);
  return rows;
}
async function authRecord(auth: Auth, uid: string) {
  try { return await auth.getUser(uid); } catch (e: any) { if (e.code === 'auth/user-not-found') return null; throw e; }
}
function foreignUid(rows: Row[], uid: string, clubId: string) {
  return rows.some(row => uidLinks(row).includes(uid) && (row.data.role === 'superadmin' || tenants(row.data).some(t => t !== clubId)));
}
interface InventorySeeds { uids?:string[]; legacyNumbers?:string[]; prospectIds?:string[]; exclusiveUids?:string[]; authBirths?:Record<string,string>; }
async function inventory(s: PurgeServices, clubId: string, actorUid: string, seeds: InventorySeeds = {}) {
  const {uids:savedUids=[],legacyNumbers:savedNumbers=[],prospectIds:savedProspects=[],exclusiveUids:savedExclusive=[],authBirths:savedBirths={}}=seeds;
  const authBirths={...savedBirths};
  const rows = await scanDocuments(s.databases), candidates = new Set(savedUids);
  for (const row of rows) if (row.path.startsWith('users/') && row.path.split('/').length === 2 && tenants(row.data).includes(clubId)) {
    const uid = row.path.split('/')[1];
    if (!validId(uid) || row.data.firebaseUid && row.data.firebaseUid !== uid) fail(409, 'Identité utilisateur ambiguë : revue manuelle requise.');
    candidates.add(uid);
  }
  for (const row of rows) if (row.path === `clubs/${clubId}` && typeof row.data.ownerId === 'string') candidates.add(row.data.ownerId);
  let token: string | undefined, count = 0;
  do {
    const page = await s.auth.listUsers(1000, token); count += page.users.length;
    if (count > 10000) fail(409, 'Inventaire Auth trop volumineux : traitement opérateur requis.');
    for (const u of page.users) if (tenants(u.customClaims || {}).includes(clubId)) candidates.add(u.uid);
    token = page.pageToken;
  } while (token);
  if (candidates.size > 1000) fail(409, 'Trop de comptes pour cette purge : traitement opérateur requis.');
  const exclusive = new Set<string>(), knownAuth = new Set<string>(), items: Item[] = [];
  for (const uid of candidates) {
    if (!validId(uid)) fail(409, 'Identité invalide : revue manuelle requise.');
    const u = await authRecord(s.auth, uid), claims = u?.customClaims || {};
    if(u && savedBirths[uid] && savedBirths[uid]!==u.metadata.creationTime) fail(409,'Identité Auth remplacée : compte conservé, revue manuelle requise.');
    if(!authBirths[uid])authBirths[uid]=u?.metadata.creationTime || 'absent';
    const shared = uid === actorUid || protectedAuth(claims) || foreignUid(rows, uid, clubId) || tenants(claims).some(t => t !== clubId);
    if (u) knownAuth.add(uid);
    const profileProof = rows.some(row => row.path === `users/${uid}` && tenants(row.data).includes(clubId));
    if (!shared && (u || profileProof || savedExclusive.includes(uid))) exclusive.add(uid);
    if (u && (!shared || tenants(claims).includes(clubId))) items.push({ kind: 'auth', path: uid, uid, unlink: shared, claimsHash: hash(claims), authBirth:u.metadata.creationTime });
  }
  const boxes = new Set([...candidates].map(uid => notificationHash(clubId, uid)));
  const legacyNumbers = [...new Set([...savedNumbers, ...rows.filter(r => /^users\/[^/]+$/.test(r.path) && exclusive.has(r.path.split('/')[1]) && Number.isSafeInteger(r.data.id)).map(r => String(r.data.id))])];
  const numericLinks = (data: any) => ['memberId','userId','adherentId','relatedMemberId','from','to'].flatMap(k => (typeof data[k] === 'number' || typeof data[k] === 'string') && legacyNumbers.includes(String(data[k])) ? [String(data[k])] : []);
  const foreignNumbers = new Set(rows.filter(r => /^users\/[^/]+$/.test(r.path) && tenants(r.data).some(t => t !== clubId)).map(r => String(r.data.id)));
  const prospectIds = [...new Set([...savedProspects, ...rows.filter(r => r.path.startsWith('prospects/') && r.path.split('/').length === 2 && r.data.clubId === clubId).map(r => r.path.split('/')[1])])];
  const isSpecial = (path: string) => {
    const [root, key] = path.split('/');
    if (root === 'stripeSecrets' && key === clubId) return true;
    if (['notificationInboxes','pushDevices','notificationPreferences'].includes(root) && boxes.has(key)) return true;
    if (['avatars','users','contracts','progressPhotos'].includes(root) && exclusive.has(key) && path.split('/').length > 2) return true;
    if (root === 'bookingLocks') {
      const matches=[...candidates,...prospectIds].some(uid=>['coach','member','prospect'].some(role=>key.startsWith(`${clubId}_${role}_${uid}_`) && /^\d{4}-\d{2}-\d{2}$/.test(key.slice(`${clubId}_${role}_${uid}_`.length))));
      if(matches && rows.some(row=>[...tenants(row.data),...(/^clubs\/[^/]+$/.test(row.path)?[row.path.split('/')[1]]:[])].some(id=>id!==clubId && ['coach','member','prospect'].some(role=>key.startsWith(`${id}_${role}_`)))))fail(409,`Verrou de planning ambigu : ${path}`);
      return matches;
    }
    return false;
  };
  const selected = new Map<string, Item>();
  for (const row of [...rows].sort((a,b) => a.path.split('/').length - b.path.split('/').length)) {
    const root = row.path.split('/')[0];
    if (row.path === `clubs/${clubId}` || root === 'clubs' && !row.path.startsWith(`clubs/${clubId}/`)) continue;
    const refs = tenants(row.data), target = refs.includes(clubId);
    const isProfile = root === 'users' && row.path.split('/').length === 2;
    const sharedProfile = isProfile && target && (refs.some(t => t !== clubId) || !exclusive.has(row.path.split('/')[1]));
    const inherited = row.path.startsWith(`clubs/${clubId}/`) || [...selected.entries()].some(([key, value]) => key.startsWith(row.db + ':') && !value.unlink && row.path.startsWith(value.path + '/'));
    const special = isSpecial(row.path) || root === 'pushTokenOwners' && typeof row.data.path === 'string' && isSpecial(row.data.path);
    const uidOwner = uidLinks(row).find(uid => exclusive.has(uid));
    const numeric = numericLinks(row.data);
    const personal = !refs.length && (uidOwner || numeric.length);
    if (personal && !special && !inherited && (uidLinks(row).some(uid=>rows.some(profile=>profile.path===`users/${uid}` && tenants(profile.data).some(t=>t!==clubId))) || ['memberId','userId','adherentId','relatedMemberId','from','to'].some(k=>row.data[k]!==undefined && foreignNumbers.has(String(row.data[k])))))fail(409,`Référence personnelle multi-tenant ambiguë : ${row.path}`);
    if (personal && numeric.some(id => foreignNumbers.has(id))) fail(409, `Référence numérique ambiguë : ${row.path}`);
    if (!target && !inherited && !special && !personal) continue;
    if (!sharedProfile && refs.some(t => t !== clubId)) fail(409, `Affiliation conflictuelle : ${row.path}`);
    selected.set(`${row.db}:${row.path}`, { kind: 'document', db: row.db, path: row.path, stamp: row.stamp, ...(sharedProfile ? { unlink: true } : {}), ...(inherited ? { inherited: true } : {}), ...(personal && uidOwner ? { uid: uidOwner, uidScoped: true } : {}), ...(personal && numeric.length ? { numericIds: numeric } : {}) });
  }
  items.push(...selected.values());
  const bucket = s.bucket(), [files] = await bucket.getFiles({ versions: true });
  if (files.length > 10000) fail(409, 'Inventaire Storage trop volumineux : traitement opérateur requis.');
  for (const f of files) {
    const [root, key] = f.name.split('/');
    const tenantPath = ['clubs','drive','driveUploads','videos'].includes(root) && key === clubId;
    const uidPath = ['avatars','users','contracts','progressPhotos'].includes(root) && exclusive.has(key);
    if (!tenantPath && !uidPath) {
      if (['avatars','users','contracts','progressPhotos'].includes(root) && candidates.has(key) && !knownAuth.has(key) && !rows.some(row => row.path === `users/${key}`) && !savedExclusive.includes(key)) fail(409, `Propriétaire Storage non identifiable : ${f.name}`);
      if (tenants(f.metadata.metadata || {}).includes(clubId)) fail(409, `Préfixe Storage non reconnu : ${f.name}`);
      continue;
    }
    const [m] = await f.getMetadata({ projection: 'full' });
    if (tenants(m.metadata || {}).some(t => t !== clubId)) fail(409, `Objet Storage d'un autre tenant : ${f.name}`);
    items.push({ kind: 'storage', path: f.name, generation: String(m.generation), metageneration: String(m.metageneration), ...(uidPath ? { uid: key, uidScoped: true } : {}) });
  }
  // Children precede parents; business -> Storage -> profiles -> Auth.
  const rank = (i: Item) => i.kind === 'auth' ? 3 : i.kind === 'storage' ? 1 : /^users\/[^/]+$/.test(i.path) ? 2 : 0;
  items.sort((a,b) => rank(a)-rank(b) || b.path.split('/').length-a.path.split('/').length || `${a.db}:${a.path}`.localeCompare(`${b.db}:${b.path}`));
  if (items.length > 5000) fail(409, 'Trop de ressources : traitement opérateur requis.');
  return { items, authBirths, uids: [...candidates], exclusiveUids: [...exclusive], legacyNumbers, prospectIds, sharedUids: [...candidates].filter(uid => !exclusive.has(uid) && knownAuth.has(uid)) };
}

async function requireAdmin(db: Firestore, identity: Identity) {
  if (!validId(identity?.uid) || identity.email !== 'victor.defreitas.pro@gmail.com' || identity.email_verified !== true) fail(403, 'Administration plateforme vérifiée requise.');
  const profile = (await db.doc(`users/${identity.uid}`).get()).data();
  if (profile?.role !== 'superadmin' || profile.isSuspended === true) fail(403, 'Administration plateforme vérifiée requise.');
}
export async function getOrganizationPurge(s: PurgeServices, identity: Identity, clubId: string) {
  await requireAdmin(s.databases[0], identity); if (!validId(clubId)) fail(400, 'Organisation invalide.');
  const job = (await s.databases[0].doc(`organizationPurgeJobs/${clubId}`).get()).data();
  if (!job) fail(404, 'Aucune purge enregistrée.');
  return publicJob(job!);
}
function publicJob(job: any) {
  return { clubId: job.clubId, state: job.state as PurgeState, phase: job.phase, processed: job.cursor || 0, total: job.total || 0,
    attempts: job.attempts, startedAt: job.startedAt, updatedAt: job.updatedAt, error: job.error || null,
    sharedAccountsPreserved: job.sharedUids?.length || 0, remaining: Math.max(0, (job.total || 0)-(job.cursor || 0)) };
}

/** Each authenticated call runs a bounded slice. The persisted manifest survives
 * process loss and partial deletes. No background/serverless fire-and-forget task. */
export async function advanceOrganizationPurge(s: PurgeServices, identity: Identity, clubId: string, input: unknown) {
  await requireAdmin(s.databases[0], identity);
  if (!validId(clubId) || !input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).join() !== 'confirmClubId' || (input as any).confirmClubId !== clubId) fail(400, 'Confirmez explicitement l’ID exact du club.');
  const db = s.databases[0], ref = db.doc(`organizationPurgeJobs/${clubId}`), clubRef = db.doc(`clubs/${clubId}`), owner = randomUUID();
  const claimed = await db.runTransaction(async tx => {
    const [j,c] = await tx.getAll(ref, clubRef), old = j.data();
    if (old?.state === 'completed') {
      if (c.exists) fail(409, 'ID réutilisé après purge : revue manuelle requise.');
      return { job: old, execute: false };
    }
    if (!old && !c.exists) fail(404, 'Organisation introuvable.');
    if (old && (!c.exists || old.clubCreateTime !== incarnation(c) || old.ownerFingerprint !== hash(c.data()?.ownerId ?? null))) fail(409, 'Organisation disparue ou recréée pendant la purge : revue manuelle requise.');
    if (old?.leaseUntil > Date.now()) return { job: old, execute: false };
    const job: any = { ...old, clubId, actorUid: old?.actorUid || identity.uid, lastActorUid: identity.uid,
      ownerFingerprint: old?.ownerFingerprint || hash(c.data()?.ownerId ?? null),
      clubCreateTime: old?.clubCreateTime || incarnation(c), databaseIncarnations: old?.databaseIncarnations || { '0': incarnation(c) },
      state: old ? 'running' : 'pending', phase: old?.phase || 'inventory', cursor: old?.cursor || 0,
      attempts: (old?.attempts || 0)+1, startedAt: old?.startedAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
      leaseOwner: owner, leaseUntil: old ? Date.now()+120000 : 0, error: null };
    if (c.exists) tx.update(clubRef, { isActive: false, purgeState: job.state, purgeJobId: clubId });
    tx.set(ref, job);
    tx.create(ref.collection('events').doc(), { actorUid: identity.uid, clubId, at: job.updatedAt, action: old ? 'RESUMED' : 'REQUESTED', state: job.state });
    return { job, execute: !!old };
  });
  if (!claimed.execute) return publicJob(claimed.job);
  let job = claimed.job, current: Item | undefined;
  const fenced = async (write: (tx: any) => void) => db.runTransaction(async tx => {
    const fresh = (await tx.get(ref)).data();
    if (fresh?.leaseOwner !== owner || fresh.leaseUntil < Date.now()) fail(409, 'Une autre reprise détient la purge.');
    write(tx);
  });
  const checkpoint = async (updates: any) => {
    await fenced(tx => tx.update(ref, { ...updates, updatedAt: new Date().toISOString() })); job = { ...job, ...updates };
  };
  try {
    // The target is suspended in every configured database before any deletion.
    for (let i=0;i<s.databases.length;i++) {
      const target = s.databases[i].doc(`clubs/${clubId}`), snapshot = await target.get();
      const known=job.databaseIncarnations[String(i)];
      if (i>0 && snapshot.exists && hash(snapshot.data()?.ownerId ?? null)!==job.ownerFingerprint) fail(409,'Identité du club secondaire différente : revue manuelle requise.');
      if (known && snapshot.exists && known!==incarnation(snapshot)) fail(409,'Organisation secondaire recréée : revue manuelle requise.');
      if (known && known!=='absent' && !snapshot.exists && !['verifying','finalizing'].includes(job.phase)) fail(409,'Organisation secondaire disparue pendant la purge.');
      if (!known) await checkpoint({ databaseIncarnations:{...job.databaseIncarnations,[String(i)]:snapshot.exists?incarnation(snapshot):'absent'} });
      if (snapshot.exists) {
        await fenced(() => {});
        await s.databases[i].runTransaction(async tx => {
          const fresh = await tx.get(target);
          if (!fresh.exists || incarnation(fresh) !== incarnation(snapshot) || hash(fresh.data()?.ownerId ?? null) !== job.ownerFingerprint) fail(409,'Organisation modifiée avant verrouillage.');
          tx.update(target,{isActive:false,purgeState:'running',purgeJobId:clubId});
        });
      }
    }
    if (job.phase === 'inventory') {
      const plan = await inventory(s, clubId, identity.uid);
      for (let start = 0; start < plan.items.length; start += 200) await fenced(tx => {
        plan.items.slice(start,start+200).forEach((item,i) => tx.set(ref.collection('items').doc(String(start+i).padStart(6,'0')), { ...item, outcome: 'pending' }));
      });
      await checkpoint({ phase: 'deleting', total: plan.items.length, cursor: 0, uids: plan.uids, authBirths: plan.authBirths, exclusiveUids: plan.exclusiveUids, legacyNumbers: plan.legacyNumbers, prospectIds: plan.prospectIds, sharedUids: plan.sharedUids });
      await fenced(tx => tx.create(ref.collection('events').doc(), { actorUid: identity.uid, clubId, at: new Date().toISOString(), action: 'INVENTORIED', resources: plan.items.length, sharedAccountsPreserved: plan.sharedUids.length }));
      await checkpoint({leaseUntil:0});
      return publicJob(job);
    }
    const deadline = Date.now()+8000;
    let processed = 0;
    while (job.phase === 'deleting' && job.cursor < job.total && processed++ < (s.batchSize || 10) && Date.now() < deadline) {
      const itemRef = ref.collection('items').doc(String(job.cursor).padStart(6,'0')), snapshot = await itemRef.get();
      if (!snapshot.exists) fail(409, 'Manifeste incomplet : purge arrêtée.');
      const item = snapshot.data() as Item & { outcome: string }; current = item;
      await fenced(() => {});
      if (item.outcome === 'pending') {
        let outcome = 'deleted';
        if (item.kind === 'document') {
          if (item.uidScoped || item.numericIds?.length) {
            const rows = await scanDocuments(s.databases);
            if (item.uidScoped && foreignUid(rows,item.uid!,clubId) || item.numericIds?.some(id => rows.some(row => /^users\/[^/]+$/.test(row.path) && String(row.data.id) === id && tenants(row.data).some(t => t !== clubId)))) fail(409, 'Identité devenue partagée : donnée personnelle conservée.');
          }
          const target = s.databases[item.db!].doc(item.path);
          await s.databases[item.db!].runTransaction(async tx => {
            const snap = await tx.get(target);
            if (!snap.exists) { outcome = 'already_absent'; return; }
            if (item.unlink && !tenants(snap.data()).includes(clubId)) { outcome = 'already_unlinked'; return; }
            if (stamp(snap) !== item.stamp) fail(409, `Ressource modifiée depuis l’inventaire : ${item.path}`);
            if (item.unlink) {
              const data = snap.data()!, next = unlinkTenant(data, clubId);
              if (tenants(next).includes(clubId)) fail(409, 'Relation utilisateur ambiguë.');
              tx.set(target,next); outcome = 'unlinked';
            } else tx.delete(target);
          });
        } else if (item.kind === 'storage') {
          if (item.uidScoped && foreignUid(await scanDocuments(s.databases), item.uid!, clubId)) fail(409, 'Compte devenu partagé : objet personnel conservé.');
          const file = s.bucket().file(item.path, { generation: item.generation });
          try {
            const [metadata] = await file.getMetadata({ projection: 'full' });
            if (String(metadata.metageneration) !== item.metageneration || tenants(metadata.metadata || {}).some(t => t !== clubId)) fail(409, `Objet Storage modifié : ${item.path}`);
            await fenced(() => {});
            await file.request({ method: 'DELETE', uri: '', qs: { generation: item.generation, ifGenerationMatch: item.generation, ifMetagenerationMatch: item.metageneration } });
          } catch (e: any) { if (e.code === 404) outcome = 'already_absent'; else throw e; }
        } else {
          const user = await authRecord(s.auth,item.uid!);
          if (!user) outcome = 'already_absent';
          else {
            if(user.metadata.creationTime!==item.authBirth)fail(409,'Compte Auth remplacé depuis l’inventaire : compte conservé.');
            const claims = user.customClaims || {}, liveRows = await scanDocuments(s.databases);
            if (item.unlink && !tenants(claims).includes(clubId)) outcome = 'already_unlinked';
            else if (hash(claims) !== item.claimsHash) fail(409, 'Affiliation Auth modifiée : compte conservé.');
            else if (item.unlink) { await fenced(() => {}); await s.auth.setCustomUserClaims(item.uid!,unlinkTenant(claims,clubId)); outcome = 'unlinked'; }
            else {
              if (item.uid === identity.uid || protectedAuth(claims) || foreignUid(liveRows,item.uid!,clubId) || tenants(claims).some(t => t !== clubId)) fail(409, 'Compte Auth partagé ou protégé : compte conservé.');
              await fenced(() => {});
              try { await s.auth.deleteUser(item.uid!); } catch (e: any) { if (e.code !== 'auth/user-not-found') throw e; }
            }
          }
        }
        // If a process dies between delete and receipt, missing resources are safe on retry.
        await fenced(tx => tx.update(itemRef, { outcome, at: new Date().toISOString(), actorUid: identity.uid }));
      }
      await checkpoint({ cursor: job.cursor+1 });
    }
    current = undefined;
    if (job.phase==='deleting' && job.cursor === job.total) { await checkpoint({ phase:'verifying',leaseUntil:0 }); return publicJob(job); }
    if (job.phase === 'verifying') {
      const remaining = await inventory(s,clubId,identity.uid,job);
      if (remaining.items.length) {
        if (job.total + remaining.items.length > 5000) fail(409, 'Ressources supplémentaires trop nombreuses : club conservé.');
        for (let start=0;start<remaining.items.length;start+=200) await fenced(tx => remaining.items.slice(start,start+200).forEach((item,i)=>tx.create(ref.collection('items').doc(String(job.total+start+i).padStart(6,'0')),{...item,outcome:'pending'})));
        await fenced(tx=>tx.create(ref.collection('events').doc(),{actorUid:identity.uid,clubId,at:new Date().toISOString(),action:'ADDITIONAL_RESOURCES',resources:remaining.items.length}));
        await checkpoint({ phase:'deleting', total:job.total+remaining.items.length, uids:remaining.uids, authBirths:remaining.authBirths, exclusiveUids:remaining.exclusiveUids, legacyNumbers:remaining.legacyNumbers, prospectIds:remaining.prospectIds, sharedUids:remaining.sharedUids, leaseUntil:0 });
        return publicJob(job);
      }
      await checkpoint({ phase: 'finalizing', verifiedAt: new Date().toISOString(),leaseUntil:0 });
      return publicJob(job);
    }
    if (job.phase === 'finalizing') {
      // Repeat verification after interruptions; never trust an old successful scan.
      const remaining = await inventory(s,clubId,identity.uid,job);
      if (remaining.items.length) fail(409, 'De nouvelles ressources existent : le club est conservé.');
      for (let i = s.databases.length-1; i > 0; i--) {
        current={kind:'document',db:i,path:`clubs/${clubId}`}; const target=s.databases[i].doc(`clubs/${clubId}`);
        await s.databases[i].runTransaction(async tx=>{const c=await tx.get(target);if(!c.exists)return;if(incarnation(c)!==job.databaseIncarnations[String(i)] || c.data()?.purgeJobId!==clubId || hash(c.data()?.ownerId ?? null)!==job.ownerFingerprint)fail(409,'Organisation secondaire modifiée avant suppression.');tx.delete(target);});
      }
      current={kind:'document',db:0,path:`clubs/${clubId}`};
      await db.runTransaction(async tx => {
        const [j,c] = await tx.getAll(ref,clubRef);
        if (j.data()?.leaseOwner !== owner || j.data()?.leaseUntil < Date.now() || j.data()?.cursor !== j.data()?.total || j.data()?.phase !== 'finalizing') fail(409, 'Progression de purge invalide.');
        if (!c.exists || incarnation(c)!==job.clubCreateTime || hash(c.data()?.ownerId ?? null)!==job.ownerFingerprint) fail(409, 'Organisation principale disparue ou recréée.');
        if (c.exists && (c.data()?.isActive !== false || c.data()?.purgeJobId !== clubId)) fail(409, 'Verrou de purge invalide.');
        tx.delete(clubRef);
        const completedAt = new Date().toISOString();
        tx.update(ref, { state: 'completed', phase: 'completed', leaseUntil: 0, updatedAt: completedAt, completedAt, error: null });
        tx.create(ref.collection('events').doc(), { actorUid: identity.uid, clubId, at: completedAt, action: 'COMPLETED', verified: true });
        tx.create(db.collection('admin_audit_logs').doc(), { actorUid: identity.uid, actorEmail: identity.email, clubId, actionType: 'CLUB_PURGE_COMPLETED', details: `Purge vérifiée : ${clubId}`, timestamp: Date.now() });
      });
      return publicJob({ ...job, state: 'completed', phase: 'completed' });
    }
    await checkpoint({ leaseUntil: 0 });
    return publicJob(job);
  } catch (e: any) {
    const error = { phase: job.phase, resource: current?.path || null, code: String(e.code || e.status || 'PURGE_STEP_FAILED').slice(0,80), message: e instanceof MemberCreationError ? e.message : 'Étape de purge échouée. Le club reste suspendu ; vous pouvez reprendre.', at: new Date().toISOString() };
    // A journal failure itself returns HTTP failure, never a fabricated success.
    await fenced(tx => {
      tx.update(ref, { state: 'failed', phase: job.phase === 'finalizing' ? 'verifying' : job.phase, error, leaseUntil: 0, updatedAt: error.at });
      tx.create(ref.collection('events').doc(), { actorUid: identity.uid, clubId, at: error.at, action: 'FAILED', error });
    });
    return publicJob({ ...job, state: 'failed', error });
  }
}
export function registerOrganizationPurge(app: Express, services: () => PurgeServices) {
  app.get('/api/admin/clubs/:clubId/purge', async (req,res) => {
    try { return res.json(await getOrganizationPurge(services(),req.auth,String(req.params.clubId))); }
    catch (e: any) { return res.status(e instanceof MemberCreationError ? e.status : 500).json({ error: e instanceof MemberCreationError ? e.message : 'Journal de purge indisponible.' }); }
  });
  app.post('/api/admin/clubs/:clubId/purge', async (req,res) => {
    try { const result = await advanceOrganizationPurge(services(),req.auth,String(req.params.clubId),req.body); return res.status(result.state === 'failed' ? 409 : result.state === 'completed' ? 200 : 202).json(result); }
    catch (e: any) { return res.status(e instanceof MemberCreationError ? e.status : 500).json({ error: e instanceof MemberCreationError ? e.message : 'Purge indisponible. Consultez son journal avant toute reprise.' }); }
  });
}
