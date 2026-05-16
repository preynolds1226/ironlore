import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { PaywallModalProvider } from '@/src/purchases/PaywallModalContext';
import { PremiumProvider } from '@/src/purchases/PremiumContext';

// Hard deadline: if expo-router's NavigationContainer.onReady never fires on iOS 26
// (due to a Turbo Module hang swallowing the startup callback), this guarantees the
// native splash screen hides within 4 seconds regardless. hideAsync() is a no-op if
// the splash was already hidden by expo-router's normal path.
if (typeof SplashScreen.hideAsync === 'function') {
  setTimeout(() => {
    void SplashScreen.hideAsync();
  }, 4000);
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#1a0a0a', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: '#ff6b6b', fontSize: 20, fontWeight: '800', marginBottom: 12, textAlign: 'center' }}>
            IronLore failed to start
          </Text>
          <Text style={{ color: '#ffffff', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
            Force-quit the app and reopen it. If this keeps happening, delete and reinstall.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <PremiumProvider>
        <PaywallModalProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </PaywallModalProvider>
      </PremiumProvider>
    </ErrorBoundary>
  );
}