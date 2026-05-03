import { Stack } from 'expo-router';

import { PremiumProvider } from '@/src/purchases/PremiumContext';

export default function RootLayout() {
  return (
    <PremiumProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </PremiumProvider>
  );
}