import { useCallback, useEffect, useState } from 'react';

export const DOCK_COMPACT_PAD = '3.75rem';
export const DOCK_EXPANDED_PAD = '5.5rem';
const DOCK_COMPACT_LS = 'hoodrats-mint-dock-compact';

export function useMintDockLayout() {
  const [dockCompact, setDockCompact] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DOCK_COMPACT_LS) === '1') {
        setDockCompact(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--mint-dock-scroll-pad',
      dockCompact ? DOCK_COMPACT_PAD : DOCK_EXPANDED_PAD,
    );
    return () => {
      document.documentElement.style.removeProperty('--mint-dock-scroll-pad');
    };
  }, [dockCompact]);

  const toggleDockCompact = useCallback(() => {
    setDockCompact((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(DOCK_COMPACT_LS, next ? '1' : '0');
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  }, []);

  return { dockCompact, toggleDockCompact };
}
