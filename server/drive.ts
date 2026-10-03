import type { Express } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import type { Bucket } from '@google-cloud/storage';
import { pipeline } from 'node:stream/promises';
import { MemberCreationError } from './createMember.ts';
import { isOrganizationActive } from '../organizationAccess.ts';

export const DRIVE_CHUNK_BYTES = 2 * 1024 * 1024;
export const DRIVE_MAX_BYTES = 25 * 1024 * 1024;
const segment = (s: unknown): s is string => typeof s === 'string' && /^[^/\\\x00-\x1f]{1,180}$/.test(s) && s !== '.' && s !== '..';
const fileName = (s: unknown): s is string => typeof s === 'string' && /^[^/\\\x00-\x1f]{1,255}$/.test(s) && s !== '.' && s !== '..';
const allowedType = (s: unknown): s is string => typeof s === 'string' && (
  ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(s) || /^video\/[a-zA-Z0-9.+_-]+$/.test(s));
const admin = (identity: any, profile: any) => profile.role === 'superadmin' && identity.email_verified === true && identity.email === 'victor.defreitas.pro@gmail.com';
const fail = (status: number, message: string): never => { throw new MemberCreationError(status, message); };

async function actor(db: Firestore, identity: any, clubId: string) {
  if (!segment(identity?.uid)) fail(401, 'Authentification requise.');
  const profile = (await db.doc(`users/${identity.uid}`).get()).data();
  if (!profile || profile.isSuspended === true) fail(403, 'Accès Drive refusé.');
  const trusted = admin(identity, profile);
  if (!trusted && profile.clubId !== clubId) fail(403, 'Accès Drive refusé.');
  const club = (await db.doc(`clubs/${clubId}`).get()).data();
  if (!isOrganizationActive(club)) fail(403, 'Organisation suspendue ou activation non confirmée.');
  const staff = trusted || ['owner', 'coach'].includes(profile.role) || profile.role === 'manager' && club?.accountType === 'studio';
  return { profile, staff };
}

export function drivePath(fileId: string, file: any) {
  const parts = typeof file?.path === 'string' ? file.path.split('/') : [];
  if (parts.length !== 5 || parts[0] !== 'drive' || parts[1] !== file.clubId || parts[3] !== fileId ||
      !parts.slice(1,4).every(segment) || !fileName(parts[4]) || file.id !== fileId) fail(409, 'Métadonnées Drive invalides.');
  return file.path as string;
}

export async function authorizeDriveRead(db: Firestore, identity: any, fileId: string) {
  if (!segment(fileId)) fail(400, 'Fichier invalide.');
  const file = (await db.doc(`driveFiles/${fileId}`).get()).data();
  if (!file) fail(404, 'Fichier introuvable.');
  const path = drivePath(fileId, file);
  const { profile, staff } = await actor(db, identity, file.clubId);
  if (!staff && !(profile.role === 'member' && Array.isArray(file.sharedWith) && file.sharedWith.includes(profile.id)))
    fail(403, 'Ce partage n’est plus accessible.');
  return { file, path };
}

/** Publish once: the Firebase staging object/token is never the shared object. */
export async function finalizeDriveUpload(db: Firestore, bucket: Bucket, identity: any, fileId: string, input: any) {
  if (!segment(fileId) || !segment(input?.clubId) || !fileName(input?.name) ||
      !(input.folderId == null || segment(input.folderId)) || !Array.isArray(input.sharedWith) ||
      input.sharedWith.length > 1000 || input.sharedWith.some((id: any) => !Number.isSafeInteger(id))) fail(400, 'Import Drive invalide.');
  const { profile, staff } = await actor(db, identity, input.clubId);
  if (!staff) fail(403, 'Import Drive réservé au personnel.');
  if (input.folderId) {
    const folder = (await db.doc(`driveFolders/${input.folderId}`).get()).data();
    if (folder?.clubId !== input.clubId) fail(403, 'Dossier invalide.');
  }
  const record = db.doc(`driveFiles/${fileId}`);
  const existing = await record.get();
  const suffix = `${input.clubId}/${identity.uid}/${fileId}/${input.name}`;
  const source = bucket.file(`driveUploads/${suffix}`), destination = bucket.file(`drive/${suffix}`);
  if (existing.exists) {
    if (existing.data()?.path !== destination.name) fail(409, 'Ce fichier existe déjà.');
    const { url: _legacyUrl, ...published } = existing.data()!;
    return published;
  }
  let published: any;
  const [exists] = await destination.exists();
  if (exists) { [published] = await destination.getMetadata(); }
  else {
    const [metadata] = await source.getMetadata();
    if (!allowedType(metadata.contentType) || Number(metadata.size) > DRIVE_MAX_BYTES) fail(400, 'Type ou taille de fichier invalide.');
    // Copy pins the source generation and refuses to overwrite an existing private object.
    await bucket.file(source.name, { generation: metadata.generation }).copy(destination, {
      preconditionOpts: { ifGenerationMatch: 0 },
      contentType: metadata.contentType, cacheControl: 'private, no-store',
      contentDisposition: 'attachment', metadata: { firebaseStorageDownloadTokens: '' },
    });
    [published] = await destination.getMetadata();
  }
  if (published.metadata?.firebaseStorageDownloadTokens) fail(500, 'La publication privée a échoué.');
  // Removing the staging object invalidates its upload-response bearer URL before publication.
  const [staged] = await source.exists();
  if (staged) { const [metadata] = await source.getMetadata(); await source.delete({ ifGenerationMatch: Number(metadata.generation) }); }
  const file = { id: fileId, clubId: input.clubId, name: input.name, path: destination.name,
    size: Number(published.size), type: published.contentType, uploadedBy: profile.id,
    folderId: input.folderId ?? null, sharedWith: [...new Set(input.sharedWith)], createdAt: new Date().toISOString() };
  // Recheck live membership after the asynchronous Storage operation.
  if (!(await actor(db, identity, input.clubId)).staff) fail(403, 'Import Drive réservé au personnel.');
  await record.create(file);
  return file;
}

