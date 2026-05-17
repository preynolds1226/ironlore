import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AppProviders } from '@/src/boot/AppProviders';
import { bootLog } from '@/src/debug/bootLog';
import { BootTraceOverlay } from '@/src/debug/BootTraceOverlay';

function HomeLoadingFallback() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0a0a0f',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
      }}>
      <ActivityIndicator color="#c9a84c" size="large" />
      <Text style={{ color: '#c9a84c', fontSize: 20, fontWeight: '800', letterSpacing: 4 }}>IRONLORE</Text>
      <Text style={{ color: '#888899', fontSize: 13 }}>Loading…</Text>
    </View>
  );
}

function HomeLoadError({ message }: { message: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#1a0a0a',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
      }}>
      <Text style={{ color: '#ff6b6b', fontSize: 20, fontWeight: '900', marginBottom: 12, textAlign: 'center' }}>
        IronLore could not load
      </Text>
      <Text style={{ color: '#ffffff', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
        The home screen failed to load. Force-quit and reopen, or screenshot this for support.
      </Text>
      <Text style={{ color: '#888899', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>{message}</Text>
    </View>
  );
}

/**
 * Providers wrap the app; HomeApp loads via dynamic import + state (not React.lazy/Suspense).
 * Suspense for lazy routes is unreliable in Expo RN release builds and can leave a permanent black screen.
 */
export default function HomeEntry() {
  const [HomeApp, setHomeApp] = useState<React.ComponentType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // #region agent log
  bootLog('home-entry.tsx:render', 'home_entry_render', 'H-E', {
    hasHomeApp: !!HomeApp,
    hasError: !!loadError,
  });
  // #endregion

  useEffect(() => {
    let cancelled = false;
    // #region agent log
    bootLog('home-entry.tsx:import', 'home_app_import_start', 'H-E');
    // #endregion
    void import('./home-app')
      .then((mod) => {
        // #region agent log
        bootLog('home-entry.tsx:import', 'home_app_import_ok', 'H-E');
        // #endregion
        if (!cancelled) setHomeApp(() => mod.default);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[IronLore] home-app import failed:', e);
        // #region agent log
        bootLog('home-entry.tsx:import', 'home_app_import_fail', 'H-D', { msg });
        // #endregion
        if (!cancelled) setLoadError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppProviders>
      {loadError ? (
        <HomeLoadError message={loadError} />
      ) : HomeApp ? (
        <HomeApp />
      ) : (
        <HomeLoadingFallback />
      )}
      <BootTraceOverlay />
    </AppProviders>
  );
}
