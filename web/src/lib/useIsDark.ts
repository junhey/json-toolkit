import { useEffect, useState } from 'react';
import { useStore } from '../store';

export function useIsDark() {
  const theme = useStore((s) => s.theme);
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return theme === 'dark' || (theme === 'system' && systemDark);
}
