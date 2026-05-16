import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LazyPremiumProvider } from '@/src/purchases/LazyPremiumProvider';
import { PaywallModalProvider } from '@/src/purchases/PaywallModalContext';

void SplashScreen.preventAutoHideAsync().catch(() => {});

const iosBuild =
  Constants.expoConfig?.ios?.buildNumber ??
  (Constants.expoConfig?.extra as { iosBuildNumber?: string } | undefined)?.iosBuildNumber ??
  '?';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: msg };
  }

  override componentDidCatch(error: unknown) {
    console.error('[IronLore] ErrorBoundary caught:', error);
    void SplashScreen.hideAsync().catch(() => {});
  }

  override render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#1a0a0a', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: '#ff6b6b', fontSize: 22, fontWeight: '900', marginBottom: 16, textAlign: 'center' }}>
            IronLore failed to start
          </Text>
          <Text style={{ color: '#ffffff', fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 12 }}>
            Force-quit and reopen the app.
          </Text>
          <Text style={{ color: '#888899', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
            {this.state.errorMessage || 'Unknown error'}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function BootScreen({ onReady }: { onReady: () => void }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0a0a0f',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
      onLayout={onReady}>
      <Text style={{ color: '#c9a84c', fontSize: 32, fontWeight: '900', letterSpacing: 6 }}>IRONLORE</Text>
      <Text style={{ color: '#888899', fontSize: 14 }}>Starting…</Text>
      <Text style={{ color: '#c9a84c', fontSize: 12, marginTop: 8 }}>Build {iosBuild}</Text>
    </View>
  );
}

export default function RootLayout() {
  // Phase 1: boot screen (plain View, no navigator). Phase 2: full app after first layout + splash hide.
  const [navReady, setNavReady] = useState(false);

  const onBootLayout = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => {});
    // Next frame: mount Stack so we never show a blank window between splash and JS UI.
    requestAnimationFrame(() => setNavReady(true));
  }, []);

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

  // Hard fallback: never leave splash up more than 8s.
  useEffect(() => {
    const t = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
      setNavReady(true);
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  if (!navReady) {
    return <BootScreen onReady={onBootLayout} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <ErrorBoundary>
        <LazyPremiumProvider>
          <PaywallModalProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0a0a0f' },
              }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            </Stack>
          </PaywallModalProvider>
        </LazyPremiumProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
