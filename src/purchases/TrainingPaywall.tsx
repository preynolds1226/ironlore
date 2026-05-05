import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { PaywallPanel } from '@/src/purchases/PaywallPanel';
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
      <PaywallPanel busy={busy} onSubscribe={onSubscribe} onRestore={onRestore} />
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
