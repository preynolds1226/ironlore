import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { usePremium } from '@/src/purchases/PremiumContext';
import { isRevenueCatNativeAvailable } from '@/src/purchases/isRevenueCatNativeAvailable';
import { IronLore } from '@/src/ui/ironloreTokens';

/**
 * Profile → Settings: subscribe / restore and status (native). Web = informational only.
 */
export function SettingsSubscriptionCard() {
  const { isPremium, loading, purchasesConfigured, purchaseDefault, restore, refresh } = usePremium();
  const [busy, setBusy] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>IronLore+</Text>
        <Text style={styles.muted}>Subscriptions run in the iOS/Android app (not on web).</Text>
      </View>
    );
  }

  if (!isRevenueCatNativeAvailable()) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>IronLore+</Text>
        <Text style={styles.muted}>
          Subscriptions need a native build with RevenueCat linked. Expo Go does not include it. From the project folder run: npx expo run:ios (or eas build), then open that app — not “Expo Go”.
        </Text>
      </View>
    );
  }

  if (!purchasesConfigured) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>IronLore+</Text>
        <Text style={styles.muted}>
          Add your public iOS SDK key from RevenueCat (appl_… or test_…): set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY in .env
          and/or app.json extra.revenueCatIosApiKey. Restart Metro with --clear, then rebuild (npx expo run:ios or eas build).
          Match products and a current Offering in RevenueCat to your App Store Connect subscription IDs.
        </Text>
        {__DEV__ ? (
          <Text style={[styles.muted, { marginTop: 8 }]}>
            Development: use Subscription diagnostics below — Metro also logs configure errors.
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>IronLore+</Text>
      <Text style={[styles.status, isPremium && { color: IronLore.colors.green }]}>
        {loading ? 'Checking subscription…' : isPremium ? 'Subscribed' : 'Not subscribed'}
      </Text>
      <Text style={styles.muted}>Unlimited AI coach, meal photo estimates, and cloud training templates.</Text>
      <Text style={[styles.muted, { marginTop: 10, fontSize: 11 }]}>
        Payment is charged to your Apple ID. Manage or cancel anytime in the Settings app under Apple ID ▸ Subscriptions.
      </Text>
      <View style={{ gap: 10, marginTop: 12 }}>
        {!isPremium && (
          <TouchableOpacity
            style={styles.primaryBtn}
            disabled={busy || loading}
            activeOpacity={0.85}
            onPress={async () => {
              setBusy(true);
              try {
                await purchaseDefault();
                await refresh();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? (
              <ActivityIndicator color={IronLore.colors.bg} />
            ) : (
              <Text style={styles.primaryText}>Subscribe</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.secondaryBtn}
          disabled={busy}
          activeOpacity={0.85}
          onPress={async () => {
            setBusy(true);
            try {
              await restore();
              await refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          <Text style={styles.secondaryText}>Restore purchases</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: IronLore.colors.panel,
    borderWidth: 1,
    borderColor: IronLore.colors.border,
    borderRadius: 14,
    padding: 16,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: IronLore.colors.text, marginBottom: 8 },
  status: { fontSize: 13, fontWeight: '800', color: IronLore.colors.muted, marginBottom: 8 },
  muted: { fontSize: 12, color: IronLore.colors.muted, lineHeight: 18 },
  primaryBtn: {
    backgroundColor: IronLore.colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { fontSize: 15, fontWeight: '900', color: IronLore.colors.bg },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '800', color: IronLore.colors.gold },
});
