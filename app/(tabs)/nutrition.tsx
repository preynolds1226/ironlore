import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Keyboard
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const GOALS = { calories: 1800, protein: 200, carbs: 150, fat: 60 };

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

type FoodItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
};

type LoggedItem = FoodItem & { meal: string; qty: number };

const QUICK_ADDS: FoodItem[] = [
  { id: 'q1', name: 'Chicken Breast (4oz)', calories: 185, protein: 35, carbs: 0, fat: 4, serving: '4oz' },
  { id: 'q2', name: 'Whey Protein Shake', calories: 120, protein: 24, carbs: 3, fat: 2, serving: '1 scoop' },
  { id: 'q3', name: 'Eggs (2 large)', calories: 140, protein: 12, carbs: 1, fat: 10, serving: '2 eggs' },
  { id: 'q4', name: 'Greek Yogurt (1 cup)', calories: 130, protein: 17, carbs: 9, fat: 4, serving: '1 cup' },
  { id: 'q5', name: 'White Rice (1 cup)', calories: 206, protein: 4, carbs: 45, fat: 0, serving: '1 cup' },
  { id: 'q6', name: 'Ground Beef (4oz)', calories: 290, protein: 26, carbs: 0, fat: 20, serving: '4oz' },
];

function MacroRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(pct, 1) * circ;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute' }}>
        <Text style={{ fontSize: size * 0.22, fontWeight: '700', color: '#e8e8f0', textAlign: 'center' }}>
          {Math.round(pct * 100)}%
        </Text>
      </View>
    </View>
  );
}

