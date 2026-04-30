import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Linking, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { IronLore } from '@/src/ui/ironloreTokens';
import { loadNutritionDay, saveNutritionDay, type LoggedFoodItem } from '@/src/data/nutritionDayStore';

function ManualFoodEntry(props: { onAdd: (food: any) => void; s: any }) {
  const { onAdd, s } = props;
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  function handleAdd() {
    if (!name.trim()) return;
    onAdd({
      id: `manual_${Date.now()}`,
      name: name.trim(),
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      serving: '1 serving',
    });
  }

  return (
    <View style={{ gap: 8 }}>
      <TextInput style={s.modalInput} value={name} onChangeText={setName} placeholder="Food name" placeholderTextColor="#444" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput style={[s.modalInput, { flex: 1 }]} value={calories} onChangeText={setCalories} placeholder="Calories" placeholderTextColor="#444" keyboardType="numeric" />
        <TextInput style={[s.modalInput, { flex: 1 }]} value={protein} onChangeText={setProtein} placeholder="Protein g" placeholderTextColor="#444" keyboardType="numeric" />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput style={[s.modalInput, { flex: 1 }]} value={carbs} onChangeText={setCarbs} placeholder="Carbs g" placeholderTextColor="#444" keyboardType="numeric" />
        <TextInput style={[s.modalInput, { flex: 1 }]} value={fat} onChangeText={setFat} placeholder="Fat g" placeholderTextColor="#444" keyboardType="numeric" />
      </View>
      <TouchableOpacity style={s.modalSave} onPress={handleAdd}>
        <Text style={s.modalSaveText}>Add Food</Text>
      </TouchableOpacity>
    </View>
  );
}

