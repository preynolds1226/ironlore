import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LazyPremiumProvider } from '@/src/purchases/LazyPremiumProvider';
import { PaywallModalProvider } from '@/src/purchases/PaywallModalContext';

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

/** Hide native splash after the root has had time to paint (avoids black flash + stuck splash). */
function useHideSplashWhenReady() {
  const hide = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    // Do NOT call preventAutoHideAsync here — expo-router already does. Extra prevent without
    // hide leaves TestFlight stuck on the splash (onLayout under splash may never run).
    hide();
    const t1 = setTimeout(hide, 150);
    const t2 = setTimeout(hide, 600);
    const t3 = setTimeout(hide, 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [hide]);

  return hide;
}

export default function RootLayout() {
  const hideSplash = useHideSplashWhenReady();

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
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: '#0a0a0f' }}
      onLayout={hideSplash}>
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