export default function NutritionScreen({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<'log' | 'search'>('log');
  const [activeMeal, setActiveMeal] = useState('Breakfast');
  const [logged, setLogged] = useState<LoggedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<any>(null);

  const totals = logged.reduce((acc, item) => ({
    calories: acc.calories + item.calories * item.qty,
    protein: acc.protein + item.protein * item.qty,
    carbs: acc.carbs + item.carbs * item.qty,
    fat: acc.fat + item.fat * item.qty,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  async function searchFood(query: string) {
    if (!query.trim() || query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`
      );
      const data = await res.json();
      const results: FoodItem[] = (data.products || [])
        .filter((p: any) => p.product_name_en || p.product_name)
        .slice(0, 8)
        .map((p: any) => ({
          id: p.id || p.code,
          name: p.product_name_en || p.product_name,
          calories: Math.round(p.nutriments?.['energy-kcal_100g'] || p.nutriments?.['energy-kcal'] || 0),
          protein: Math.round(p.nutriments?.proteins_100g || 0),
          carbs: Math.round(p.nutriments?.carbohydrates_100g || 0),
          fat: Math.round(p.nutriments?.fat_100g || 0),
          serving: '100g',
        }));
      setSearchResults(results);
    } catch {
      setSearchResults(QUICK_ADDS);
    }
    setSearching(false);
  }

  function handleSearchInput(text: string) {
    setSearchQuery(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchFood(text), 600);
  }

  function addFood(food: FoodItem) {
    setLogged(prev => [...prev, { ...food, meal: activeMeal, qty: 1 }]);
    setView('log');
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  }

  function removeFood(idx: number) {
    setLogged(prev => prev.filter((_, i) => i !== idx));
  }

  const remainingCalories = GOALS.calories - totals.calories;
  const remainingProtein = GOALS.protein - totals.protein;

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={s.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>NUTRITION</Text>
        <View style={{ width: 60 }} />
      </View>

      {view === 'log' ? (
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Summary Card */}
          <View style={s.summaryCard}>
            <View style={s.calorieRow}>
              <View>
                <Text style={s.calorieMain}>{Math.round(totals.calories)}</Text>
                <Text style={s.calorieLabel}>of {GOALS.calories} kcal</Text>
              </View>
              <View style={s.calorieRight}>
                <Text style={[s.remaining, { color: remainingCalories < 0 ? '#ef4444' : '#4cc97a' }]}>
                  {remainingCalories < 0 ? `${Math.abs(Math.round(remainingCalories))} over` : `${Math.round(remainingCalories)} left`}
                </Text>
                <Text style={s.remainingLabel}>calories</Text>
              </View>
            </View>

            {/* Calorie bar */}
            <View style={s.calorieBar}>
              <View style={[s.calorieBarFill, {
                width: `${Math.min((totals.calories / GOALS.calories) * 100, 100)}%` as any,
                backgroundColor: totals.calories > GOALS.calories ? '#ef4444' : '#c9a84c'
              }]} />
            </View>

            {/* Macro row */}
            <View style={s.macroSummaryRow}>
              {[
                { name: 'Protein', val: totals.protein, goal: GOALS.protein, color: '#c94c4c', unit: 'g' },
                { name: 'Carbs', val: totals.carbs, goal: GOALS.carbs, color: '#c9a84c', unit: 'g' },
                { name: 'Fat', val: totals.fat, goal: GOALS.fat, color: '#4cc97a', unit: 'g' },
              ].map(macro => (
                <View key={macro.name} style={s.macroSummary}>
                  <Text style={[s.macroSummaryVal, { color: macro.color }]}>
                    {Math.round(macro.val)}g
                  </Text>
                  <Text style={s.macroSummaryGoal}>/ {macro.goal}g</Text>
                  <View style={s.macroMiniBar}>
                    <View style={[s.macroMiniBarFill, {
                      width: `${Math.min((macro.val / macro.goal) * 100, 100)}%` as any,
                      backgroundColor: macro.color
                    }]} />
                  </View>
                  <Text style={s.macroSummaryName}>{macro.name}</Text>
                </View>
              ))}
            </View>

            {/* Protein callout */}
            <View style={[s.proteinCallout, { borderColor: remainingProtein <= 0 ? 'rgba(76,201,122,0.4)' : 'rgba(201,76,76,0.3)' }]}>
              <Text style={s.proteinCalloutText}>
                {remainingProtein <= 0
                  ? `✅ Protein goal crushed! +${Math.abs(Math.round(remainingProtein))}g over`
                  : `🥩 ${Math.round(remainingProtein)}g protein remaining to hit your goal`}
              </Text>
            </View>
          </View>

          {/* Meal selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.mealSelector}>
            {MEALS.map(meal => (
              <TouchableOpacity
                key={meal}
                style={[s.mealTab, activeMeal === meal && s.mealTabActive]}
                onPress={() => setActiveMeal(meal)}
              >
                <Text style={[s.mealTabText, activeMeal === meal && s.mealTabTextActive]}>{meal}</Text>
                <Text style={s.mealTabCount}>
                  {logged.filter(i => i.meal === meal).length > 0
                    ? `${logged.filter(i => i.meal === meal).reduce((a, i) => a + i.calories * i.qty, 0)} kcal`
                    : '—'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Add food button */}
          <TouchableOpacity style={s.addFoodBtn} onPress={() => setView('search')}>
            <Text style={s.addFoodText}>+ Add Food to {activeMeal}</Text>
          </TouchableOpacity>

          {/* Logged items for active meal */}
          <View style={s.loggedSection}>
            {logged.filter(item => item.meal === activeMeal).length === 0 ? (
              <View style={s.emptyMeal}>
                <Text style={s.emptyMealText}>Nothing logged yet</Text>
                <Text style={s.emptyMealSub}>Tap + Add Food to log your {activeMeal.toLowerCase()}</Text>
              </View>
            ) : (
              logged.map((item, idx) => item.meal !== activeMeal ? null : (
                <View key={idx} style={s.loggedItem}>
                  <View style={s.loggedItemLeft}>
                    <Text style={s.loggedItemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.loggedItemMacros}>
                      {Math.round(item.protein * item.qty)}g P · {Math.round(item.carbs * item.qty)}g C · {Math.round(item.fat * item.qty)}g F
                    </Text>
                  </View>
                  <View style={s.loggedItemRight}>
                    <Text style={s.loggedItemCal}>{Math.round(item.calories * item.qty)} kcal</Text>
                    <TouchableOpacity onPress={() => removeFood(idx)}>
                      <Text style={s.removeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        // Search View
        <View style={{ flex: 1 }}>
          <View style={s.searchBar}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              value={searchQuery}
              onChangeText={handleSearchInput}
              placeholder="Search foods..."
              placeholderTextColor="#444"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Text style={s.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={s.cancelSearch} onPress={() => { setView('log'); setSearchQuery(''); setSearchResults([]); }}>
            <Text style={s.cancelSearchText}>Cancel</Text>
          </TouchableOpacity>

          <ScrollView keyboardShouldPersistTaps="handled">
            {/* Quick adds */}
            {searchQuery.length === 0 && (
              <View>
                <Text style={s.quickAddLabel}>QUICK ADD</Text>
                {QUICK_ADDS.map(food => (
                  <TouchableOpacity key={food.id} style={s.foodResult} onPress={() => addFood(food)}>
                    <View style={s.foodResultLeft}>
                      <Text style={s.foodResultName}>{food.name}</Text>
                      <Text style={s.foodResultMacros}>{food.protein}g P · {food.carbs}g C · {food.fat}g F · {food.serving}</Text>
                    </View>
                    <View style={s.foodResultRight}>
                      <Text style={s.foodResultCal}>{food.calories}</Text>
                      <Text style={s.foodResultCalLabel}>kcal</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Search results */}
            {searching && (
              <View style={s.loadingWrap}>
                <ActivityIndicator color="#c9a84c" />
                <Text style={s.loadingText}>Searching...</Text>
              </View>
            )}

            {!searching && searchResults.length > 0 && (
              <View>
                <Text style={s.quickAddLabel}>RESULTS</Text>
                {searchResults.map(food => (
                  <TouchableOpacity key={food.id} style={s.foodResult} onPress={() => addFood(food)}>
                    <View style={s.foodResultLeft}>
                      <Text style={s.foodResultName} numberOfLines={2}>{food.name}</Text>
                      <Text style={s.foodResultMacros}>{food.protein}g P · {food.carbs}g C · {food.fat}g F · {food.serving}</Text>
                    </View>
                    <View style={s.foodResultRight}>
                      <Text style={s.foodResultCal}>{food.calories}</Text>
                      <Text style={s.foodResultCalLabel}>kcal</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!searching && searchQuery.length > 1 && searchResults.length === 0 && (
              <View style={s.loadingWrap}>
                <Text style={s.loadingText}>No results found</Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: '#c9a84c', letterSpacing: 4 },
  backBtn: { fontSize: 14, color: '#888899' },

  // Summary
  summaryCard: { marginHorizontal: 16, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 20, padding: 18, marginBottom: 12 },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  calorieMain: { fontSize: 40, fontWeight: '900', color: '#e8e8f0' },
  calorieLabel: { fontSize: 12, color: '#888899', marginTop: 2 },
  calorieRight: { alignItems: 'flex-end' },
  remaining: { fontSize: 18, fontWeight: '700' },
  remainingLabel: { fontSize: 11, color: '#888899', marginTop: 2 },
  calorieBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  calorieBarFill: { height: '100%', borderRadius: 4 },

  macroSummaryRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  macroSummary: { flex: 1, alignItems: 'center' },
  macroSummaryVal: { fontSize: 18, fontWeight: '700' },
  macroSummaryGoal: { fontSize: 10, color: '#888899', marginBottom: 4 },
  macroMiniBar: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  macroMiniBarFill: { height: '100%', borderRadius: 2 },
  macroSummaryName: { fontSize: 10, color: '#888899', textTransform: 'uppercase', letterSpacing: 0.5 },

  proteinCallout: { backgroundColor: 'rgba(201,76,76,0.06)', borderWidth: 1, borderRadius: 10, padding: 10 },
  proteinCalloutText: { fontSize: 12, color: '#e8e8f0', textAlign: 'center' },

  // Meal tabs
  mealSelector: { paddingHorizontal: 16, marginBottom: 12 },
  mealTab: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 12, alignItems: 'center' },
  mealTabActive: { borderColor: 'rgba(201,168,76,0.4)', backgroundColor: 'rgba(201,168,76,0.08)' },
  mealTabText: { fontSize: 13, fontWeight: '600', color: '#888899' },
  mealTabTextActive: { color: '#c9a84c' },
  mealTabCount: { fontSize: 10, color: '#444', marginTop: 2 },

  addFoodBtn: { marginHorizontal: 16, marginBottom: 12, padding: 14, backgroundColor: 'rgba(201,168,76,0.1)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)', borderRadius: 12, alignItems: 'center' },
  addFoodText: { fontSize: 14, fontWeight: '600', color: '#c9a84c' },

  loggedSection: { paddingHorizontal: 16 },
  emptyMeal: { padding: 32, alignItems: 'center' },
  emptyMealText: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 4 },
  emptyMealSub: { fontSize: 12, color: '#333', textAlign: 'center' },

  loggedItem: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  loggedItemLeft: { flex: 1, marginRight: 8 },
  loggedItemName: { fontSize: 13, fontWeight: '600', color: '#e8e8f0', marginBottom: 2 },
  loggedItemMacros: { fontSize: 11, color: '#888899' },
  loggedItemRight: { alignItems: 'flex-end', gap: 4 },
  loggedItemCal: { fontSize: 14, fontWeight: '700', color: '#c9a84c' },
  removeBtn: { fontSize: 12, color: '#444' },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 12, paddingHorizontal: 12 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, padding: 12, fontSize: 15, color: '#e8e8f0' },
  clearSearch: { fontSize: 14, color: '#444', padding: 4 },
  cancelSearch: { paddingHorizontal: 16, paddingBottom: 8 },
  cancelSearchText: { fontSize: 13, color: '#888899' },

  quickAddLabel: { fontSize: 10, fontWeight: '600', color: '#444', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 16, paddingVertical: 8 },
  foodResult: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a2a' },
  foodResultLeft: { flex: 1, marginRight: 12 },
  foodResultName: { fontSize: 13, fontWeight: '600', color: '#e8e8f0', marginBottom: 2 },
  foodResultMacros: { fontSize: 11, color: '#888899' },
  foodResultRight: { alignItems: 'center' },
  foodResultCal: { fontSize: 16, fontWeight: '700', color: '#c9a84c' },
  foodResultCalLabel: { fontSize: 10, color: '#888899' },

  loadingWrap: { padding: 32, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: '#444' },
});
