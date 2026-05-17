import 'react-native-gesture-handler';

import * as SplashScreen from 'expo-splash-screen';

// Hold native splash until first JS frame; must always eventually call hideAsync.
void SplashScreen.preventAutoHideAsync().catch(() => {});

// Safety net: Release builds sometimes skip onLayout before splash blocks the UI — force dismiss.
for (const ms of [0, 50, 150, 400, 800, 1500, 2500, 4000, 6000]) {
  setTimeout(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, ms);
}

import 'expo-router/entry';
