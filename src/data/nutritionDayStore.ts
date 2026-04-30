import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_PREFIX = 'ironlore:nutritionLog:v1:';
const DAY_SUMMARY_PREFIX = 'ironlore:nutritionDay:';

export type LoggedFoodItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving?: string;
  meal: string;
  qty: number;
};

export type NutritionGoals = { calories: number; protein: number; carbs: number; fat: number };

function logKey(date: string) {
  return `${LOG_PREFIX}${date}`;
}

export function totalsFromItems(items: LoggedFoodItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories * item.qty,
      protein: acc.protein + item.protein * item.qty,
      carbs: acc.carbs + item.carbs * item.qty,
      fat: acc.fat + item.fat * item.qty,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

async function persistDaySummary(
  date: string,
  nextTotals: { calories: number; protein: number; carbs: number; fat: number },
  goals: NutritionGoals,
) {
  const key = `${DAY_SUMMARY_PREFIX}${date}`;
  const hitProteinGoal = nextTotals.protein >= goals.protein;
  const hitCaloriesTarget =
    goals.calories > 0 ? Math.abs(nextTotals.calories - goals.calories) / goals.calories <= 0.1 : false;
  await AsyncStorage.setItem(
    key,
    JSON.stringify({
      date,
      totals: {
        calories: Math.round(nextTotals.calories),
        protein: Math.round(nextTotals.protein),
        carbs: Math.round(nextTotals.carbs),
        fat: Math.round(nextTotals.fat),
      },
      hitProteinGoal,
      hitCaloriesTarget,
    }),
  );
}

export async function loadNutritionDay(date: string): Promise<LoggedFoodItem[]> {
  const raw = await AsyncStorage.getItem(logKey(date));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { items?: LoggedFoodItem[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export async function saveNutritionDay(date: string, items: LoggedFoodItem[], goals: NutritionGoals): Promise<void> {
  await AsyncStorage.setItem(logKey(date), JSON.stringify({ items }));
  const nextTotals = totalsFromItems(items);
  await persistDaySummary(date, nextTotals, goals);
}

export type FoodAppendInput = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  qty?: number;
  serving?: string;
};

export async function appendNutritionItems(
  date: string,
  meal: string,
  inputs: FoodAppendInput[],
  goals: NutritionGoals,
): Promise<LoggedFoodItem[]> {
  const existing = await loadNutritionDay(date);
  const now = Date.now();
  const additions: LoggedFoodItem[] = inputs.map((f, i) => ({
    id: `coach_${now}_${i}`,
    name: f.name.trim(),
    calories: Math.max(0, Math.round(f.calories)),
    protein: Math.max(0, Math.round(f.protein)),
    carbs: Math.max(0, Math.round(f.carbs)),
    fat: Math.max(0, Math.round(f.fat)),
    serving: f.serving?.trim() || '1 serving',
    meal: meal.trim() || 'Lunch',
    qty: typeof f.qty === 'number' && f.qty > 0 ? f.qty : 1,
  }));
  const merged = [...existing, ...additions];
  await saveNutritionDay(date, merged, goals);
  return merged;
}
