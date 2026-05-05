import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { IronLore } from '@/src/ui/ironloreTokens';

const PRESS_SCALE = 0.97;

export type PaywallPanelProps = {
  busy: boolean;
  onSubscribe: () => void;
  onRestore: () => void;
};

function onPressInHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function PaywallPanel({ busy, onSubscribe, onRestore }: PaywallPanelProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>IronLore+</Text>
      <Text style={styles.sub}>
        Cloud workout templates — create, edit, and sync routines across devices. Included with IronLore+ along with unlimited AI Coach and meal photo estimates.
      </Text>
      <View style={styles.bullets}>
        {['Unlimited AI Coach', 'Meal photo → macros', 'Workout template cloud sync'].map((t) => (
          <Text key={t} style={styles.bullet}>
            • {t}
          </Text>
        ))}
      </View>
      <Pressable
        disabled={busy}
        onPress={onSubscribe}
        onPressIn={onPressInHaptic}
        style={({ pressed }) => [
          styles.primary,
          pressed && styles.primaryPressed,
          { transform: [{ scale: pressed ? PRESS_SCALE : 1 }] },
        ]}
        android_ripple={{ color: 'rgba(10,10,15,0.25)' }}
      >
        {busy ? (
          <ActivityIndicator color={IronLore.colors.bg} />
        ) : (
          <Text style={styles.primaryText}>Subscribe</Text>
        )}
      </Pressable>
      <Pressable
        disabled={busy}
        onPress={onRestore}
        onPressIn={onPressInHaptic}
        style={({ pressed }) => [
          styles.secondary,
          pressed && styles.secondaryPressed,
          { transform: [{ scale: pressed ? PRESS_SCALE : 1 }] },
        ]}
        android_ripple={
          Platform.OS === 'android' ? { color: 'rgba(201,168,76,0.25)', borderless: true } : undefined
        }
      >
        <Text style={styles.secondaryText}>Restore purchases</Text>
      </Pressable>
      <Text style={styles.note}>
        Payment is charged to your Apple ID. Manage or cancel in Settings ▸ Apple ID ▸ Subscriptions. Free tier still includes home workouts, barcode nutrition, and limited coach messages per day.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  title: { ...IronLore.type.title, fontSize: 22, color: IronLore.colors.gold, marginBottom: 12 },
  sub: { ...IronLore.type.body, color: IronLore.colors.text, marginBottom: 20 },
  bullets: { marginBottom: 28, gap: 8 },
  bullet: { ...IronLore.type.body, color: IronLore.colors.muted },
  primary: {
    backgroundColor: IronLore.colors.gold,
    borderRadius: IronLore.radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  primaryPressed: {
    opacity: 0.92,
  },
  primaryText: { fontSize: 16, fontWeight: '900', color: IronLore.colors.bg },
  secondary: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: IronLore.radii.md,
  },
  secondaryPressed: {
    opacity: 0.85,
  },
  secondaryText: { fontSize: 14, fontWeight: '800', color: IronLore.colors.gold },
  note: { fontSize: 11, color: IronLore.colors.muted, marginTop: 24, lineHeight: 16 },
});
