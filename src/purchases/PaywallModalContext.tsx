import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { IronLorePlusPaywallModal } from '@/src/purchases/IronLorePlusPaywallModal';

type PaywallModalValue = {
  present: () => void;
  dismiss: () => void;
};

const PaywallModalContext = createContext<PaywallModalValue | null>(null);

export function PaywallModalProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  const present = useCallback(() => {
    if (Platform.OS === 'web') return;
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const value = useMemo<PaywallModalValue>(
    () => ({
      present,
      dismiss,
    }),
    [present, dismiss],
  );

  return (
    <PaywallModalContext.Provider value={value}>
      {children}
      <IronLorePlusPaywallModal visible={visible} onDismiss={dismiss} />
    </PaywallModalContext.Provider>
  );
}

export function useIronLorePlusPaywall(): PaywallModalValue {
  const ctx = useContext(PaywallModalContext);
  if (!ctx) {
    throw new Error('useIronLorePlusPaywall must be used within PaywallModalProvider');
  }
  return ctx;
}
