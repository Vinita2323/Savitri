import { useEffect, useState } from 'react';

/**
 * True below the desktop breakpoint (Tailwind `lg`, 1024px): phones and tablets use a slide-in navigation drawer,
 * desktops keep the fixed sidebar. Follows orientation changes and window resizes.
 */
const QUERY = '(max-width: 1023.98px)';

const useIsCompact = () => {
  const get = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY).matches : false);
  const [compact, setCompact] = useState(get);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setCompact(mq.matches);
    onChange();
    if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', onChange); else mq.removeListener(onChange); };
  }, []);
  return compact;
};

export default useIsCompact;
