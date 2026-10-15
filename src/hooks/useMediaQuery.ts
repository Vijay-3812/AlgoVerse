import { useEffect, useState } from 'react';

/** SSR-safe media query hook. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent): void => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export const useIsMobile = (): boolean => useMediaQuery('(max-width: 767px)');
export const useIsTablet = (): boolean => useMediaQuery('(max-width: 1023px)');

/**
 * Motion budget. Visualisers read this to swap springs for instant state
 * changes — never to remove information, only to remove movement.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
