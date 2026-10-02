import { createHash } from 'node:crypto';
import type { PulseAction } from '../pulse/pulseModel';
import type { RetentionAssessment } from '../retention/retentionModel';
import type { MemberOnboardingAssessment } from './onboardingEngine';
/** One onboarding action, preserving unrelated tasks, messages, payments and recurring followups. */
export function withOnboardingActions(actions: PulseAction[], assessments: MemberOnboardingAssessment[], initialAssignmentIds: Set<string> = new Set(), sourceVersions: Record<string, string> = {}, retention: RetentionAssessment[] = []): PulseAction[] {
  const active = new Map(assessments.filter(a => a.needsAttention && !a.partial && a.nextAction).map(a => [a.memberUid, a]));
  const representedRetention = new Set(retention.filter(r => r.signals.filter(s => s.family !== 'BILLING').every(s => ['NO_FIRST_ACTIVITY', 'NO_ACTIVE_PROGRAM'].includes(s.type))).map(r => r.memberUid));
  const filtered = actions.filter(a => !active.has(a.memberUid || '') || !(a.type === 'RETENTION_ATTENTION' && representedRetention.has(a.memberUid || '') || ['PROGRAM_MISSING', 'CLIENT_UNASSIGNED', 'CLIENT_INACTIVE'].includes(a.type) || ['FOLLOWUP_DUE', 'FOLLOWUP_LATE'].includes(a.type) && [...initialAssignmentIds].some(id => a.key.includes(`:${id}:`))));
  const aggregate = [...active.values()].map((a): PulseAction => ({ key: `onboarding:${a.memberUid}`, type: 'ONBOARDING_ACTION', category: 'clients', priority: a.state === 'BLOCKED' ? 'high' : 'normal', group: 'today', title: a.memberName,
    reason: `Onboarding ${a.completedSteps}/${a.totalSteps} · ${a.nextAction!.label}`, memberId: a.memberId, memberUid: a.memberUid,
    destination: { page: 'onboarding', memberId: a.memberId }, quickActions: [{ label: 'Continuer', destination: { page: 'onboarding', memberId: a.memberId } }], createdFrom: 'onboarding',
    sourceFingerprint: createHash('sha256').update(JSON.stringify([a.state, a.steps.map(s => [s.id, s.state, s.reason]), a.sessionState, sourceVersions[`users/${a.memberUid}`] || null, sourceVersions[`users/${a.assignedCoachUid}`] || null])).digest('hex') }));
  return [...filtered, ...aggregate].sort((a,b) => ({ urgent: 0, high: 1, normal: 2 }[a.priority] - { urgent: 0, high: 1, normal: 2 }[b.priority]) || ({ overdue: 0, today: 1, upcoming: 2 }[a.group] - { overdue: 0, today: 1, upcoming: 2 }[b.group]) || ((a.dueAt ? Date.parse(a.dueAt) : Number.MAX_SAFE_INTEGER) - (b.dueAt ? Date.parse(b.dueAt) : Number.MAX_SAFE_INTEGER)) || a.key.localeCompare(b.key));
}
