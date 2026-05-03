import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { StatisticsResult } from 'apple-health';
import { useHealthKitStatistics, usePermissions } from 'apple-health/hooks';
import { IronLore } from '@/src/ui/ironloreTokens';

type Props = {
  /** Today's step count for quests / wellness (0 when unavailable). */
  onTodayStepsChange?: (steps: number) => void;
  /** When true, renders with light/clean-mode colors to match the white home card. */
  cleanMode?: boolean;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function singleStat(data: StatisticsResult | StatisticsResult[] | null | undefined): StatisticsResult | null {
  if (!data || Array.isArray(data)) return null;
  return data;
}

const METERS_PER_MILE = 1609.344;

/** Walking + running distance from HealthKit is in meters (`m`); show miles for US-style copy. */
function formatDistanceMiles(stat: StatisticsResult | null): string {
  if (!stat || stat.sumQuantity == null) return '—';
  const u = (stat.unit || '').toLowerCase();
  const q = stat.sumQuantity;
  if (u.includes('mile')) {
    return `${q >= 10 ? q.toFixed(0) : q.toFixed(1)} mi`;
  }
  let meters = q;
  if (u === 'km' || u.includes('kilometer')) meters = q * 1000;
  const mi = meters / METERS_PER_MILE;
  return `${mi >= 10 ? mi.toFixed(0) : mi.toFixed(1)} mi`;
}

export function AppleHealthHomeRow({ onTodayStepsChange, cleanMode }: Props) {
  const isIos = Platform.OS === 'ios';
  const [, requestPermission] = usePermissions({
    read: ['stepCount', 'activeEnergyBurned', 'distanceWalkingRunning', 'flightsClimbed'],
  });

  const [dayRange, setDayRange] = useState(() => ({
    start: startOfToday(),
    end: new Date(),
  }));

  const bumpRange = useCallback(() => {
    setDayRange({ start: startOfToday(), end: new Date() });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') bumpRange();
    });
    return () => sub.remove();
  }, [bumpRange]);

  const skip = !isIos;

  const stepsQ = useHealthKitStatistics({
    type: 'stepCount',
    aggregations: ['cumulativeSum'],
    startDate: dayRange.start,
    endDate: dayRange.end,
    skip,
  });

  const energyQ = useHealthKitStatistics({
    type: 'activeEnergyBurned',
    aggregations: ['cumulativeSum'],
    startDate: dayRange.start,
    endDate: dayRange.end,
    skip,
  });

  const distanceQ = useHealthKitStatistics({
    type: 'distanceWalkingRunning',
    aggregations: ['cumulativeSum'],
    startDate: dayRange.start,
    endDate: dayRange.end,
    skip,
  });

  const flightsQ = useHealthKitStatistics({
    type: 'flightsClimbed',
    aggregations: ['cumulativeSum'],
    startDate: dayRange.start,
    endDate: dayRange.end,
    skip,
  });

  const steps = useMemo(() => {
    const s = singleStat(stepsQ.data);
    return Math.round(s?.sumQuantity ?? 0);
  }, [stepsQ.data]);

  useEffect(() => {
    onTodayStepsChange?.(steps);
  }, [steps, onTodayStepsChange]);

  const energy = singleStat(energyQ.data);
  const distance = singleStat(distanceQ.data);
  const flights = singleStat(flightsQ.data);

  const loading =
    isIos &&
    (stepsQ.isLoading || energyQ.isLoading || distanceQ.isLoading || flightsQ.isLoading);

  const refetchAll = useCallback(async () => {
    bumpRange();
    await Promise.all([stepsQ.refetch(), energyQ.refetch(), distanceQ.refetch(), flightsQ.refetch()]);
  }, [bumpRange, stepsQ, energyQ, distanceQ, flightsQ]);

  async function onPressRow() {
    if (!isIos) return;
    await requestPermission();
    await refetchAll();
  }

  if (!isIos) return null;

  const energyStr =
    energy?.sumQuantity != null ? `${Math.round(energy.sumQuantity)} ${energy.unit || 'kcal'}` : '—';
  const flightsStr = flights?.sumQuantity != null ? `${Math.round(flights.sumQuantity)} flights` : '—';

  return (
    <TouchableOpacity style={[styles.row, cleanMode && stylesClean.row]} onPress={onPressRow} activeOpacity={0.85}>
      <Text style={[styles.label, cleanMode && stylesClean.label]}>Apple Health</Text>
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator color={cleanMode ? IronLore.cleanHome.accent : IronLore.colors.gold} size="small" />
            <Text style={[styles.muted, cleanMode && stylesClean.muted]}>Loading…</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.primary, cleanMode && stylesClean.primary]}>
              {steps.toLocaleString()} steps today
            </Text>
            <Text style={[styles.sub, cleanMode && stylesClean.sub]} numberOfLines={2}>
              Active {energyStr} · {formatDistanceMiles(distance)} · {flightsStr}
            </Text>
            {(stepsQ.error || energyQ.error) && (
              <Text style={[styles.hint, cleanMode && stylesClean.hint]}>Tap to allow access in Health</Text>
            )}
          </>
        )}
      </View>
      <Text style={[styles.chev, cleanMode && stylesClean.chev]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: { fontSize: 12, fontWeight: '900', color: IronLore.colors.text },
  primary: { fontSize: 13, fontWeight: '800', color: IronLore.colors.text },
  sub: { fontSize: 11, color: IronLore.colors.muted, marginTop: 3 },
  muted: { fontSize: 12, color: IronLore.colors.muted },
  hint: { fontSize: 10, color: IronLore.colors.gold, marginTop: 4 },
  chev: { fontSize: 20, color: IronLore.colors.muted },
});

const stylesClean = StyleSheet.create({
  row: {
    backgroundColor: IronLore.cleanHome.surface2,
    borderColor: IronLore.cleanHome.border,
  },
  label: { color: IronLore.cleanHome.text },
  primary: { color: IronLore.cleanHome.text },
  sub: { color: IronLore.cleanHome.muted },
  muted: { color: IronLore.cleanHome.muted },
  hint: { color: IronLore.cleanHome.accent },
  chev: { color: IronLore.cleanHome.subtle },
});
