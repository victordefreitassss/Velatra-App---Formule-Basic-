import { createHash } from 'node:crypto';
import type { PulseAction } from '../pulse/pulseModel';
import type { RetentionAssessment } from './retentionModel';
/** Operational tasks/messages/payments remain distinct. Only represented warning families are replaced. */
export function withRetentionActions(actions: PulseAction[], assessments: RetentionAssessment[]): PulseAction[] {
  const candidates = new Map(assessments.filter(item => ['attention', 'critical'].includes(item.state)).map(item => [item.memberUid, item]));
  const filtered = actions.filter(action => {
    const assessment = action.memberUid && candidates.get(action.memberUid);
    if (!assessment) return true;
    const families = new Set(assessment.signals.filter(signal => signal.severity !== 'context').map(signal => signal.family));
    return !(action.type === 'CLIENT_INACTIVE' && families.has('ACTIVITY') || action.type === 'PROGRAM_MISSING' && action.reason !== 'Programme demandé' && assessment.signals.some(signal => signal.type === 'NO_ACTIVE_PROGRAM') || action.type === 'PROGRAM_ENDING' && assessment.signals.some(signal => signal.type === 'PROGRAM_ENDING_WITHOUT_NEXT') || action.type === 'FOLLOWUP_LATE' && families.has('FOLLOWUP'));
  });
  const aggregated: PulseAction[] = [...candidates.values()].map(assessment => {
    const destination = { page: 'retention', memberId: assessment.memberId } as const;
    const sources = assessment.signals.filter(signal => !['INTERACTION', 'BILLING'].includes(signal.family)).map(signal => [signal.type, signal.severity, signal.factKey]).sort();
    return { key: `retention:${assessment.memberUid}`, type: 'RETENTION_ATTENTION', category: 'clients', priority: assessment.state === 'critical' ? 'urgent' : 'high', title: assessment.memberName,
      reason: `${assessment.state === 'critical' ? 'Critique' : 'Attention'} · ${assessment.signals.filter(signal => !['INTERACTION', 'BILLING'].includes(signal.family)).length} signal(s) à examiner`, memberUid: assessment.memberUid, memberId: assessment.memberId,
      destination, quickActions: [{ label: 'Voir Retain', destination }, { label: 'Message', destination: { page: 'chat', memberId: assessment.memberId } }], createdFrom: 'retention', group: 'today',
      sourceFingerprint: createHash('sha256').update(JSON.stringify([assessment.memberUid, assessment.state, sources])).digest('hex') };
  });
  return [...filtered, ...aggregated].sort((a, b) => ({ urgent: 0, high: 1, normal: 2 }[a.priority] - { urgent: 0, high: 1, normal: 2 }[b.priority]) || ({ overdue: 0, today: 1, upcoming: 2 }[a.group] - { overdue: 0, today: 1, upcoming: 2 }[b.group]) || ((a.dueAt ? Date.parse(a.dueAt) : Number.MAX_SAFE_INTEGER) - (b.dueAt ? Date.parse(b.dueAt) : Number.MAX_SAFE_INTEGER)) || a.key.localeCompare(b.key));
}
