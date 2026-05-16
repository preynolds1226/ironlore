import * as Notifications from 'expo-notifications';
import React, { useEffect } from 'react';

import { LazyPaywallModalProvider } from '@/src/purchases/LazyPaywallModalProvider';
import { LazyPremiumProvider } from '@/src/purchases/LazyPremiumProvider';

/**
 * Native-heavy providers (RevenueCat, paywall modal) — loaded from the tab launch shell,
 * not from app/_layout.tsx, so the root route can paint and dismiss splash first.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    } catch (e) {
      console.error('[IronLore] Notifications.setNotificationHandler failed:', e);
    }
  }, []);

  return (
    <LazyPremiumProvider>
      <LazyPaywallModalProvider>{children}</LazyPaywallModalProvider>
    </LazyPremiumProvider>
  );
}
