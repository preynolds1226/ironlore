import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Purchases from 'react-native-purchases';

import { getRevenueCatIosApiKey } from '@/src/config/readExpoExtra';
import { REVENUECAT_ENTITLEMENT_PRO } from '@/src/purchases/constants';
import { usePremium } from '@/src/purchases/PremiumContext';
import { isRevenueCatNativeAvailable } from '@/src/purchases/isRevenueCatNativeAvailable';
import { IronLore } from '@/src/ui/ironloreTokens';

function maskApiKey(key: string): string {
  if (!key) return '(none — set app.json extra.revenueCatIosApiKey or EXPO_PUBLIC_REVENUECAT_IOS_API_KEY)';
  const kind = key.startsWith('appl_') ? 'iOS prod' : key.startsWith('test_') ? 'test' : 'other';
  return `${key.slice(0, 6)}… (${kind}, ${key.length} chars)`;
}

/**
 * Dev-only: RevenueCat / StoreKit wiring (offerings, packages, entitlements). Stripped in production (`__DEV__` false).
 */
export function SubscriptionDebugPanel() {
  const { purchasesConfigured, isPremium, refresh } = usePremium();
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<string[]>([]);

  const runDiag = useCallback(async () => {
    setBusy(true);
    const out: string[] = [];
    try {
      out.push(`API key: ${maskApiKey(getRevenueCatIosApiKey())}`);
      out.push(`Native Purchases module: ${isRevenueCatNativeAvailable() ? 'present' : 'missing (Expo Go?)'}`);
      out.push(`App thinks SDK configured: ${purchasesConfigured ? 'yes' : 'no'}`);
      out.push(`Premium (${REVENUECAT_ENTITLEMENT_PRO}): ${isPremium ? 'yes' : 'no'}`);
      out.push('');

      if (!isRevenueCatNativeAvailable()) {
        out.push('Use: npx expo run:ios or an EAS dev/production build — not Expo Go.');
        setLines(out);
        return;
      }

      let offerings: Awaited<ReturnType<typeof Purchases.getOfferings>>;
      try {
        offerings = await Purchases.getOfferings();
      } catch (e) {
        out.push(`getOfferings failed: ${e instanceof Error ? e.message : String(e)}`);
        out.push('(If configure failed, fix API key / RevenueCat app bundle id first.)');
        setLines(out);
        return;
      }

      const current = offerings.current;
      out.push(`Current offering: ${current?.identifier ?? '— none (set a current offering in RevenueCat)'}`);
      const pkgs = current?.availablePackages ?? [];
      out.push(`Packages on current offering: ${pkgs.length}`);
      pkgs.forEach((p, i) => {
        out.push(`  ${i + 1}. ${p.identifier} → ${p.product.identifier} (${String(p.packageType)})`);
      });
      const other = Object.keys(offerings.all).filter((id) => id !== current?.identifier);
      if (other.length > 0) {
        out.push(`Other offerings defined: ${other.join(', ')}`);
      }

      let customerInfo: Awaited<ReturnType<typeof Purchases.getCustomerInfo>> | null = null;
      try {
        customerInfo = await Purchases.getCustomerInfo();
      } catch (e) {
        out.push(`getCustomerInfo: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (customerInfo) {
        const pro = customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_PRO];
        out.push('');
        out.push(`Entitlement "${REVENUECAT_ENTITLEMENT_PRO}" active: ${pro ? 'yes' : 'no'}`);
        out.push(`originalAppUserId: ${customerInfo.originalAppUserId}`);
      }
    } catch (e) {
      out.push(`Unexpected: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLines(out);
      setBusy(false);
      await refresh();
    }
  }, [purchasesConfigured, isPremium, refresh]);

  if (!__DEV__) return null;
  if (Platform.OS === 'web') return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Subscription diagnostics (dev only)</Text>
      <Text style={styles.hint}>
        Confirms RevenueCat offerings and App Store product IDs. Use a Sandbox Apple ID on device for real purchase flow.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={runDiag} disabled={busy} activeOpacity={0.85}>
        {busy ? (
          <ActivityIndicator color={IronLore.colors.bg} />
        ) : (
          <Text style={styles.btnText}>Load / refresh</Text>
        )}
      </TouchableOpacity>
      {lines.length > 0 ? (
        <Text style={styles.mono} selectable>
          {lines.join('\n')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,200,100,0.35)',
    backgroundColor: 'rgba(255,200,100,0.06)',
  },
  title: { fontSize: 12, fontWeight: '800', color: IronLore.colors.gold, marginBottom: 6 },
  hint: { fontSize: 11, color: IronLore.colors.muted, lineHeight: 16, marginBottom: 10 },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: IronLore.colors.muted,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  btnText: { fontSize: 12, fontWeight: '800', color: IronLore.colors.bg },
  mono: {
    marginTop: 12,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    color: IronLore.colors.text,
  },
});
