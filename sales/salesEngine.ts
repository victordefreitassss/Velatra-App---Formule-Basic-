import { parisDateKey } from '../components/planningSlots.ts';
import { attendance, lastShowedCoach, normalizeSource, salesJoins, stamp, type SalesInput } from './salesModel.ts';
export const ratio = (numerator: number, denominator: number) => ({ numerator, denominator, percent: denominator ? Math.round(numerator / denominator * 1000) / 10 : 0 });
export function salesOverview(input: SalesInput, from: string, to: string, now = new Date()) {
  const joins = salesJoins(input);
  const cohort = joins.prospects.filter(p => { const time = stamp(p.date); if (!Number.isFinite(time) || time > now.getTime()) return false; const day = parisDateKey(new Date(time)); return day >= from && day <= to; });
  const uids = new Set(cohort.map(p => p.firebaseUid));
  const trials = new Map<string, typeof input.bookings>();
  let unlinkedTrials = 0;
  for (const b of input.bookings) {
    if (b.clubId !== input.clubId || b.type !== 'trial') continue;
    const uid = joins.prospect(b)?.firebaseUid;
    if (!uid) { unlinkedTrials++; continue; }
    if (uids.has(uid)) { const list = trials.get(uid) || []; list.push(b); trials.set(uid, list); }
  }
  const contacted = new Set(input.events.filter(e => e.clubId === input.clubId && e.eventType === 'CONTACTED' && uids.has(e.prospectUid) && stamp(e.at) <= now.getTime()).map(e => e.prospectUid));
  const records = cohort.map(p => {
    const bookings = trials.get(p.firebaseUid!) || [];
    const known = bookings.filter(b => stamp(b.startTime) <= now.getTime());
    return { prospect: p, contacted: contacted.has(p.firebaseUid!), booked: bookings.length > 0,
      showed: known.some(b => attendance(b) === 'SHOWED_UP'), converted: !!p.convertedMemberUid && (!p.convertedAt || stamp(p.convertedAt) <= now.getTime()),
      lost: p.status === 'lost' && Number.isFinite(stamp(p.lostAt)) && stamp(p.lostAt) <= now.getTime(), bookings, known };
  });
  const counts = (rows: typeof records) => ({ leads: rows.length, contacted: rows.filter(r => r.contacted).length, booked: rows.filter(r => r.booked).length,
    showed: rows.filter(r => r.showed).length, converted: rows.filter(r => r.converted).length, lost: rows.filter(r => r.lost).length });
  const funnel = counts(records);
  const all = records.flatMap(r => r.bookings), finalized = records.flatMap(r => r.known).filter(b => ['SHOWED_UP', 'NO_SHOW'].includes(attendance(b)));
  const sourceMap = new Map<string, typeof records>();
  for (const row of records) { const key = normalizeSource(row.prospect.source); const list = sourceMap.get(key) || []; list.push(row); sourceMap.set(key, list); }
  const sources = [...sourceMap].map(([source, rows]) => { const count = counts(rows); return { source, ...count, conversion: ratio(count.converted, count.leads) }; }).sort((a, b) => a.source.localeCompare(b.source));
  const coachMap = new Map<string, { coachUid: string | null; name: string; showed: number; noShow: number; conversions: number; convertedShowed: number }>();
  const coachRow = (uid: string | null) => { const key = uid || 'unassigned'; let row = coachMap.get(key); if (!row) { row = { coachUid: uid, name: input.coaches.find(c => c.firebaseUid === uid)?.name || 'Non attribué', showed: 0, noShow: 0, conversions: 0, convertedShowed: 0 }; coachMap.set(key, row); } return row; };
  const showedProspects = new Map<string, Set<string>>(), convertedProspects = new Map<string, Set<string>>();
  for (const r of records) {
    for (const b of r.known) { const state = attendance(b), uid = joins.coach(b)?.firebaseUid || null; if (state === 'SHOWED_UP') { coachRow(uid).showed++; const set = showedProspects.get(uid || '') || new Set(); set.add(r.prospect.firebaseUid!); showedProspects.set(uid || '', set); } else if (state === 'NO_SHOW') coachRow(uid).noShow++; }
    if (r.converted) { const event = input.events.find(e => e.clubId === input.clubId && e.prospectUid === r.prospect.firebaseUid && e.eventType === 'CONVERTED'); const uid = event ? (input.coaches.some(c => c.clubId === input.clubId && ['owner', 'coach'].includes(c.role) && c.firebaseUid === event.coachUid) ? event.coachUid || null : null) : lastShowedCoach(r.bookings, r.prospect.convertedAt, joins.coach); coachRow(uid).conversions++; const set = convertedProspects.get(uid || '') || new Set(); set.add(r.prospect.firebaseUid!); convertedProspects.set(uid || '', set); }
  }
  return { from, to, timezone: 'Europe/Paris', generatedAt: now.toISOString(), label: 'Conversions observées à ce jour', funnel,
    rates: { leadContacted: ratio(funnel.contacted, funnel.leads), leadBooked: ratio(funnel.booked, funnel.leads), bookedShowed: ratio(funnel.showed, funnel.booked),
      showedConverted: ratio(records.filter(r => r.showed && r.converted).length, funnel.showed), leadConverted: ratio(funnel.converted, funnel.leads) },
    attendance: { total: all.length, showed: finalized.filter(b => attendance(b) === 'SHOWED_UP').length, noShow: finalized.filter(b => attendance(b) === 'NO_SHOW').length,
      cancelled: all.filter(b => attendance(b) === 'CANCELLED').length, unknown: all.filter(b => attendance(b) === 'PENDING' && stamp(b.startTime) <= now.getTime()).length,
      noShowRate: ratio(finalized.filter(b => attendance(b) === 'NO_SHOW').length, finalized.length) }, sources,
    coaches: input.studio ? [...coachMap.values()].sort((a, b) => a.name.localeCompare(b.name)).map(c => { const shown = showedProspects.get(c.coachUid || '') || new Set(); const converted = convertedProspects.get(c.coachUid || '') || new Set(); return { ...c, conversion: ratio([...converted].filter(uid => shown.has(uid)).length, shown.size) }; }) : [],
    partial: !!input.partialSources?.length, partialSources: input.partialSources || [], dataQuality: { unlinkedTrials, unknownAttendance: all.filter(b => attendance(b) === 'PENDING' && stamp(b.startTime) <= now.getTime()).length, invalidLeadDates: joins.prospects.filter(p => !Number.isFinite(stamp(p.date))).length } };
}
export type SalesOverview = ReturnType<typeof salesOverview>;
