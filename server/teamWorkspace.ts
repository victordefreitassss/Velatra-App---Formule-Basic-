import type { Express, Request, Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { staffReader } from './staffFacts.ts';
import { canManageTeam, canViewOwnTeam } from './authorization.ts';
import { MemberCreationError } from './createMember.ts';
import { safeId, FOLLOWUP_TIME_ZONE } from './followupModel.ts';
import type { AvailabilityWindow, CoachTeamSettings, TeamResult } from '../team/teamModel.ts';
const fail = (status: number, message: string): never => { throw new MemberCreationError(status, message); };
const time = (value: unknown): value is string => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const validWindows = (value: unknown): value is AvailabilityWindow[] => Array.isArray(value) && value.length <= 28 && value.every((slot, index) =>
  slot && typeof slot === 'object' && Object.keys(slot).every(key => ['day', 'start', 'end'].includes(key)) &&
  Number.isInteger(slot.day) && slot.day >= 0 && slot.day <= 6 && time(slot.start) && time(slot.end) && slot.start < slot.end &&
  !value.slice(0, index).some(previous => previous.day === slot.day && previous.start < slot.end && previous.end > slot.start));
export function teamSettings(value: unknown): CoachTeamSettings {
  const source = value && typeof value === 'object' ? value as Partial<CoachTeamSettings> : {};
  return { capacity: Number.isInteger(source.capacity) && source.capacity! >= 0 && source.capacity! <= 1000 ? source.capacity! : null,
    available: source.available !== false,
    specialties: Array.isArray(source.specialties) ? source.specialties.filter((s): s is string => typeof s === 'string' && s.length <= 60).slice(0, 8) : [],
    weeklyAvailability: validWindows(source.weeklyAvailability) ? source.weeklyAvailability : [],
    revision: Number.isSafeInteger(source.revision) && source.revision! >= 0 ? source.revision! : 0 };
}
/** Operational weekly windows in the existing Planning timezone, not bookable calendar slots. */
export function nextTeamAvailability(settings: CoachTeamSettings, now = new Date()): string | null {
  if (!settings.available || !settings.weeklyAvailability.length) return null;
  const local = new Intl.DateTimeFormat('en-CA', { timeZone: FOLLOWUP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const part = (key: string) => local.find(row => row.type === key)!.value;
  const day = `${part('year')}-${part('month')}-${part('day')}`, clock = `${part('hour')}:${part('minute')}`;
  for (let offset = 0; offset <= 7; offset++) {
    const date = new Date(day+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+offset);
    const windows = settings.weeklyAvailability.filter(slot => slot.day === date.getUTCDay() && (offset !== 0 || slot.end > clock)).sort((a,b)=>a.start.localeCompare(b.start));
    if (windows.length) return `${date.toISOString().slice(0,10)} ${offset === 0 && windows[0].start < clock ? clock : windows[0].start} (Europe/Paris)`;
  }
  return null;
}
async function teamReader(db: Firestore, uid: string, tx?: FirebaseFirestore.Transaction) {
  const reader = await staffReader(db, uid, tx);
  if (reader.club.accountType !== 'studio' || !(canManageTeam(reader.policy, reader.actor.clubId) || canViewOwnTeam(reader.policy, reader.actor.clubId))) fail(403, 'Cet espace est réservé à votre équipe Studio.');
  return reader;
}
export async function loadTeam(db: Firestore, uid: string): Promise<TeamResult> {
  // A single transaction gives coherent counts and rechecks actor/tenant authority.
  return db.runTransaction(async tx => {
    const reader = await teamReader(db, uid, tx), self = reader.actor.role === 'coach';
    const rows = await reader.source('users', self ? [['role','member'],['assignedCoachUid',uid]] : [], 10000);
    if (reader.partialSources.length) fail(503, 'Cette équipe dépasse la limite de chargement. Les totaux ne peuvent pas être calculés.');
    const members = rows.filter(row=>row.role === 'member').map(row=>({ uid:row.firebaseUid, id:row.id,
      name:typeof row.name === 'string' ? row.name : 'Client', status:row.status === 'paused' ? 'paused' as const : 'active' as const,
      isSuspended:row.isSuspended === true, assignedCoachUid:safeId(row.assignedCoachUid) ? row.assignedCoachUid : null,
      lastWorkoutDate:validDate(row.lastWorkoutDate), lastCheckInDate:validDate(row.lastCheckInDate) }));
    const coaches = (self ? [reader.actor] : rows.filter(row=>row.role === 'coach')).map(row=>{
      const settings=teamSettings(row.teamSettings), inactive=row.isSuspended === true || row.status === 'paused';
      return {uid:row.firebaseUid!,id:row.id,name:typeof row.name === 'string' ? row.name : 'Coach',avatar:typeof row.avatar === 'string' ? row.avatar : '',
        isSuspended:row.isSuspended === true,status:row.status === 'paused' ? 'paused' as const : 'active' as const,settings,
        assignedClients:members.filter(member=>member.assignedCoachUid === row.firebaseUid).length,nextAvailability:inactive ? null : nextTeamAvailability(settings)};
    });
    return {clubId:reader.actor.clubId,scope:self ? 'self' : 'tenant',coaches,members,evaluatedAt:new Date().toISOString()};
  });
}
const validDate = (value: unknown) => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value)) ? value : null;
export async function updateTeamCoach(db: Firestore, uid: string, coachUid: string, input: unknown) {
  if (!safeId(coachUid) || !input || typeof input !== 'object' || Array.isArray(input)) fail(400,'Paramètres équipe invalides.');
  const patch = input as Record<string, unknown>;
  if (!Number.isSafeInteger(patch.expectedRevision) || Number(patch.expectedRevision) < 0 ||
    Object.keys(patch).some(key=>!['expectedRevision','capacity','available','specialties','weeklyAvailability','isSuspended','status'].includes(key))) fail(400,'Paramètres équipe invalides.');
  return db.runTransaction(async tx=>{
    const reader=await teamReader(db,uid,tx), manager=canManageTeam(reader.policy,reader.actor.clubId);
    if (!manager && (coachUid!==uid || Object.keys(patch).some(key=>!['expectedRevision','available','weeklyAvailability'].includes(key)))) fail(403,'Vous ne pouvez modifier que vos propres disponibilités.');
    const ref=db.doc(`users/${coachUid}`), snapshot=await tx.get(ref), coach=snapshot.data();
    if (!coach || coach.clubId!==reader.actor.clubId || coach.role!=='coach') fail(404,'Coach introuvable dans votre organisation.');
    const settings=teamSettings(coach.teamSettings);
    if (settings.revision!==patch.expectedRevision) fail(409,'Ce profil a changé. Actualisez avant de réessayer.');
    if ('capacity' in patch && patch.capacity!==null && (!Number.isInteger(patch.capacity) || Number(patch.capacity)<0 || Number(patch.capacity)>1000)) fail(400,'La capacité doit être vide ou un entier entre 0 et 1000.');
    if ('available' in patch && typeof patch.available!=='boolean' || 'isSuspended' in patch && typeof patch.isSuspended!=='boolean') fail(400,'Statut invalide.');
    if ('status' in patch && !['active','paused'].includes(patch.status as string)) fail(400,'Statut invalide.');
    if ('specialties' in patch && (!Array.isArray(patch.specialties) || patch.specialties.length>8 || patch.specialties.some(s=>typeof s!=='string' || !s.trim() || s.length>60))) fail(400,'Spécialités invalides.');
    if ('weeklyAvailability' in patch && !validWindows(patch.weeklyAvailability)) fail(400,'Les plages doivent être valides, sans chevauchement.');
    const next: CoachTeamSettings={...settings,
      ...('capacity' in patch ? {capacity:patch.capacity as number|null} : {}),
      ...('available' in patch ? {available:patch.available as boolean} : {}),
      ...('specialties' in patch ? {specialties:[...new Set((patch.specialties as string[]).map(s=>s.trim()))]} : {}),
      ...('weeklyAvailability' in patch ? {weeklyAvailability:patch.weeklyAvailability as AvailabilityWindow[]} : {}),revision:settings.revision+1};
    tx.update(ref,{teamSettings:next,updatedAt:new Date().toISOString(),...('isSuspended' in patch ? {isSuspended:patch.isSuspended} : {}),...('status' in patch ? {status:patch.status} : {})});
    return {success:true,settings:next};
  });
}
/** Called by the existing assignment transaction; actual members, never a cached count. */
export async function assertTeamAssignment(tx: FirebaseFirestore.Transaction, db: Firestore, clubId: string, coachUid: string, coach: FirebaseFirestore.DocumentData) {
  const settings=teamSettings(coach.teamSettings);
  if (coach.isSuspended===true || coach.status==='paused' || !settings.available) fail(409,'Ce coach est indisponible pour une nouvelle affectation.');
  if (settings.capacity!==null) {
    const members=await tx.get(db.collection('users').where('clubId','==',clubId).where('role','==','member').where('assignedCoachUid','==',coachUid).limit(settings.capacity+1));
    if (members.size>=settings.capacity) fail(409,'Ce coach a atteint sa capacité. Choisissez un autre coach.');
  }
}
export function registerTeamWorkspace(app: Express, db: Firestore) {
  const route=(handler:(req:Request)=>Promise<unknown>)=>async(req:Request,res:Response)=>{
    try { if(!req.auth?.uid) fail(401,'Authentification requise.');res.json(await handler(req)); }
    catch(error:unknown){if(error instanceof MemberCreationError)return res.status(error.status).json({error:error.message});console.error('Team unavailable',{code:(error as {code?:unknown})?.code||'unknown'});res.status(500).json({error:'L’équipe est indisponible. Réessayez.'});}
  };
  app.get('/api/team',route(async req=>{if(Object.keys(req.query).length)fail(400,'Le tenant provient de votre session.');return loadTeam(db,req.auth.uid);}));
  app.patch('/api/team/coaches/:coachUid',route(req=>updateTeamCoach(db,req.auth.uid,String(req.params.coachUid),req.body)));
}
