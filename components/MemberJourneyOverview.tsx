import React, { useEffect, useState } from 'react';
import { apiFetch } from '../firebase';
import type { JourneyPhase } from '../server/followupModel';

export function MemberJourneyOverview() {
  const [phases, setPhases] = useState<JourneyPhase[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    apiFetch('/api/followup/me').then(async response => {
      if (!response.ok) throw new Error('Parcours indisponible');
      const result = await response.json();
      if (live) setPhases(result.journey?.phases || []);
    }).catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, []);
  if (error) return <section className="va-member-empty"><h2>Parcours de coaching</h2><p>Votre parcours est momentanément indisponible. Vos performances restent accessibles ci-dessous.</p></section>;
  if (phases === null) return <p role="status" className="va-member-empty">Chargement de votre parcours…</p>;
  const active = phases.find(phase => phase.status === 'active');
  const next = phases.find(phase => phase.status === 'planned');
  return <section aria-labelledby="member-journey-title" className="va-member-journey">
    <div className="va-member-section-heading"><h2 id="member-journey-title">Mon parcours</h2><span>{phases.length ? `${phases.filter(phase => phase.status === 'completed').length} / ${phases.length} phases terminées` : 'À définir avec votre coach'}</span></div>
    {phases.length ? <>
      {active && <p className="va-member-journey-current">En ce moment : <strong>{active.name}</strong>{active.objective ? ` · ${active.objective}` : ''}</p>}
      <ol className="va-member-journey-steps">{phases.map(phase => <li key={phase.id}><span aria-hidden="true">{phase.status === 'completed' ? '✓' : phase.status === 'active' ? '●' : '○'}</span><span><strong>{phase.name}</strong><small>{phase.status === 'completed' ? 'Terminée' : phase.status === 'active' ? 'En cours' : phase.status === 'paused' ? 'En pause' : 'Prévue'}</small></span></li>)}</ol>
      {next && <p className="va-member-muted">Prochaine étape : {next.name}</p>}
    </> : <p className="va-member-muted">Votre coach n’a pas encore défini de phases. Vos séances et performances restent visibles ci-dessous.</p>}
  </section>;
}
