import React, { lazy, Suspense } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AppProviders } from '@/src/boot/AppProviders';

const HomeApp = lazy(() => import('./home-app'));

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

/**
 * Providers wrap the app; HomeApp loads in a separate async chunk via `lazy`.
 * A static `import './home-app'` here would pull the entire module graph in one
 * sync parse when `import('./home-entry')` resolves — matching TestFlight black screens.
 */
export default function HomeEntry() {
  return (
    <AppProviders>
      <Suspense fallback={<HomeLoadingFallback />}>
        <HomeApp />
      </Suspense>
    </AppProviders>
  );
}
