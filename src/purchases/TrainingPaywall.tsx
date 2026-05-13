import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { PaywallPanel } from '@/src/purchases/PaywallPanel';
import { usePremium } from '@/src/purchases/PremiumContext';
import { IronLore } from '@/src/ui/ironloreTokens';

type Props = {
  busy: boolean;
  onSubscribe: () => void;
  onRestore: () => void;
};

export function TrainingPaywall({ busy, onSubscribe, onRestore }: Props) {
  const { monthlyPriceString } = usePremium();
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <PaywallPanel busy={busy} onSubscribe={onSubscribe} onRestore={onRestore} priceString={monthlyPriceString} />
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
});
