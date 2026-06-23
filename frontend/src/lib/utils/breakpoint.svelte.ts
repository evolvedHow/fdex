// Reactive viewport breakpoint singletons (Svelte 5 runes + matchMedia).
// Import and read `.matches` inside $derived or template expressions.

function makeBreakpoint(query: string) {
  if (typeof window === 'undefined') {
    let matches = $state(false);
    return { get matches() { return matches; } };
  }
  const mq = window.matchMedia(query);
  let matches = $state(mq.matches);
  mq.addEventListener('change', (e) => { matches = e.matches; });
  return { get matches() { return matches; } };
}

export const isPhone    = makeBreakpoint('(max-width: 639px)');
export const isTablet   = makeBreakpoint('(min-width: 640px) and (max-width: 1023px)');
export const isLaptop   = makeBreakpoint('(min-width: 1024px) and (max-width: 1279px)');
export const isDesktop  = makeBreakpoint('(min-width: 1280px)');
export const isSmallish = makeBreakpoint('(max-width: 1023px)');
export const hasSidebar = makeBreakpoint('(min-width: 1280px)');
