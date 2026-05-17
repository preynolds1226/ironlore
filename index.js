import 'react-native-gesture-handler';

import * as SplashScreen from 'expo-splash-screen';

// Keep native splash until the launch shell calls hideAsync (avoids black frame if JS is slow/crashes).
void SplashScreen.preventAutoHideAsync().catch(() => {});

import 'expo-router/entry';
