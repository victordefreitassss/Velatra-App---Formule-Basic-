import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '../types';
import { Button, Input } from './UI';
import { XIcon, CheckIcon } from './Icons';

type MemberDraft = Partial<User> & { password?: string };
export function AddMemberDialog({ data, setData, busy, onSave, onClose }: {
  data: MemberDraft; setData: React.Dispatch<React.SetStateAction<MemberDraft>>;
  busy: boolean; onSave: () => Promise<void>; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    node?.showModal();
    return () => { node?.close(); previous?.focus(); };
  }, []);
  return createPortal(
    <dialog ref={dialog} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []).filter(node => node.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} aria-labelledby={id + '-title'} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      className="va-member-dialog m-auto w-[calc(100%_-_2rem)] max-w-2xl rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/35">
      <form onSubmit={async event => { event.preventDefault(); if (busy) return; setError(''); try { await onSave(); } catch (error) { setError(error instanceof Error ? error.message : 'La création a échoué. Réessayez.'); } }} className="flex max-h-[90dvh] flex-col p-5 sm:p-8">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div><h2 id={id + '-title'} className="font-display text-2xl font-semibold">Ajouter un adhérent</h2><p className="mt-1 text-sm text-zinc-600">Créez son accès et préparez son suivi.</p></div>
          <button type="button" aria-label="Fermer" disabled={busy} onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 focus-visible:ring-2 focus-visible:ring-emerald-700"><XIcon size={20} /></button>
        </header>
            <div className="space-y-5 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0 pb-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor={id + "-name"} className="block text-sm font-semibold text-zinc-800">Nom Complet</label>
                  <Input id={id + "-name"}  
                    required maxLength={100} value={data.name}
                    onChange={e => setData({...data, name: e.target.value})}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={id + "-email"} className="block text-sm font-semibold text-zinc-800">Email</label>
                  <Input id={id + "-email"}  
                    type="email" required
                    value={data.email}
                    onChange={e => setData({...data, email: e.target.value})}
                    placeholder="jean@email.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor={id + "-password"} className="block text-sm font-semibold text-zinc-800">Mot de passe provisoire</label>
                  <Input id={id + "-password"}  
                  type="password" autoComplete="new-password" minLength={8} required
                  value={data.password}
                  onChange={e => setData({...data, password: e.target.value})}
                  placeholder="Ex: password2026"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={id + "-birthDate"} className="block text-sm font-semibold text-zinc-800">Date de naissance</label>
                  <Input id={id + "-birthDate"}  
                  type="date"
                  value={data.birthDate || ''}
                  onChange={e => setData({...data, birthDate: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor={id + "-weight"} className="block text-sm font-semibold text-zinc-800">Poids (kg)</label>
                  <Input id={id + "-weight"}  
                    type="number"
                    value={data.weight || ''}
                    onChange={e => setData({...data, weight: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={id + "-height"} className="block text-sm font-semibold text-zinc-800">Taille (cm)</label>
                  <Input id={id + "-height"}  
                    type="number"
                    value={data.height || ''}
                    onChange={e => setData({...data, height: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor={id + "-experienceLevel"} className="block text-sm font-semibold text-zinc-800">Expérience</label>
                  <select id={id + "-experienceLevel"}  
                    className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                    value={data.experienceLevel || 'Débutant'}
                    onChange={e => setData({...data, experienceLevel: e.target.value as any})}
                  >
                    <option value="Débutant" className="bg-white">Débutant</option>
                    <option value="Intermédiaire" className="bg-white">Intermédiaire</option>
                    <option value="Avancé" className="bg-white">Avancé</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor={id + "-equipment"} className="block text-sm font-semibold text-zinc-800">Équipement</label>
                  <select id={id + "-equipment"}  
                    className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                    value={data.equipment || 'Salle complète'}
                    onChange={e => setData({...data, equipment: e.target.value as any})}
                  >
                    <option value="Salle complète" className="bg-white">Salle complète</option>
                    <option value="Haltères/Kettlebells" className="bg-white">Haltères/Kettlebells</option>
                    <option value="Poids du corps" className="bg-white">Poids du corps</option>
                    <option value="Élastiques" className="bg-white">Élastiques</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor={id + "-trainingDays"} className="block text-sm font-semibold text-zinc-800">Jours / Semaine</label>
                  <Input id={id + "-trainingDays"}  
                    type="number" min="1" max="7"
                    value={data.trainingDays ?? 3}
                    onChange={e => setData({...data, trainingDays: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={id + "-sessionDuration"} className="block text-sm font-semibold text-zinc-800">Durée (min)</label>
                  <Input id={id + "-sessionDuration"}  
                    type="number" step="15"
                    value={data.sessionDuration ?? 60}
                    onChange={e => setData({...data, sessionDuration: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor={id + "-injuries"} className="block text-sm font-semibold text-zinc-800">Blessures / Douleurs</label>
                  <Input id={id + "-injuries"}  
                  value={data.injuries || ''}
                  onChange={e => setData({...data, injuries: e.target.value})}
                  placeholder="Ex: Douleur épaule droite..."
                />
              </div>
            </div>

        {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <footer className="flex shrink-0 flex-col gap-3 border-t border-zinc-200 bg-white pt-4 sm:flex-row">
          <Button type="button" variant="secondary" fullWidth disabled={busy} onClick={onClose}>Annuler</Button>
          <Button type="submit" fullWidth disabled={busy} aria-busy={busy}>{busy ? 'Création en cours…' : 'Créer le membre'}<CheckIcon size={18} className="ml-2" /></Button>
        </footer>
      </form>
    </dialog>, document.body);
}
