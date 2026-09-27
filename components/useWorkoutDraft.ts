import { useEffect, useState } from 'react';
import type { User } from '../types';
import { DRAFT_EVENT, draftOwner, readWorkoutDraft } from './workoutSession';

export function useWorkoutDraft(user: User) {
  const [, refresh] = useState(0);
  const owner = draftOwner(user);
  useEffect(() => {
    const update = () => refresh(value => value + 1);
    window.addEventListener(DRAFT_EVENT, update);
    window.addEventListener('storage', update);
    window.addEventListener('focus', update);
    return () => { window.removeEventListener(DRAFT_EVENT, update); window.removeEventListener('storage', update); window.removeEventListener('focus', update); };
  }, [owner]);
  return readWorkoutDraft(user);
}
