import { useSyncExternalStore } from 'react';
import { resolveProductFormat } from '../productExperience';

const subscribe = (changed: () => void) => {
  window.addEventListener('resize', changed);
  return () => window.removeEventListener('resize', changed);
};
/** Shared breakpoints; presentation changes never grant a capability. */
export function useProductFormat() {
  return useSyncExternalStore(subscribe, () => resolveProductFormat(window.innerWidth), () => resolveProductFormat(1024));
}
