import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { IronLore } from '@/src/ui/ironloreTokens';

type Props = {
  busy: boolean;
  onSubscribe: () => void;
  onRestore: () => void;
};

export function TrainingPaywall({ busy, onSubscribe, onRestore }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
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
      <TouchableOpacity style={styles.primary} onPress={onSubscribe} disabled={busy} activeOpacity={0.85}>
        {busy ? <ActivityIndicator color={IronLore.colors.bg} /> : <Text style={styles.primaryText}>Subscribe</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={onRestore} disabled={busy} activeOpacity={0.85}>
        <Text style={styles.secondaryText}>Restore purchases</Text>
      </TouchableOpacity>
      <Text style={styles.note}>
        Payment is charged to your Apple ID. Manage or cancel in Settings ▸ Apple ID ▸ Subscriptions. Free tier still includes home workouts, barcode nutrition, and limited coach messages per day.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: IronLore.colors.bg,
    padding: 24,
    justifyContent: 'center',
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
  },
  primaryText: { fontSize: 16, fontWeight: '900', color: IronLore.colors.bg },
  secondary: { paddingVertical: 14, alignItems: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '800', color: IronLore.colors.gold },
  note: { fontSize: 11, color: IronLore.colors.muted, marginTop: 24, lineHeight: 16 },
});
