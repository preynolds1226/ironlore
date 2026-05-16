import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { PaywallModalProvider } from '@/src/purchases/PaywallModalContext';
import { PremiumProvider } from '@/src/purchases/PremiumContext';

// Last-resort module-level deadline: fires if React never mounts at all (rare).
// The component-level useEffect below is the primary path.
if (typeof SplashScreen.hideAsync === 'function') {
  setTimeout(() => {
    void SplashScreen.hideAsync();
  }, 5000);
}

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

export default function RootLayout() {
  useEffect(() => {
    // Primary path: hide splash as soon as the root layout mounts.
    // This is more reliable than a module-level timer because we know React is
    // running. expo-router also hides it on NavigationContainer.onReady, but on
    // iOS 26 that callback can silently fail due to Turbo Module issues.
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <PremiumProvider>
        <PaywallModalProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0f' } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </PaywallModalProvider>
      </PremiumProvider>
    </ErrorBoundary>
  );
}