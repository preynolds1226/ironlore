import { Stack } from 'expo-router';

import { PaywallModalProvider } from '@/src/purchases/PaywallModalContext';
import { PremiumProvider } from '@/src/purchases/PremiumContext';

export default function RootLayout() {
  return (
    <PremiumProvider>
      <PaywallModalProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </PaywallModalProvider>
    </PremiumProvider>
  );
}