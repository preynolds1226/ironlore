import AsyncStorage from '@react-native-async-storage/async-storage';

import { FREE_COACH_MESSAGES_PER_DAY } from '@/src/purchases/constants';

export { FREE_COACH_MESSAGES_PER_DAY };

const PREFIX = 'ironlore:coachMsgs:v1:';

function dayKey() {
  return new Date().toISOString().split('T')[0];
}

function storageKey() {
  return `${PREFIX}${dayKey()}`;
}

export async function getCoachMessagesUsedToday(): Promise<number> {
  const raw = await AsyncStorage.getItem(storageKey());
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function incrementCoachMessageSuccess(): Promise<number> {
  const next = (await getCoachMessagesUsedToday()) + 1;
  await AsyncStorage.setItem(storageKey(), String(next));
  return next;
}

export function freeCoachMessagesRemaining(used: number): number {
  return Math.max(0, FREE_COACH_MESSAGES_PER_DAY - used);
}