export function NutritionScreen(props: {
  onBack: () => void;
  onProteinUpdate?: (protein: number) => void;
  onTotalsUpdate?: (totals: { calories: number; protein: number; carbs: number; fat: number }) => void;
  goals: { calories: number; protein: number; carbs: number; fat: number };
  meals: string[];
  quickFoods: any[];
  s: any;
}) {
  const { onBack, onProteinUpdate, onTotalsUpdate, goals, meals, quickFoods, s } = props;

  const [nutView, setNutView] = useState<'log' | 'search' | 'scan'>('log');
  const [activeMeal, setActiveMeal] = useState('Breakfast');
  const [logged, setLogged] = useState<LoggedFoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraPermissionSheet, setCameraPermissionSheet] = useState(false);
  const searchTimer = useRef<any>(null);

  const totals = logged.reduce((acc, item) => ({
    calories: acc.calories + item.calories * item.qty,
    protein: acc.protein + item.protein * item.qty,
    carbs: acc.carbs + item.carbs * item.qty,
    fat: acc.fat + item.fat * item.qty,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  function todayKey() {
    return new Date().toISOString().split('T')[0];
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const items = await loadNutritionDay(todayKey());
      if (!cancelled) setLogged(items);
    })();
    return () => { cancelled = true; };
  }, []);

  async function persistLogged(updated: LoggedFoodItem[]) {
    await saveNutritionDay(todayKey(), updated, goals);
  }

  async function searchFood(query: string) {
    if (!query.trim() || query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`);
      const data = await res.json();
      const results = (data.products || []).filter((p: any) => p.product_name_en || p.product_name).slice(0, 8).map((p: any) => ({
        id: p.id || p.code,
        name: p.product_name_en || p.product_name,
        calories: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
        protein: Math.round(p.nutriments?.proteins_100g || 0),
        carbs: Math.round(p.nutriments?.carbohydrates_100g || 0),
        fat: Math.round(p.nutriments?.fat_100g || 0),
        serving: '100g',
      }));
      setSearchResults(results);
    } catch { setSearchResults([]); }
    setSearching(false);
  }

  function handleSearchInput(text: string) {
    setSearchQuery(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchFood(text), 600);
  }

  async function handleBarcodeScan({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    setNutView('search');
    setSearching(true);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data}?fields=product_name,nutriments,serving_size`);
      const json = await res.json();
      if (json.status === 1 && json.product) {
        const p = json.product;
        const hasServing = p.nutriments?.['energy-kcal_serving'] > 0;
        const food = {
          id: data,
          name: p.product_name || 'Unknown Product',
          calories: Math.round(hasServing ? p.nutriments?.['energy-kcal_serving'] : (p.nutriments?.['energy-kcal_100g'] * (parseFloat(p.serving_quantity) || 30) / 100)),
          protein: Math.round(hasServing ? p.nutriments?.proteins_serving : (p.nutriments?.proteins_100g * (parseFloat(p.serving_quantity) || 30) / 100)),
          carbs: Math.round(hasServing ? p.nutriments?.carbohydrates_serving : (p.nutriments?.carbohydrates_100g * (parseFloat(p.serving_quantity) || 30) / 100)),
          fat: Math.round(hasServing ? p.nutriments?.fat_serving : (p.nutriments?.fat_100g * (parseFloat(p.serving_quantity) || 30) / 100)),
          serving: p.serving_size || '1 serving',
        };
        setSearchResults([food]);
      } else {
        setSearchResults([]);
        setSearchQuery(data);
        await searchFood(data);
      }
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }

  async function openScanner() {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) { setCameraPermissionSheet(true); return; }
    }
    setNutView('scan');
  }

  function addFood(food: any) {
    const updated: LoggedFoodItem[] = [...logged, { ...food, meal: activeMeal, qty: 1 }];
    setLogged(updated);
    const nextTotals = updated.reduce((acc, item) => ({
      calories: acc.calories + item.calories * item.qty,
      protein: acc.protein + item.protein * item.qty,
      carbs: acc.carbs + item.carbs * item.qty,
      fat: acc.fat + item.fat * item.qty,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    onProteinUpdate?.(nextTotals.protein);
    onTotalsUpdate?.(nextTotals);
    persistLogged(updated).catch(() => {});
    setNutView('log');
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  }

  function removeFood(idx: number) {
    const updated = logged.filter((_, i) => i !== idx);
    setLogged(updated);
    const nextTotals = updated.reduce((acc, item) => ({
      calories: acc.calories + item.calories * item.qty,
      protein: acc.protein + item.protein * item.qty,
      carbs: acc.carbs + item.carbs * item.qty,
      fat: acc.fat + item.fat * item.qty,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    onProteinUpdate?.(nextTotals.protein);
    onTotalsUpdate?.(nextTotals);
    persistLogged(updated).catch(() => {});
  }

  const remainingProtein = goals.protein - totals.protein;

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={s.screenTitle}>NUTRITION</Text>
        <View style={{ width: 60 }} />
      </View>

      <Modal visible={cameraPermissionSheet} transparent animationType="fade" onRequestClose={() => setCameraPermissionSheet(false)}>
        <View style={perm.overlay}>
          <View style={perm.sheet}>
            <Text style={perm.title}>CAMERA REQUIRED</Text>
            <Text style={perm.body}>
              To scan barcodes, IronLore needs access to your camera. You can still log food manually if you prefer.
            </Text>
            <View style={perm.row}>
              <TouchableOpacity style={perm.secondaryBtn} onPress={() => { setCameraPermissionSheet(false); }}>
                <Text style={perm.secondaryText}>Not now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={perm.primaryBtn}
                onPress={async () => {
                  setCameraPermissionSheet(false);
                  await Linking.openSettings();
                }}
              >
                <Text style={perm.primaryText}>Open Settings</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={perm.tryAgain}
              onPress={async () => {
                const { granted } = await requestCameraPermission();
                if (granted) { setCameraPermissionSheet(false); setNutView('scan'); }
                else { setCameraPermissionSheet(true); }
              }}
            >
              <Text style={perm.tryAgainText}>Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {nutView === 'log' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.summaryCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View>
                <Text style={{ fontSize: 40, fontWeight: '900', color: '#e8e8f0' }}>{Math.round(totals.calories)}</Text>
                <Text style={{ fontSize: 12, color: '#888899', marginTop: 2 }}>of {goals.calories} kcal</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: totals.calories > goals.calories ? '#ef4444' : '#4cc97a' }}>
                  {totals.calories > goals.calories ? `${Math.round(totals.calories - goals.calories)} over` : `${Math.round(goals.calories - totals.calories)} left`}
                </Text>
                <Text style={{ fontSize: 11, color: '#888899', marginTop: 2 }}>calories</Text>
              </View>
            </View>
            <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
              <View style={{ height: '100%', borderRadius: 4, backgroundColor: totals.calories > goals.calories ? '#ef4444' : '#c9a84c', width: `${Math.min((totals.calories / goals.calories) * 100, 100)}%` as any }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {[
                { name: 'Protein', val: totals.protein, goal: goals.protein, color: '#c94c4c' },
                { name: 'Carbs', val: totals.carbs, goal: goals.carbs, color: '#c9a84c' },
                { name: 'Fat', val: totals.fat, goal: goals.fat, color: '#4cc97a' },
              ].map(macro => (
                <View key={macro.name} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: macro.color }}>{Math.round(macro.val)}g</Text>
                  <Text style={{ fontSize: 10, color: '#888899', marginBottom: 4 }}>/ {macro.goal}g</Text>
                  <View style={{ width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                    <View style={{ height: '100%', borderRadius: 2, backgroundColor: macro.color, width: `${Math.min((macro.val / macro.goal) * 100, 100)}%` as any }} />
                  </View>
                  <Text style={{ fontSize: 10, color: '#888899', textTransform: 'uppercase', letterSpacing: 0.5 }}>{macro.name}</Text>
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: 'rgba(201,76,76,0.06)', borderWidth: 1, borderColor: remainingProtein <= 0 ? 'rgba(76,201,122,0.4)' : 'rgba(201,76,76,0.3)', borderRadius: 10, padding: 10 }}>
              <Text style={{ fontSize: 12, color: '#e8e8f0', textAlign: 'center' }}>
                {remainingProtein <= 0 ? `✅ Protein goal crushed! +${Math.abs(Math.round(remainingProtein))}g over` : `🥩 ${Math.round(remainingProtein)}g protein remaining`}
              </Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            {meals.map(meal => (
              <TouchableOpacity key={meal} style={[s.mealTab, activeMeal === meal && s.mealTabActive]} onPress={() => setActiveMeal(meal)}>
                <Text style={[s.mealTabText, activeMeal === meal && s.mealTabTextActive]}>{meal}</Text>
                <Text style={{ fontSize: 10, color: '#444', marginTop: 2 }}>
                  {logged.filter(i => i.meal === meal).length > 0 ? `${Math.round(logged.filter(i => i.meal === meal).reduce((a, i) => a + i.calories * i.qty, 0))} kcal` : '—'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 }}>
            <TouchableOpacity style={[s.addFoodBtn, { flex: 1, marginBottom: 0 }]} onPress={() => setNutView('search')}>
              <Text style={s.addFoodText}>+ Add Food</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.addFoodBtn, { marginBottom: 0, paddingHorizontal: 16, backgroundColor: 'rgba(201,168,76,0.15)' }]} onPress={openScanner}>
              <Text style={s.addFoodText}>📷 Scan</Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 16 }}>
            {logged.filter(item => item.meal === activeMeal).length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 4 }}>Nothing logged yet</Text>
                <Text style={{ fontSize: 12, color: '#333', textAlign: 'center' }}>Tap + Add Food to log your {activeMeal.toLowerCase()}</Text>
              </View>
            ) : (
              logged.map((item, idx) => item.meal !== activeMeal ? null : (
                <View key={idx} style={s.loggedItem}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#e8e8f0', marginBottom: 2 }} numberOfLines={1}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: '#888899' }}>{Math.round(item.protein * item.qty)}g P · {Math.round(item.carbs * item.qty)}g C · {Math.round(item.fat * item.qty)}g F</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#c9a84c' }}>{Math.round(item.calories * item.qty)} kcal</Text>
                    <TouchableOpacity onPress={() => removeFood(idx)}><Text style={{ fontSize: 12, color: '#444' }}>✕</Text></TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : nutView === 'scan' ? (
        <View style={{ flex: 1 }}>
          <CameraView style={{ flex: 1 }} facing="back" onBarcodeScanned={handleBarcodeScan}>
            <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: 260, height: 160, borderWidth: 2, borderColor: '#c9a84c', borderRadius: 12, backgroundColor: 'transparent' }} />
              <Text style={{ color: '#c9a84c', marginTop: 16, fontSize: 13, fontWeight: '600' }}>Point at a barcode</Text>
            </View>
          </CameraView>
          <TouchableOpacity style={{ padding: 20, backgroundColor: '#0a0a0f', alignItems: 'center' }} onPress={() => setNutView('search')}>
            <Text style={{ color: '#888899', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={s.searchBar}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
            <TextInput style={s.searchInput} value={searchQuery} onChangeText={handleSearchInput} placeholder="Search foods..." placeholderTextColor="#444" autoFocus />
            {searchQuery.length > 0 && <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}><Text style={{ fontSize: 14, color: '#444', padding: 4 }}>✕</Text></TouchableOpacity>}
            <TouchableOpacity onPress={openScanner} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(201,168,76,0.15)', borderRadius: 8, marginLeft: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#c9a84c' }}>SCAN</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={{ paddingHorizontal: 16, paddingBottom: 8 }} onPress={() => { setNutView('log'); setSearchQuery(''); setSearchResults([]); }}>
            <Text style={{ fontSize: 13, color: '#888899' }}>Cancel</Text>
          </TouchableOpacity>
          <ScrollView keyboardShouldPersistTaps="handled">
            {searchQuery.length === 0 && (
              <View>
                <Text style={s.quickAddLabel}>QUICK ADD</Text>
                {quickFoods.map(food => (
                  <TouchableOpacity key={food.id} style={s.foodResult} onPress={() => addFood(food)}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#e8e8f0', marginBottom: 2 }}>{food.name}</Text>
                      <Text style={{ fontSize: 11, color: '#888899' }}>{food.protein}g P · {food.carbs}g C · {food.fat}g F · {food.serving}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#c9a84c' }}>{food.calories}</Text>
                      <Text style={{ fontSize: 10, color: '#888899' }}>kcal</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {searching && <View style={{ padding: 32, alignItems: 'center', gap: 8 }}><ActivityIndicator color="#c9a84c" /><Text style={{ fontSize: 13, color: '#444' }}>Searching...</Text></View>}
            {!searching && searchResults.length > 0 && (
              <View>
                <Text style={s.quickAddLabel}>RESULTS</Text>
                {searchResults.map(food => (
                  <TouchableOpacity key={food.id} style={s.foodResult} onPress={() => addFood(food)}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#e8e8f0', marginBottom: 2 }} numberOfLines={2}>{food.name}</Text>
                      <Text style={{ fontSize: 11, color: '#888899' }}>{food.protein}g P · {food.carbs}g C · {food.fat}g F · {food.serving}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#c9a84c' }}>{food.calories}</Text>
                      <Text style={{ fontSize: 10, color: '#888899' }}>kcal</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ padding: 16 }}>
              <Text style={s.quickAddLabel}>MANUAL ENTRY</Text>
              <View style={{ backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 14, padding: 14 }}>
                <ManualFoodEntry onAdd={addFood} s={s} />
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const perm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: IronLore.colors.panel2,
    borderWidth: 1,
    borderColor: IronLore.colors.border,
    borderRadius: IronLore.radii.xl,
    padding: IronLore.spacing.xl,
  },
  title: { ...IronLore.type.section, color: IronLore.colors.gold, textAlign: 'center' },
  body: { ...IronLore.type.body, color: IronLore.colors.muted, textAlign: 'center', marginTop: 10 },
  row: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryBtn: { flex: 1, backgroundColor: IronLore.colors.gold, borderRadius: IronLore.radii.md, paddingVertical: 14, alignItems: 'center' },
  primaryText: { fontSize: 14, fontWeight: '900', color: IronLore.colors.bg, letterSpacing: 1.2 },
  secondaryBtn: { flex: 1, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: IronLore.radii.md, paddingVertical: 14, alignItems: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '800', color: IronLore.colors.muted, letterSpacing: 0.6 },
  tryAgain: { marginTop: 12, alignItems: 'center' },
  tryAgainText: { fontSize: 12, fontWeight: '800', color: IronLore.colors.gold, letterSpacing: 0.8 },
});

