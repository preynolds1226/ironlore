import { useEffect, useRef, useState } from 'react';
import type { ElementRef } from 'react';
import { ActivityIndicator, Alert, Keyboard, Linking, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { analyzeMealPhoto, MealVisionError } from '@/src/ai/mealVisionClient';
import { IronLore } from '@/src/ui/ironloreTokens';
import { loadNutritionDay, saveNutritionDay, type LoggedFoodItem } from '@/src/data/nutritionDayStore';
import { usePremium } from '@/src/purchases/PremiumContext';

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
  const [multiScan, setMultiScan] = useState(true);
  const [scanDialogVisible, setScanDialogVisible] = useState(false);
  const [scanDialogLoading, setScanDialogLoading] = useState(false);
  const [scanDialogFood, setScanDialogFood] = useState<any | null>(null);
  const [scanDialogPhotoItems, setScanDialogPhotoItems] = useState<any[] | null>(null);
  const [scanDialogAssumptions, setScanDialogAssumptions] = useState<string | null>(null);
  const [scanDialogError, setScanDialogError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'barcode' | 'photo'>('barcode');
  const [cameraReady, setCameraReady] = useState(false);
  const [photoCaptureBusy, setPhotoCaptureBusy] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraPermissionSheet, setCameraPermissionSheet] = useState(false);
  const searchTimer = useRef<any>(null);
  const lastBarcodeRef = useRef<{ code: string; t: number }>({ code: '', t: 0 });
  const scanBusyRef = useRef(false);
  const cameraRef = useRef<ElementRef<typeof CameraView>>(null);
  const SCAN_DEBOUNCE_MS = 1800;
  const { isPremium, purchaseDefault, purchasesConfigured } = usePremium();

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

  function closeScanDialog() {
    setScanDialogVisible(false);
    setScanDialogFood(null);
    setScanDialogPhotoItems(null);
    setScanDialogAssumptions(null);
    setScanDialogError(null);
    setScanDialogLoading(false);
  }

  async function lookupBarcodeProduct(code: string): Promise<any | null> {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}?fields=product_name,nutriments,serving_size,serving_quantity`);
    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;
    const p = json.product;
    const hasServing = p.nutriments?.['energy-kcal_serving'] > 0;
    return {
      id: code,
      name: p.product_name || 'Unknown Product',
      calories: Math.round(hasServing ? p.nutriments?.['energy-kcal_serving'] : (p.nutriments?.['energy-kcal_100g'] * (parseFloat(p.serving_quantity) || 30) / 100)),
      protein: Math.round(hasServing ? p.nutriments?.proteins_serving : (p.nutriments?.proteins_100g * (parseFloat(p.serving_quantity) || 30) / 100)),
      carbs: Math.round(hasServing ? p.nutriments?.carbohydrates_serving : (p.nutriments?.carbohydrates_100g * (parseFloat(p.serving_quantity) || 30) / 100)),
      fat: Math.round(hasServing ? p.nutriments?.fat_serving : (p.nutriments?.fat_100g * (parseFloat(p.serving_quantity) || 30) / 100)),
      serving: p.serving_size || '1 serving',
    };
  }

  async function handleBarcodeScan({ data }: { data: string }) {
    if (scanMode !== 'barcode') return;
    if (scanBusyRef.current) return;

    const now = Date.now();
    if (data === lastBarcodeRef.current.code && now - lastBarcodeRef.current.t < SCAN_DEBOUNCE_MS) return;
    lastBarcodeRef.current = { code: data, t: now };

    scanBusyRef.current = true;
    setScanDialogVisible(true);
    setScanDialogLoading(true);
    setScanDialogFood(null);
    setScanDialogError(null);

    try {
      try {
        const food = await lookupBarcodeProduct(data);
        if (food) {
          setScanDialogFood(food);
        } else {
          setScanDialogError('No product found for this barcode. Try Scan another or use Search.');
        }
      } catch {
        setScanDialogError('Could not reach the food database. Check your connection.');
      }
    } finally {
      setScanDialogLoading(false);
      scanBusyRef.current = false;
    }
  }

  async function captureMealPhoto() {
    if (!isPremium) {
      Alert.alert(
        'IronLore+',
        'Meal photo AI estimates are part of IronLore+. Barcode scan and manual entry stay free.',
        purchasesConfigured
          ? [
              { text: 'OK' },
              { text: 'Subscribe', onPress: () => void purchaseDefault() },
            ]
          : [{ text: 'OK' }],
      );
      return;
    }
    if (scanMode !== 'photo' || !cameraRef.current || !cameraReady || scanBusyRef.current || photoCaptureBusy) return;
    scanBusyRef.current = true;
    setPhotoCaptureBusy(true);
    setScanDialogVisible(true);
    setScanDialogLoading(true);
    setScanDialogFood(null);
    setScanDialogPhotoItems(null);
    setScanDialogAssumptions(null);
    setScanDialogError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.45,
      });
      if (!photo?.base64) {
        setScanDialogError('Could not read the photo. Try again.');
        return;
      }
      const { assumptions, items } = await analyzeMealPhoto({
        imageBase64: photo.base64,
        mimeType: 'image/jpeg',
      });
      setScanDialogAssumptions(assumptions);
      setScanDialogPhotoItems(
        items.map((it, i) => ({
          id: `photo_${Date.now()}_${i}`,
          name: it.name,
          calories: it.calories,
          protein: it.protein,
          carbs: it.carbs,
          fat: it.fat,
          serving: it.serving || 'AI estimate — edit in log if needed',
          qty: typeof it.qty === 'number' && it.qty > 0 ? it.qty : 1,
        })),
      );
    } catch (e) {
      if (e instanceof MealVisionError) {
        setScanDialogError(
          e.code === 'unauthenticated'
            ? 'Sign in to use meal photo. Barcode scan still works offline from Open Food Facts when online.'
            : e.message,
        );
      } else {
        setScanDialogError('Could not analyze this photo. Try again or use barcode search.');
      }
    } finally {
      setScanDialogLoading(false);
      scanBusyRef.current = false;
      setPhotoCaptureBusy(false);
    }
  }

  async function openScanner() {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) { setCameraPermissionSheet(true); return; }
    }
    closeScanDialog();
    lastBarcodeRef.current = { code: '', t: 0 };
    setCameraReady(false);
    setNutView('scan');
  }

  function commitFoodToLog(food: any) {
    const qty = typeof food.qty === 'number' && food.qty > 0 ? food.qty : 1;
    const updated: LoggedFoodItem[] = [...logged, { ...food, meal: activeMeal, qty }];
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

  function addFood(food: any) {
    commitFoodToLog(food);
    setNutView('log');
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  }

  function confirmScanAdd() {
    if (!scanDialogFood) return;
    commitFoodToLog(scanDialogFood);
    closeScanDialog();
    if (!multiScan) {
      setNutView('log');
      setSearchQuery('');
      setSearchResults([]);
      Keyboard.dismiss();
    }
  }

  function confirmPhotoAdd() {
    const items = scanDialogPhotoItems;
    if (!items?.length) return;
    const newRows: LoggedFoodItem[] = items.map((f) => ({
      id: f.id || `photo_${Date.now()}_${Math.random()}`,
      name: f.name,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      serving: f.serving,
      meal: activeMeal,
      qty: typeof f.qty === 'number' && f.qty > 0 ? f.qty : 1,
    }));
    const updated = [...logged, ...newRows];
    setLogged(updated);
    const nextTotals = updated.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories * item.qty,
        protein: acc.protein + item.protein * item.qty,
        carbs: acc.carbs + item.carbs * item.qty,
        fat: acc.fat + item.fat * item.qty,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    onProteinUpdate?.(nextTotals.protein);
    onTotalsUpdate?.(nextTotals);
    persistLogged(updated).catch(() => {});
    closeScanDialog();
    if (!multiScan) {
      setNutView('log');
      setSearchQuery('');
      setSearchResults([]);
      Keyboard.dismiss();
    }
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
              IronLore uses your camera to scan food barcodes and to take meal photos for AI macro estimates. You can still log food manually if you prefer.
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

      <Modal visible={scanDialogVisible} transparent animationType="fade" onRequestClose={closeScanDialog}>
        <View style={scanModal.overlay}>
          <View style={scanModal.sheet}>
            <Text style={scanModal.title}>
              {scanDialogPhotoItems?.length ? 'Meal estimate' : scanDialogFood ? 'Scanned item' : 'Food scan'}
            </Text>
            {scanDialogLoading && (
              <View style={{ paddingVertical: 24, alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#c9a84c" />
                <Text style={scanModal.muted}>
                  {scanMode === 'photo' ? 'Analyzing photo…' : 'Looking up barcode…'}
                </Text>
              </View>
            )}
            {!scanDialogLoading && scanDialogError && (
              <View style={{ gap: 14 }}>
                <Text style={scanModal.body}>{scanDialogError}</Text>
                <TouchableOpacity style={scanModal.primary} onPress={closeScanDialog}>
                  <Text style={scanModal.primaryText}>OK</Text>
                </TouchableOpacity>
              </View>
            )}
            {!scanDialogLoading && scanDialogPhotoItems && scanDialogPhotoItems.length > 0 && (
              <View style={{ gap: 12, maxHeight: 320 }}>
                {scanDialogAssumptions ? (
                  <Text style={[scanModal.muted, { textAlign: 'left', marginBottom: 4 }]}>{scanDialogAssumptions}</Text>
                ) : null}
                <Text style={[scanModal.disclaimer, { marginBottom: 6 }]}>
                  AI estimate only — portions may be off. You can remove or edit items after logging.
                </Text>
                <ScrollView style={{ flexGrow: 0 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {scanDialogPhotoItems.map((it, idx) => (
                    <View key={it.id || idx} style={scanModal.photoItemRow}>
                      <Text style={scanModal.photoItemName} numberOfLines={2}>{it.name}</Text>
                      <Text style={scanModal.photoItemMacros}>
                        {it.calories} kcal · {it.protein}g P · {it.carbs}g C · {it.fat}g F
                        {it.qty && it.qty !== 1 ? ` · ×${it.qty}` : ''}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity style={scanModal.primary} onPress={confirmPhotoAdd}>
                  <Text style={scanModal.primaryText}>Add all to {activeMeal}</Text>
                </TouchableOpacity>
                {multiScan && (
                  <TouchableOpacity
                    style={scanModal.secondary}
                    onPress={() => {
                      closeScanDialog();
                      lastBarcodeRef.current = { code: '', t: 0 };
                    }}
                  >
                    <Text style={scanModal.secondaryText}>{scanMode === 'photo' ? 'Photo another' : 'Scan another'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={scanModal.tertiary} onPress={closeScanDialog}>
                  <Text style={scanModal.tertiaryText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
            {!scanDialogLoading && scanDialogFood && !scanDialogPhotoItems && (
              <View style={{ gap: 12 }}>
                <Text style={scanModal.foodName} numberOfLines={3}>{scanDialogFood.name}</Text>
                <Text style={scanModal.macros}>
                  {scanDialogFood.calories} kcal · {scanDialogFood.protein}g P · {scanDialogFood.carbs}g C · {scanDialogFood.fat}g F
                </Text>
                <Text style={scanModal.muted}>{scanDialogFood.serving}</Text>
                <TouchableOpacity style={scanModal.primary} onPress={confirmScanAdd}>
                  <Text style={scanModal.primaryText}>Add to {activeMeal}</Text>
                </TouchableOpacity>
                {multiScan && (
                  <TouchableOpacity
                    style={scanModal.secondary}
                    onPress={() => {
                      closeScanDialog();
                      lastBarcodeRef.current = { code: '', t: 0 };
                    }}
                  >
                    <Text style={scanModal.secondaryText}>Scan another</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={scanModal.tertiary} onPress={closeScanDialog}>
                  <Text style={scanModal.tertiaryText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
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
          <View style={scanModal.scanToolbar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity
                  style={[scanModal.modeChip, scanMode === 'barcode' && scanModal.modeChipActive]}
                  onPress={() => { setScanMode('barcode'); setCameraReady(false); }}
                  activeOpacity={0.85}
                >
                  <Text style={[scanModal.modeChipText, scanMode === 'barcode' && scanModal.modeChipTextActive]}>Barcode</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[scanModal.modeChip, scanMode === 'photo' && scanModal.modeChipActive]}
                  onPress={() => {
                    if (!isPremium) {
                      Alert.alert(
                        'IronLore+',
                        'Meal photo AI estimates are part of IronLore+. Barcode and manual entry stay free.',
                        purchasesConfigured
                          ? [
                              { text: 'OK' },
                              { text: 'Subscribe', onPress: () => void purchaseDefault() },
                            ]
                          : [{ text: 'OK' }],
                      );
                      return;
                    }
                    setScanMode('photo');
                    setCameraReady(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[scanModal.modeChipText, scanMode === 'photo' && scanModal.modeChipTextActive]}>Photo meal</Text>
                </TouchableOpacity>
              </View>
              {scanMode === 'barcode' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={scanModal.toolbarLabel}>Multi-scan</Text>
                  <Switch
                    value={multiScan}
                    onValueChange={setMultiScan}
                    trackColor={{ false: '#2a2a3a', true: 'rgba(201,168,76,0.45)' }}
                    thumbColor={multiScan ? '#c9a84c' : '#666'}
                  />
                </View>
              )}
            </View>
            {scanMode === 'photo' && (
              <Text style={{ fontSize: 10, color: IronLore.colors.muted, marginTop: 6 }}>
                AI estimates macros from the photo — not medical advice. Requires sign-in for analysis.
              </Text>
            )}
          </View>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
            onBarcodeScanned={scanMode === 'barcode' ? handleBarcodeScan : undefined}
          >
            <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
              <View
                style={
                  scanMode === 'photo'
                    ? { width: 280, height: 280, borderWidth: 2, borderColor: '#c9a84c', borderRadius: 16, backgroundColor: 'transparent' }
                    : { width: 260, height: 160, borderWidth: 2, borderColor: '#c9a84c', borderRadius: 12, backgroundColor: 'transparent' }
                }
              />
              <Text style={{ color: '#c9a84c', marginTop: 16, fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 20 }}>
                {scanMode === 'barcode' ? 'Point at a barcode' : 'Frame your meal, then tap Capture'}
              </Text>
              {scanMode === 'barcode' && !multiScan && (
                <Text style={{ color: '#666', marginTop: 8, fontSize: 11, paddingHorizontal: 24, textAlign: 'center' }}>
                  Single-scan: after you add, you return to the log.
                </Text>
              )}
              {scanMode === 'photo' && (
                <TouchableOpacity
                  style={[scanModal.shutterBtn, (!cameraReady || photoCaptureBusy) && { opacity: 0.5 }]}
                  onPress={captureMealPhoto}
                  disabled={!cameraReady || photoCaptureBusy}
                  activeOpacity={0.9}
                >
                  <Text style={scanModal.shutterBtnText}>Capture</Text>
                </TouchableOpacity>
              )}
            </View>
          </CameraView>
          <TouchableOpacity
            style={{ padding: 20, backgroundColor: '#0a0a0f', alignItems: 'center' }}
            onPress={() => {
              closeScanDialog();
              setNutView('search');
            }}
          >
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

const scanModal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: IronLore.colors.panel2,
    borderWidth: 1,
    borderColor: IronLore.colors.border,
    borderRadius: IronLore.radii.xl,
    padding: IronLore.spacing.lg,
  },
  title: { ...IronLore.type.section, color: IronLore.colors.gold, textAlign: 'center', marginBottom: 8 },
  foodName: { fontSize: 16, fontWeight: '800', color: IronLore.colors.text, textAlign: 'center' },
  macros: { fontSize: 13, color: IronLore.colors.muted, textAlign: 'center' },
  muted: { fontSize: 12, color: IronLore.colors.muted, textAlign: 'center' },
  body: { fontSize: 13, color: IronLore.colors.text, textAlign: 'center', lineHeight: 20 },
  primary: { backgroundColor: IronLore.colors.gold, borderRadius: IronLore.radii.md, paddingVertical: 14, alignItems: 'center' },
  primaryText: { fontSize: 14, fontWeight: '900', color: IronLore.colors.bg },
  secondary: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: IronLore.radii.md, paddingVertical: 14, alignItems: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '800', color: IronLore.colors.gold },
  tertiary: { paddingVertical: 10, alignItems: 'center' },
  tertiaryText: { fontSize: 13, fontWeight: '700', color: IronLore.colors.muted },
  scanToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#12121a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  toolbarLabel: { fontSize: 13, fontWeight: '700', color: '#e8e8f0' },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: IronLore.colors.panel,
    borderWidth: 1,
    borderColor: IronLore.colors.border,
  },
  modeChipActive: { borderColor: IronLore.colors.gold, backgroundColor: 'rgba(201,168,76,0.12)' },
  modeChipText: { fontSize: 12, fontWeight: '800', color: IronLore.colors.muted },
  modeChipTextActive: { color: IronLore.colors.gold },
  shutterBtn: {
    marginTop: 20,
    backgroundColor: IronLore.colors.gold,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
  },
  shutterBtnText: { fontSize: 15, fontWeight: '900', color: IronLore.colors.bg, letterSpacing: 0.5 },
  disclaimer: { fontSize: 10, color: IronLore.colors.muted, lineHeight: 14 },
  photoItemRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: IronLore.colors.border,
  },
  photoItemName: { fontSize: 14, fontWeight: '700', color: IronLore.colors.text },
  photoItemMacros: { fontSize: 12, color: IronLore.colors.muted, marginTop: 4 },
});

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

