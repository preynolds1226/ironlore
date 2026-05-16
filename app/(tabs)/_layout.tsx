import { Slot } from 'expo-router';
import { View } from 'react-native';

/**
 * Home UI uses internal navigation in home-app.tsx. Expo Tabs + template screens
 * (explore/training + Reanimated) were removed from the launch path — they correlated
 * with a blank first frame on TestFlight.
 */
export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <Slot />
    </View>
  );
}