export function registerDrive(app: Express, db: Firestore, bucket: () => Bucket) {
  app.use('/api/drive', (_req, res, next) => {
    res.set({ 'Cache-Control': 'private, no-store, max-age=0', 'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); next();
  });
  app.post('/api/drive/files/:fileId/finalize', async (req, res) => {
    try { res.status(201).json(await finalizeDriveUpload(db, bucket(), req.auth, String(req.params.fileId), req.body)); }
    catch (e: any) { res.status(e instanceof MemberCreationError ? e.status : e.code === 404 ? 404 : e.code === 412 ? 409 : 500).json({ error: e instanceof MemberCreationError ? e.message : 'Publication Drive impossible.' }); }
  });
  app.get('/api/drive/files/:fileId/content', async (req, res) => {
    try {
      const { file, path } = await authorizeDriveRead(db, req.auth, String(req.params.fileId));
      const object = bucket().file(path);
      const [metadata] = await object.getMetadata();
      const size = Number(metadata.size);
      if (!Number.isSafeInteger(size) || size < 0 || size > DRIVE_MAX_BYTES) fail(409, 'Taille Drive invalide.');
      const etag = '"' + metadata.generation + '"';
      if (req.headers['if-match'] && req.headers['if-match'] !== etag) fail(412, 'Le fichier a changé. Réessayez.');
      res.set('ETag', etag);
      const type = allowedType(metadata.contentType) ? metadata.contentType! : 'application/octet-stream';
      const preview = req.query.download !== '1' && /^(application\/pdf|image\/|video\/)/.test(type);
      const name = encodeURIComponent(String(file.name)).replace(/['()]/g, c => '%' + c.charCodeAt(0).toString(16));
      res.set({ 'Content-Type': type, 'Content-Disposition': `${preview ? 'inline' : 'attachment'}; filename*=UTF-8''${name}`, 'Accept-Ranges': 'bytes' });
      let start = 0, end = Math.min(size, DRIVE_CHUNK_BYTES) - 1;
      if (req.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (!match || (!match[1] && !match[2])) { res.set('Content-Range', `bytes */${size}`); res.status(416).end(); return; }
        start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
        end = Math.min(match[1] && match[2] ? Number(match[2]) : size - 1, size - 1, start + DRIVE_CHUNK_BYTES - 1);
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) { res.set('Content-Range', `bytes */${size}`); res.status(416).end(); return; }
      }
      if (req.headers.range || size > DRIVE_CHUNK_BYTES) res.status(206).set('Content-Range', `bytes ${start}-${end}/${size}`);
      res.set('Content-Length', String(Math.max(0, end - start + 1)));
      // Pin the generation inspected above; no public/signed URL is returned.
      const stream = bucket().file(path, { generation: metadata.generation }).createReadStream(size ? { start, end } : {});
      res.on('close', () => { if (!res.writableEnded) stream.destroy(); });
      await pipeline(stream, res);
    } catch (e: any) {
      if (res.headersSent) { res.destroy(); return; }
      res.removeHeader('Content-Length');
      res.status(e instanceof MemberCreationError ? e.status : e.code === 404 ? 404 : 500).json({ error: e instanceof MemberCreationError ? e.message : 'Lecture Drive impossible.' });
    }
  });
}
