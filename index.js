import 'react-native-gesture-handler';

import * as SplashScreen from 'expo-splash-screen';

// Safety net: dismiss native splash even if React root never mounts (iOS 26 TM crash / hang).
for (const ms of [0, 100, 300, 800, 1500, 3000, 5000, 8000]) {
  setTimeout(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, ms);
}

import 'expo-router/entry';
