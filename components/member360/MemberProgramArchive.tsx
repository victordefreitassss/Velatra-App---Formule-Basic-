import React from 'react';
import type { AppState, Program, User } from '../../types';
import { memberDate } from './member360Model';

/** Uses the already subscribed archives and the existing read-only programme viewer. */
export function MemberProgramArchive({ member, state, onOpen }: { member: User; state: AppState; onOpen: (program: Program) => void }) {
  const programs = (state.archivedPrograms || []).filter(program => program.clubId === member.clubId && Number(program.memberId) === Number(member.id)).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  if (!programs.length) return null;
  return <details className="m360-card"><summary className="cursor-pointer text-sm font-semibold text-indigo-950">Anciens programmes · {programs.length}</summary><div className="mt-3 max-h-80 overflow-y-auto">{programs.map(program => <div key={program.id} className="m360-action-row"><div><h3>{program.name}</h3><p>Début : {memberDate(program.startDate)}</p></div><button type="button" className="vi-button" onClick={() => onOpen(program)}>Consulter</button></div>)}</div></details>;
}
