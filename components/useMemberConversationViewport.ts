import { useLayoutEffect, useRef } from 'react';

// Presentation only: fit the conversation between the actual header and navigation.
// visualViewport shrinks when a mobile keyboard is shown; no fixed phone height.
export function useMemberConversationViewport(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const viewport = window.visualViewport;
    const shell = element.closest('.va-member-shell');
    const navigation = shell?.querySelector<HTMLElement>('.va-mobile-nav');
    const header = shell?.querySelector<HTMLElement>('.va-topbar');
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewportBottom = (viewport?.offsetTop || 0) + (viewport?.height || window.innerHeight);
        const navTop = navigation && getComputedStyle(navigation).display !== 'none' ? navigation.getBoundingClientRect().top : viewportBottom;
        element.style.setProperty('--member-conversation-height', `${Math.max(160, Math.min(viewportBottom, navTop) - element.getBoundingClientRect().top - 12)}px`);
      });
    };
    const observer = new ResizeObserver(update);
    if (header) observer.observe(header);
    if (navigation) observer.observe(navigation);
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update); document.removeEventListener('focusout', update);
    };
  }, [enabled]);
  return ref;
}
