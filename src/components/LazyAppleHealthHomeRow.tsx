import React, { useEffect, useState } from 'react';

type Props = {
  onTodayStepsChange?: (steps: number) => void;
  cleanMode?: boolean;
};

/** Defers HealthKit hooks until after launch — apple-health at import correlates with iOS 26 TM SIGABRT. */
export function LazyAppleHealthHomeRow(props: Props) {
  const [Row, setRow] = useState<React.ComponentType<Props> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void import('@/src/components/AppleHealthHomeRow')
        .then((mod) => {
          if (!cancelled) setRow(() => mod.AppleHealthHomeRow);
        })
        .catch((e) => {
          console.error('[IronLore] AppleHealthHomeRow import failed:', e);
        });
    }, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!Row) return null;
  return <Row {...props} />;
}
