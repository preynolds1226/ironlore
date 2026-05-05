import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PaywallPanel } from '@/src/purchases/PaywallPanel';
import { usePremium } from '@/src/purchases/PremiumContext';
import { IronLore } from '@/src/ui/ironloreTokens';

const PRESS_SCALE = 0.97;

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

export function IronLorePlusPaywallModal({ visible, onDismiss }: Props) {
  const { purchaseDefault, restore, refresh, isPremium, purchasesConfigured } = usePremium();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible && isPremium) {
      onDismiss();
    }
  }, [visible, isPremium, onDismiss]);

  async function handleSubscribe() {
    setBusy(true);
    try {
      const ok = await purchaseDefault();
      if (ok) onDismiss();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    setBusy(true);
    try {
      const ok = await restore();
      if (ok) onDismiss();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function onPressInClose() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close paywall" />
        <View style={styles.center} pointerEvents="box-none">
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Pressable
                hitSlop={12}
                onPress={onDismiss}
                onPressIn={onPressInClose}
                style={({ pressed }) => [
                  styles.closeBtn,
                  { transform: [{ scale: pressed ? PRESS_SCALE : 1 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
              {!purchasesConfigured ? (
                <View style={styles.configureHint}>
                  <Text style={styles.configureTitle}>IronLore+</Text>
                  <Text style={styles.configureBody}>
                    Subscriptions are not configured in this build. Use a production dev client with RevenueCat keys from app.json / EXPO_PUBLIC_REVENUECAT_IOS_API_KEY.
                  </Text>
                  <Pressable
                    onPress={onDismiss}
                    onPressIn={onPressInClose}
                    style={({ pressed }) => [
                      styles.configureOk,
                      pressed && { opacity: 0.9, transform: [{ scale: pressed ? PRESS_SCALE : 1 }] },
                    ]}
                  >
                    <Text style={styles.configureOkText}>OK</Text>
                  </Pressable>
                </View>
              ) : (
                <PaywallPanel busy={busy} onSubscribe={handleSubscribe} onRestore={handleRestore} />
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  center: {
    maxWidth: '92%',
    width: '100%',
    maxHeight: '88%',
    zIndex: 1,
  },
  scroll: {
    maxHeight: '100%',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  card: {
    backgroundColor: IronLore.colors.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: IronLore.colors.border,
    paddingTop: 44,
    paddingHorizontal: 20,
    paddingBottom: 24,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  closeText: {
    fontSize: 18,
    color: IronLore.colors.muted,
    fontWeight: '700',
  },
  configureHint: {
    paddingVertical: 8,
    gap: 12,
  },
  configureTitle: {
    ...IronLore.type.title,
    fontSize: 20,
    color: IronLore.colors.gold,
  },
  configureBody: {
    ...IronLore.type.body,
    color: IronLore.colors.muted,
    lineHeight: 20,
  },
  configureOk: {
    alignSelf: 'flex-start',
    backgroundColor: IronLore.colors.gold,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  configureOkText: {
    fontSize: 15,
    fontWeight: '800',
    color: IronLore.colors.bg,
  },
});
