import { useEffect, useRef } from 'react';

/** Keep container opacity at 1 so child glass can sample the wallpaper throughout navigation. */
export function useScreenMotion(view: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = el.animate(
      [{ transform: 'translateY(12px)' }, { transform: 'translateY(0)' }],
      { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' },
    );
    return () => animation.cancel();
  }, [view]);
  return ref;
}
