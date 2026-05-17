import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { getBootTrail, subscribeBootTrail } from '@/src/debug/bootLog';

const launchProbe =
  (Constants.expoConfig?.extra as { launchProbe?: boolean } | undefined)?.launchProbe === true;

/** On-screen boot trail when launchProbe is enabled (TestFlight diagnostics). */
export function BootTraceOverlay() {
  const [, bump] = useState(0);
  useEffect(() => subscribeBootTrail(() => bump((n) => n + 1)), []);
  if (!launchProbe) return null;
  const events = getBootTrail().slice(-6);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 8,
        right: 8,
        bottom: 40,
        backgroundColor: 'rgba(0,0,0,0.75)',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#c9a84c',
      }}>
      <Text style={{ color: '#c9a84c', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>BOOT TRACE</Text>
      {events.length === 0 ? (
        <Text style={{ color: '#888', fontSize: 9 }}>no events yet</Text>
      ) : (
        events.map((e, i) => (
          <Text key={`${e.t}-${i}`} style={{ color: '#aaa', fontSize: 9 }} numberOfLines={1}>
            {e.hypothesisId} {e.message}
          </Text>
        ))
      )}
    </View>
  );
}
