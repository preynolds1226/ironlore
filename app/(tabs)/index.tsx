import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

type HomeAppModule = { default: React.ComponentType };

const iosBuild =
  Constants.expoConfig?.ios?.buildNumber ??
  (Constants.expoConfig?.extra as { iosBuildNumber?: string } | undefined)?.iosBuildNumber ??
  '?';

/**
 * Thin launch shell: paints immediately on TestFlight, then dynamically loads the heavy
 * home bundle. Import-time failures in home-app.tsx are caught here (ErrorBoundary cannot).
 */
export default function TabIndexLaunchShell() {
  const [HomeApp, setHomeApp] = useState<React.ComponentType | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('./home-app')
      .then((mod: HomeAppModule) => {
        if (!cancelled) setHomeApp(() => mod.default);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[IronLore] home-app import failed:', e);
        if (!cancelled) setImportError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (HomeApp) {
    return <HomeApp />;
  }

  if (importError) {
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
          The app module failed to import. Screenshot this and send to support.
        </Text>
        <Text style={{ color: '#888899', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>{importError}</Text>
        <Text style={{ color: '#c9a84c', fontSize: 11, marginTop: 16 }}>Build {iosBuild}</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0a0a0f',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
      onLayout={() => void SplashScreen.hideAsync().catch(() => {})}>
      <Text style={{ color: '#c9a84c', fontSize: 28, fontWeight: '900', letterSpacing: 6 }}>IRONLORE</Text>
      <ActivityIndicator color="#c9a84c" size="large" />
      <Text style={{ color: '#888899', fontSize: 13 }}>Loading…</Text>
      <Text style={{ color: '#555566', fontSize: 11, marginTop: 8 }}>Build {iosBuild}</Text>
    </View>
  );
}
