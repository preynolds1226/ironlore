import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AppProviders } from '@/src/boot/AppProviders';

type HomeAppModule = { default: React.ComponentType };

const iosBuild =
  Constants.expoConfig?.ios?.buildNumber ??
  (Constants.expoConfig?.extra as { iosBuildNumber?: string } | undefined)?.iosBuildNumber ??
  '?';

const launchProbe =
  (Constants.expoConfig?.extra as { launchProbe?: boolean } | undefined)?.launchProbe === true;

type BootPhase = 'shell' | 'providers' | 'home-import' | 'ready' | 'error';

/**
 * Launch shell: paints immediately, dismisses splash, then loads AppProviders + home-app.
 * Import-time failures in home-app are caught here (root ErrorBoundary cannot).
 */
export default function TabIndexLaunchShell() {
  const [HomeApp, setHomeApp] = useState<React.ComponentType | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [phase, setPhase] = useState<BootPhase>('shell');

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
    let cancelled = false;

    (async () => {
      try {
        if (!cancelled) setPhase('home-import');
        const mod: HomeAppModule = await import('./home-app');
        if (cancelled) return;
        setHomeApp(() => mod.default);
        if (!cancelled) setPhase('ready');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[IronLore] home-app import failed:', e);
        if (!cancelled) {
          setImportError(msg);
          setPhase('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (HomeApp) {
    return (
      <AppProviders>
        <HomeApp />
      </AppProviders>
    );
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
      <Text style={{ color: '#888899', fontSize: 13 }}>
        {phase === 'home-import' ? 'Loading app…' : 'Starting…'}
      </Text>
      {launchProbe ? (
        <Text style={{ color: '#555566', fontSize: 11, marginTop: 4 }}>boot: {phase}</Text>
      ) : null}
      <Text style={{ color: '#555566', fontSize: 11, marginTop: 8 }}>Build {iosBuild}</Text>
    </View>
  );
}
