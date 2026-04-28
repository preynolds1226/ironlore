import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Modal, Vibration, ActivityIndicator, Keyboard, Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ============================================================
// CONSTANTS
// ============================================================

const GOALS = { calories: 1800, protein: 200, carbs: 150, fat: 60 };
const REST_SECONDS = 60;
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

const ROUTINES: Record<string, { name: string; lastWeight: string; lastReps: string }[]> = {
  'Chest Day': [
    { name: 'Bench Press', lastWeight: '185', lastReps: '10' },
    { name: 'Incline Dumbbell Press', lastWeight: '65', lastReps: '10' },
    { name: 'Cable Fly', lastWeight: '40', lastReps: '10' },
    { name: 'Tricep Pushdown', lastWeight: '60', lastReps: '10' },
  ],
  'Back Day': [
    { name: 'Deadlift', lastWeight: '225', lastReps: '8' },
    { name: 'Barbell Row', lastWeight: '155', lastReps: '10' },
    { name: 'Lat Pulldown', lastWeight: '130', lastReps: '10' },
    { name: 'Cable Row', lastWeight: '120', lastReps: '10' },
  ],
  'Leg Day': [
    { name: 'Squat', lastWeight: '205', lastReps: '8' },
    { name: 'Leg Press', lastWeight: '360', lastReps: '10' },
    { name: 'Romanian Deadlift', lastWeight: '175', lastReps: '10' },
    { name: 'Leg Curl', lastWeight: '110', lastReps: '10' },
  ],
  'Shoulder Day': [
    { name: 'Overhead Press', lastWeight: '115', lastReps: '8' },
    { name: 'Lateral Raise', lastWeight: '25', lastReps: '12' },
    { name: 'Front Raise', lastWeight: '20', lastReps: '12' },
    { name: 'Face Pull', lastWeight: '50', lastReps: '15' },
  ],
};

const QUICK_FOODS = [
  { id: 'q1', name: 'Chicken Breast (4oz)', calories: 185, protein: 35, carbs: 0, fat: 4, serving: '4oz' },
  { id: 'q2', name: 'Whey Protein Shake', calories: 120, protein: 24, carbs: 3, fat: 2, serving: '1 scoop' },
  { id: 'q3', name: 'Eggs (2 large)', calories: 140, protein: 12, carbs: 1, fat: 10, serving: '2 eggs' },
  { id: 'q4', name: 'Greek Yogurt (1 cup)', calories: 130, protein: 17, carbs: 9, fat: 4, serving: '1 cup' },
  { id: 'q5', name: 'White Rice (1 cup)', calories: 206, protein: 4, carbs: 45, fat: 0, serving: '1 cup' },
  { id: 'q6', name: 'Ground Beef (4oz)', calories: 290, protein: 26, carbs: 0, fat: 20, serving: '4oz' },
];

function epley1RM(weight: number, reps: number) {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// ============================================================
// ACHIEVEMENTS DATA
// ============================================================

const ACHIEVEMENTS = {
  featured: [
    { id: 'f1', icon: '🏆', name: 'First Blood', desc: 'Complete your first workout', reward: 100, unlocked: true, category: 'Strength' },
    { id: 'f2', icon: '🔥', name: 'Iron Will', desc: 'Maintain a 30 day streak', reward: 500, unlocked: false, progress: 17, total: 30, category: 'Streak' },
    { id: 'f3', icon: '🥩', name: 'Protein King', desc: 'Hit 200g protein 7 days straight', reward: 300, unlocked: false, progress: 4, total: 7, category: 'Nutrition' },
    { id: 'f4', icon: '👑', name: 'Dawn Warrior', desc: 'Log 50 workouts before 6 AM', reward: 750, unlocked: false, progress: 23, total: 50, category: 'Streak' },
  ],
  Strength: [
    { id: 's1', icon: '💪', name: 'First Blood', desc: 'Complete your first workout', reward: 100, unlocked: true },
    { id: 's2', icon: '🏋️', name: 'Iron Chest', desc: 'Bench press your bodyweight', reward: 200, unlocked: true },
    { id: 's3', icon: '⚔️', name: 'Steel Chest', desc: 'Bench press 1.5x bodyweight', reward: 350, unlocked: false, progress: 185, total: 270 },
    { id: 's4', icon: '👑', name: 'Immortal Bench', desc: 'Bench 225 for 10 reps', reward: 600, unlocked: false, progress: 185, total: 225 },
    { id: 's5', icon: '🦵', name: 'Iron Legs', desc: 'Squat your bodyweight', reward: 200, unlocked: true },
    { id: 's6', icon: '💀', name: 'Earth Shaker', desc: 'Squat 315 lbs', reward: 500, unlocked: false, progress: 205, total: 315 },
    { id: 's7', icon: '⛓️', name: 'Iron Back', desc: 'Deadlift 1.5x bodyweight', reward: 250, unlocked: false, progress: 225, total: 270 },
    { id: 's8', icon: '🔱', name: 'The Unmovable', desc: 'Deadlift 405 lbs', reward: 750, unlocked: false, progress: 225, total: 405 },
    { id: 's9', icon: '💯', name: 'Century', desc: 'Complete 100 total workouts', reward: 1000, unlocked: false, progress: 34, total: 100 },
  ],
  Nutrition: [
    { id: 'n1', icon: '🥩', name: 'Protein Rookie', desc: 'Hit protein goal for the first time', reward: 50, unlocked: true },
    { id: 'n2', icon: '🍗', name: 'Protein Warrior', desc: 'Hit 200g protein 7 days straight', reward: 300, unlocked: false, progress: 4, total: 7 },
    { id: 'n3', icon: '👑', name: 'Protein King', desc: 'Hit 200g protein 30 days straight', reward: 1000, unlocked: false, progress: 4, total: 30 },
    { id: 'n4', icon: '⚡', name: 'Calorie Crusher', desc: 'Hit calorie goal 14 days straight', reward: 400, unlocked: false, progress: 3, total: 14 },
    { id: 'n5', icon: '🧬', name: 'Macro Master', desc: 'Hit all macros in one day', reward: 200, unlocked: true },
  ],
  Streak: [
    { id: 'st1', icon: '🔥', name: 'On Fire', desc: 'Log in 7 days in a row', reward: 150, unlocked: true },
    { id: 'st2', icon: '💥', name: 'Iron Will', desc: '30 day streak', reward: 500, unlocked: false, progress: 17, total: 30 },
    { id: 'st3', icon: '🌅', name: 'Dawn Warrior', desc: '50 workouts before 6 AM', reward: 750, unlocked: false, progress: 23, total: 50 },
    { id: 'st4', icon: '🏅', name: 'Unstoppable', desc: '100 day streak', reward: 2000, unlocked: false, progress: 17, total: 100 },
  ],
};

// ============================================================
// SHOP DATA
// ============================================================

const SHOP_ITEMS = {
  Armor: [
    { id: 'a1', icon: '🛡️', name: 'Starter Iron Armor', desc: 'The armor of a warrior just beginning their journey', price: 0, owned: true, equipped: true, category: 'Armor' },
    { id: 'a2', icon: '⚫', name: 'Obsidian Plate', desc: 'Forged from the darkest iron, worn by battle-hardened warriors', price: 500, owned: false, equipped: false, category: 'Armor' },
    { id: 'a3', icon: '🔴', name: 'Crimson Warlord Set', desc: 'The armor of a thousand victories', price: 1200, owned: false, equipped: false, category: 'Armor' },
    { id: 'a4', icon: '✨', name: 'Legendary Ironborn', desc: 'Worn only by those who have reached the pinnacle of strength', price: 3000, owned: false, equipped: false, category: 'Armor' },
  ],
  Companions: [
    { id: 'c1', icon: '🐺', name: 'Iron Wolf', desc: 'A loyal wolf that walks beside you on your journey', price: 800, owned: false, equipped: false, category: 'Companions' },
    { id: 'c2', icon: '🐦', name: 'Battle Raven', desc: 'A raven that scouts your enemies and returns with knowledge', price: 1500, owned: false, equipped: false, category: 'Companions' },
    { id: 'c3', icon: '🐉', name: 'Shadow Drake', desc: 'A young dragon bonded to your strength', price: 5000, owned: false, equipped: false, category: 'Companions' },
    { id: 'c4', icon: '🦅', name: 'Storm Eagle', desc: 'Soars above the battlefield, marking the path to glory', price: 2000, owned: false, equipped: false, category: 'Companions' },
  ],
  Titles: [
    { id: 't1', icon: '📜', name: 'The Ironborn', desc: 'Born of iron and forged in fire', price: 0, owned: true, equipped: true, category: 'Titles' },
    { id: 't2', icon: '📜', name: 'Protein King', desc: 'Awarded to those who never miss their macros', price: 400, owned: false, equipped: false, category: 'Titles' },
    { id: 't3', icon: '📜', name: 'The Unbroken', desc: 'For those who have never missed a day', price: 600, owned: false, equipped: false, category: 'Titles' },
    { id: 't4', icon: '📜', name: 'Dawn Warrior', desc: 'Rises before the sun to forge their destiny', price: 800, owned: false, equipped: false, category: 'Titles' },
    { id: 't5', icon: '📜', name: 'Ironlore Legend', desc: 'Reserved for those who have reached max level', price: 5000, owned: false, equipped: false, category: 'Titles' },
  ],
  Backgrounds: [
    { id: 'bg1', icon: '🌑', name: 'Dark Forge', desc: 'The ancient forge where iron becomes legend', price: 0, owned: true, equipped: true, category: 'Backgrounds' },
    { id: 'bg2', icon: '🌋', name: 'Volcanic Throne', desc: 'A throne carved from volcanic rock at the edge of the world', price: 700, owned: false, equipped: false, category: 'Backgrounds' },
    { id: 'bg3', icon: '❄️', name: 'Frozen Tundra', desc: 'The frozen wastes where only the strongest survive', price: 700, owned: false, equipped: false, category: 'Backgrounds' },
    { id: 'bg4', icon: '⚡', name: 'Storm Peak', desc: 'The highest mountain, struck by lightning eternally', price: 1000, owned: false, equipped: false, category: 'Backgrounds' },
  ],
  'Weapon Skins': [
    { id: 'w1', icon: '⚔️', name: 'Iron Blade', desc: 'A simple iron sword, reliable and true', price: 0, owned: true, equipped: true, category: 'Weapon Skins' },
    { id: 'w2', icon: '🗡️', name: 'Shadow Dagger', desc: 'Strikes from the darkness before you see it coming', price: 600, owned: false, equipped: false, category: 'Weapon Skins' },
    { id: 'w3', icon: '🔱', name: 'Trident of Valor', desc: 'Forged by the sea warriors of old', price: 1500, owned: false, equipped: false, category: 'Weapon Skins' },
    { id: 'w4', icon: '⚡', name: 'Lightning Sword', desc: 'Crackles with the power of a thousand storms', price: 2500, owned: false, equipped: false, category: 'Weapon Skins' },
  ],
};

// ============================================================
// ACHIEVEMENTS SCREEN
// ============================================================

function AchievementsScreen({ onBack, coins, onEarn }: { onBack: () => void; coins: number; onEarn: (amount: number) => void }) {
  const [activeTab, setActiveTab] = useState('featured');
  const tabs = ['featured', 'Strength', 'Nutrition', 'Streak'];

  function claimAchievement(achievement: any) {
    if (!achievement.unlocked) return;
    onEarn(achievement.reward);
  }

  const renderAchievement = (item: any, featured = false) => (
    <View key={item.id} style={[s.achievementCard, item.unlocked && s.achievementUnlocked, featured && s.achievementFeatured]}>
      <View style={[s.achievementIconWrap, item.unlocked && s.achievementIconUnlocked]}>
        <Text style={s.achievementIcon}>{item.icon}</Text>
      </View>
      <View style={s.achievementContent}>
        <Text style={[s.achievementName, !item.unlocked && s.achievementNameLocked]}>{item.name}</Text>
        <Text style={s.achievementDesc}>{item.desc}</Text>
        {item.progress !== undefined && !item.unlocked && (
          <View style={{ marginTop: 6 }}>
            <View style={s.achievementBar}>
              <View style={[s.achievementBarFill, { width: `${Math.min((item.progress / item.total) * 100, 100)}%` as any }]} />
            </View>
            <Text style={s.achievementProgress}>{item.progress} / {item.total}</Text>
          </View>
        )}
      </View>
      <View style={s.achievementRight}>
        <View style={s.coinReward}>
          <Text style={s.coinRewardText}>🪙 {item.reward}</Text>
        </View>
        {item.unlocked && (
          <View style={s.unlockedBadge}>
            <Text style={s.unlockedBadgeText}>✓</Text>
          </View>
        )}
      </View>
    </View>
  );

  const currentData = activeTab === 'featured'
    ? ACHIEVEMENTS.featured
    : ACHIEVEMENTS[activeTab as keyof typeof ACHIEVEMENTS] as any[];

  const unlocked = currentData.filter((a: any) => a.unlocked).length;
  const total = currentData.length;

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={s.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.screenTitle}>ACHIEVEMENTS</Text>
        <View style={s.coinDisplay}>
          <Text style={s.coinDisplayText}>🪙 {coins.toLocaleString()}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={s.achievementProgress2}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 12, color: '#888899' }}>{unlocked} / {total} unlocked</Text>
          <Text style={{ fontSize: 12, color: '#c9a84c' }}>{Math.round((unlocked / total) * 100)}%</Text>
        </View>
        <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: '100%', backgroundColor: '#c9a84c', borderRadius: 3, width: `${(unlocked / total) * 100}%` as any }} />
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabRow}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'featured' ? '⭐ Featured' : tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, gap: 10 }}>
          {currentData.map((item: any) => renderAchievement(item, activeTab === 'featured'))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ============================================================
// SHOP SCREEN
// ============================================================

function ShopScreen({ onBack, coins, onSpend }: { onBack: () => void; coins: number; onSpend: (amount: number) => void }) {
  const [activeCategory, setActiveCategory] = useState('Armor');
  const [ownedItems, setOwnedItems] = useState<string[]>(['a1', 't1', 'bg1', 'w1']);
  const [equippedItems, setEquippedItems] = useState<string[]>(['a1', 't1', 'bg1', 'w1']);
  const [confirmModal, setConfirmModal] = useState<any>(null);
  const categories = ['Armor', 'Companions', 'Titles', 'Backgrounds', 'Weapon Skins'];

  function buyItem(item: any) {
    if (coins < item.price) return;
    setConfirmModal(item);
  }

  function confirmPurchase() {
    if (!confirmModal) return;
    onSpend(confirmModal.price);
    setOwnedItems(prev => [...prev, confirmModal.id]);
    setConfirmModal(null);
  }

  function equipItem(item: any) {
    setEquippedItems(prev => {
      const filtered = prev.filter(id => {
        const shopItem = Object.values(SHOP_ITEMS).flat().find((i: any) => i.id === id);
        return shopItem?.category !== item.category;
      });
      return [...filtered, item.id];
    });
  }

  const items = SHOP_ITEMS[activeCategory as keyof typeof SHOP_ITEMS];

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={s.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.screenTitle}>SHOP</Text>
        <View style={s.coinDisplay}>
          <Text style={s.coinDisplayText}>🪙 {coins.toLocaleString()}</Text>
        </View>
      </View>

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabRow}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[s.tab, activeCategory === cat && s.tabActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[s.tabText, activeCategory === cat && s.tabTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, gap: 12 }}>
          {items.map((item: any) => {
            const owned = ownedItems.includes(item.id);
            const equipped = equippedItems.includes(item.id);
            const canAfford = coins >= item.price;

            return (
              <View key={item.id} style={[s.shopCard, equipped && s.shopCardEquipped]}>
                <View style={s.shopIconWrap}>
                  <Text style={s.shopIcon}>{item.icon}</Text>
                  {equipped && (
                    <View style={s.equippedDot} />
                  )}
                </View>
                <View style={s.shopContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={s.shopItemName}>{item.name}</Text>
                    {equipped && <View style={s.equippedTag}><Text style={s.equippedTagText}>Equipped</Text></View>}
                  </View>
                  <Text style={s.shopItemDesc}>{item.desc}</Text>
                  {!owned && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                      <Text style={[s.shopPrice, !canAfford && s.shopPriceCant]}>🪙 {item.price.toLocaleString()}</Text>
                      {!canAfford && <Text style={{ fontSize: 10, color: '#ef4444' }}>Not enough coins</Text>}
                    </View>
                  )}
                </View>
                <View style={s.shopActions}>
                  {item.price === 0 && !equipped ? (
                    <TouchableOpacity style={s.equipBtn} onPress={() => equipItem(item)}>
                      <Text style={s.equipBtnText}>Equip</Text>
                    </TouchableOpacity>
                  ) : owned && !equipped ? (
                    <TouchableOpacity style={s.equipBtn} onPress={() => equipItem(item)}>
                      <Text style={s.equipBtnText}>Equip</Text>
                    </TouchableOpacity>
                  ) : owned && equipped ? (
                    <View style={s.equippedBtn}>
                      <Text style={s.equippedBtnText}>✓</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[s.buyBtn, !canAfford && s.buyBtnDisabled]}
                      onPress={() => canAfford && buyItem(item)}
                    >
                      <Text style={s.buyBtnText}>Buy</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Confirm purchase modal */}
      <Modal visible={!!confirmModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>{confirmModal?.icon}</Text>
            <Text style={s.modalTitle}>{confirmModal?.name}</Text>
            <Text style={{ fontSize: 13, color: '#888899', textAlign: 'center', marginBottom: 16, lineHeight: 18 }}>{confirmModal?.desc}</Text>
            <View style={{ backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 10, padding: 12, marginBottom: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#c9a84c' }}>🪙 {confirmModal?.price?.toLocaleString()}</Text>
              <Text style={{ fontSize: 11, color: '#888899', marginTop: 2 }}>Iron Coins</Text>
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setConfirmModal(null)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={confirmPurchase}>
                <Text style={s.modalSaveText}>Purchase</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================
// NUTRITION SCREEN
// ============================================================

function NutritionScreen({ onBack }: { onBack: () => void }) {
  const [nutView, setNutView] = useState<'log' | 'search'>('log');
  const [activeMeal, setActiveMeal] = useState('Breakfast');
  const [logged, setLogged] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
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

  function addFood(food: any) {
    setLogged(prev => [...prev, { ...food, meal: activeMeal, qty: 1 }]);
    setNutView('log');
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  }

  function removeFood(idx: number) { setLogged(prev => prev.filter((_, i) => i !== idx)); }

  const remainingProtein = GOALS.protein - totals.protein;

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={s.screenTitle}>NUTRITION</Text>
        <View style={{ width: 60 }} />
      </View>
      {nutView === 'log' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.summaryCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View>
                <Text style={{ fontSize: 40, fontWeight: '900', color: '#e8e8f0' }}>{Math.round(totals.calories)}</Text>
                <Text style={{ fontSize: 12, color: '#888899', marginTop: 2 }}>of {GOALS.calories} kcal</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: totals.calories > GOALS.calories ? '#ef4444' : '#4cc97a' }}>
                  {totals.calories > GOALS.calories ? `${Math.round(totals.calories - GOALS.calories)} over` : `${Math.round(GOALS.calories - totals.calories)} left`}
                </Text>
                <Text style={{ fontSize: 11, color: '#888899', marginTop: 2 }}>calories</Text>
              </View>
            </View>
            <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
              <View style={{ height: '100%', borderRadius: 4, backgroundColor: totals.calories > GOALS.calories ? '#ef4444' : '#c9a84c', width: `${Math.min((totals.calories / GOALS.calories) * 100, 100)}%` as any }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {[
                { name: 'Protein', val: totals.protein, goal: GOALS.protein, color: '#c94c4c' },
                { name: 'Carbs', val: totals.carbs, goal: GOALS.carbs, color: '#c9a84c' },
                { name: 'Fat', val: totals.fat, goal: GOALS.fat, color: '#4cc97a' },
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
            {MEALS.map(meal => (
              <TouchableOpacity key={meal} style={[s.mealTab, activeMeal === meal && s.mealTabActive]} onPress={() => setActiveMeal(meal)}>
                <Text style={[s.mealTabText, activeMeal === meal && s.mealTabTextActive]}>{meal}</Text>
                <Text style={{ fontSize: 10, color: '#444', marginTop: 2 }}>
                  {logged.filter(i => i.meal === meal).length > 0 ? `${Math.round(logged.filter(i => i.meal === meal).reduce((a, i) => a + i.calories * i.qty, 0))} kcal` : '—'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={s.addFoodBtn} onPress={() => setNutView('search')}>
            <Text style={s.addFoodText}>+ Add Food to {activeMeal}</Text>
          </TouchableOpacity>
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
      ) : (
        <View style={{ flex: 1 }}>
          <View style={s.searchBar}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
            <TextInput style={s.searchInput} value={searchQuery} onChangeText={handleSearchInput} placeholder="Search foods..." placeholderTextColor="#444" autoFocus />
            {searchQuery.length > 0 && <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}><Text style={{ fontSize: 14, color: '#444', padding: 4 }}>✕</Text></TouchableOpacity>}
          </View>
          <TouchableOpacity style={{ paddingHorizontal: 16, paddingBottom: 8 }} onPress={() => { setNutView('log'); setSearchQuery(''); setSearchResults([]); }}>
            <Text style={{ fontSize: 13, color: '#888899' }}>Cancel</Text>
          </TouchableOpacity>
          <ScrollView keyboardShouldPersistTaps="handled">
            {searchQuery.length === 0 && (
              <View>
                <Text style={s.quickAddLabel}>QUICK ADD</Text>
                {QUICK_FOODS.map(food => (
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
            {!searching && searchQuery.length > 1 && searchResults.length === 0 && <View style={{ padding: 32, alignItems: 'center' }}><Text style={{ fontSize: 13, color: '#444' }}>No results found</Text></View>}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ============================================================
// TRAIN SCREEN
// ============================================================

function TrainScreen({ onBack }: { onBack: () => void }) {
  const [trainView, setTrainView] = useState<'start' | 'session'>('start');
  const [exercises, setExercises] = useState<any[]>([]);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [totalXP, setTotalXP] = useState(0);
  const [addExerciseModal, setAddExerciseModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const sessionRef = useRef<any>(null);
  const restRef = useRef<any>(null);

  useEffect(() => {
    if (trainView === 'session') { sessionRef.current = setInterval(() => setSessionTimer(t => t + 1), 1000); }
    return () => clearInterval(sessionRef.current);
  }, [trainView]);

  useEffect(() => {
    if (restActive && restTimer > 0) { restRef.current = setTimeout(() => setRestTimer(t => t - 1), 1000); }
    else if (restTimer === 0 && restActive) { setRestActive(false); Vibration.vibrate([0, 200, 100, 200]); }
    return () => clearTimeout(restRef.current);
  }, [restActive, restTimer]);

  function formatTime(secs: number) {
    return `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;
  }

  function startRoutine(name: string) {
    setExercises(ROUTINES[name].map(ex => ({ ...ex, sets: Array(3).fill(null).map(() => ({ weight: ex.lastWeight, reps: ex.lastReps, done: false })) })));
    setSessionTimer(0); setTotalXP(0); setTrainView('session');
  }

  function startQuick() { setExercises([]); setSessionTimer(0); setTotalXP(0); setTrainView('session'); }

  function checkSet(exIdx: number, setIdx: number) {
    const updated = [...exercises];
    updated[exIdx].sets[setIdx].done = true;
    setExercises(updated);
    setRestTimer(REST_SECONDS); setRestActive(true); setTotalXP(t => t + 50);
  }

  function updateSet(exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) {
    const updated = [...exercises];
    updated[exIdx].sets[setIdx][field] = value;
    setExercises(updated);
  }

  function addExercise() {
    if (!newExerciseName.trim()) return;
    setExercises(prev => [...prev, { name: newExerciseName.trim(), lastWeight: '0', lastReps: '0', sets: Array(3).fill(null).map(() => ({ weight: '', reps: '', done: false })) }]);
    setNewExerciseName(''); setAddExerciseModal(false);
  }

  if (trainView === 'start') {
    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <View style={s.header}>
          <TouchableOpacity onPress={onBack}><Text style={s.backBtn}>← Back</Text></TouchableOpacity>
          <Text style={s.screenTitle}>TRAIN</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <TouchableOpacity style={s.quickStartBtn} onPress={startQuick}>
            <Text style={{ fontSize: 28 }}>⚡</Text>
            <View><Text style={s.quickStartTitle}>Quick Start</Text><Text style={{ fontSize: 12, color: '#888899' }}>Blank session — add exercises as you go</Text></View>
          </TouchableOpacity>
          <Text style={s.routineLabel}>YOUR ROUTINES</Text>
          {Object.keys(ROUTINES).map(name => (
            <TouchableOpacity key={name} style={s.routineCard} onPress={() => startRoutine(name)}>
              <View><Text style={s.routineName}>{name}</Text><Text style={{ fontSize: 12, color: '#888899' }}>{ROUTINES[name].length} exercises · 3 sets each</Text></View>
              <Text style={{ fontSize: 22, color: '#888899' }}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.sessionHeader}>
        <TouchableOpacity onPress={() => setTrainView('start')}><Text style={s.cancelBtn}>✕ Cancel</Text></TouchableOpacity>
        <Text style={s.sessionTimer}>{formatTime(sessionTimer)}</Text>
        <View style={s.xpBadge}><Text style={s.xpBadgeText}>+{totalXP} XP</Text></View>
      </View>
      {restActive && (
        <View style={s.restBar}>
          <View style={[s.restFill, { width: `${(restTimer / REST_SECONDS) * 100}%` as any }]} />
          <Text style={s.restLabel}>Rest — {restTimer}s</Text>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false}>
        {exercises.map((ex, exIdx) => {
          const completedSets = ex.sets.filter((s: any) => s.done).length;
          const bestSet = ex.sets.filter((s: any) => s.done).reduce((best: any, curr: any) => {
            if (!best) return curr;
            return epley1RM(parseFloat(curr.weight) || 0, parseInt(curr.reps) || 0) > epley1RM(parseFloat(best.weight) || 0, parseInt(best.reps) || 0) ? curr : best;
          }, null);
          const est1RM = bestSet ? epley1RM(parseFloat(bestSet.weight) || 0, parseInt(bestSet.reps) || 0) : null;
          return (
            <View key={exIdx} style={s.exerciseCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <Text style={s.exerciseName}>{ex.name}</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  {est1RM ? <Text style={{ fontSize: 11, color: '#c9a84c', fontWeight: '600' }}>~{est1RM}lb 1RM</Text> : null}
                  <Text style={{ fontSize: 12, color: '#888899' }}>{completedSets}/{ex.sets.length}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: '#444', marginBottom: 12, fontStyle: 'italic' }}>Last: {ex.lastWeight}lb × {ex.lastReps}</Text>
              <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                <Text style={[s.setHeaderText, { width: 30 }]}>SET</Text>
                <Text style={[s.setHeaderText, { flex: 1, textAlign: 'center' }]}>WEIGHT</Text>
                <Text style={[s.setHeaderText, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                <Text style={[s.setHeaderText, { width: 44, textAlign: 'center' }]}>✓</Text>
              </View>
              {ex.sets.map((set: any, setIdx: number) => (
                <View key={setIdx} style={[s.setRow, set.done && s.setRowDone]}>
                  <Text style={[s.setNum, set.done && { color: '#4cc97a' }]}>{setIdx + 1}</Text>
                  <TextInput style={[s.setInput, set.done && s.setInputDone]} value={set.weight} onChangeText={v => updateSet(exIdx, setIdx, 'weight', v)} keyboardType="numeric" placeholder={ex.lastWeight} placeholderTextColor="#444" editable={!set.done} />
                  <TextInput style={[s.setInput, set.done && s.setInputDone]} value={set.reps} onChangeText={v => updateSet(exIdx, setIdx, 'reps', v)} keyboardType="numeric" placeholder={ex.lastReps} placeholderTextColor="#444" editable={!set.done} />
                  <TouchableOpacity style={[s.checkBtn, set.done && s.checkBtnDone]} onPress={() => !set.done && checkSet(exIdx, setIdx)}>
                    <Text style={s.checkBtnText}>{set.done ? '✓' : '○'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}
        <TouchableOpacity style={s.addExerciseBtn} onPress={() => setAddExerciseModal(true)}>
          <Text style={s.addExerciseText}>+ Add Exercise</Text>
        </TouchableOpacity>
        {exercises.length > 0 && (
          <TouchableOpacity style={s.finishBtn} onPress={() => { setTrainView('start'); onBack(); }}>
            <Text style={s.finishText}>⚔ Finish Workout</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
      <Modal visible={addExerciseModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Add Exercise</Text>
            <TextInput style={s.modalInput} value={newExerciseName} onChangeText={setNewExerciseName} placeholder="Exercise name..." placeholderTextColor="#444" autoFocus />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setAddExerciseModal(false)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={addExercise}><Text style={s.modalSaveText}>Add</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================
// HOME SCREEN
// ============================================================

export default function HomeScreen() {
  const [screen, setScreen] = useState<'home' | 'train' | 'nutrition' | 'achievements' | 'shop'>('home');
  const [coins, setCoins] = useState(1250);

  function earnCoins(amount: number) { setCoins(c => c + amount); }
  function spendCoins(amount: number) { setCoins(c => c - amount); }

  if (screen === 'train') return <TrainScreen onBack={() => setScreen('home')} />;
  if (screen === 'nutrition') return <NutritionScreen onBack={() => setScreen('home')} />;
  if (screen === 'achievements') return <AchievementsScreen onBack={() => setScreen('home')} coins={coins} onEarn={earnCoins} />;
  if (screen === 'shop') return <ShopScreen onBack={() => setScreen('home')} coins={coins} onSpend={spendCoins} />;

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Text style={s.logo}>IRONLORE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity style={s.coinDisplay} onPress={() => setScreen('shop')}>
              <Text style={s.coinDisplayText}>🪙 {coins.toLocaleString()}</Text>
            </TouchableOpacity>
            <View style={s.streakBadge}><Text style={s.streakText}>🔥 47</Text></View>
            <View style={s.avatarCircle}><Text style={{ fontSize: 16 }}>⚔️</Text></View>
          </View>
        </View>

        <View style={s.characterCard}>
          <View style={{ flexDirection: 'row', gap: 14, marginBottom: 14 }}>
            <View style={s.charAvatar}><Text style={{ fontSize: 28 }}>⚔️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.charName}>Dylan the Ironborn</Text>
              <Text style={s.charClass}>⚔ WARRIOR CLASS</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={s.levelBadge}><Text style={s.levelText}>LVL 34</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: '#888899', marginBottom: 3 }}>6,840 / 10,000 XP</Text>
                  <View style={s.xpBar}><View style={[s.xpFill, { width: '68%' }]} /></View>
                </View>
              </View>
            </View>
          </View>
          <View style={s.statsGrid}>
            {[
              { icon: '💪', val: '87', name: 'Strength' },
              { icon: '❤️', val: '74', name: 'Vitality' },
              { icon: '⚡', val: '61', name: 'Endurance' },
              { icon: '🧠', val: '79', name: 'Focus' },
            ].map((stat) => (
              <View key={stat.name} style={s.statCard}>
                <Text style={{ fontSize: 14, marginBottom: 2 }}>{stat.icon}</Text>
                <Text style={s.statVal}>{stat.val}</Text>
                <Text style={s.statName}>{stat.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick action buttons */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 12, marginBottom: 4 }}>
          <TouchableOpacity style={s.quickActionBtn} onPress={() => setScreen('achievements')}>
            <Text style={{ fontSize: 20 }}>🏆</Text>
            <Text style={s.quickActionText}>Achievements</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickActionBtn} onPress={() => setScreen('shop')}>
            <Text style={{ fontSize: 20 }}>🛒</Text>
            <Text style={s.quickActionText}>Shop</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginVertical: 12, gap: 8 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(201,168,76,0.15)' }} />
          <Text style={{ fontSize: 10, color: 'rgba(201,168,76,0.4)', fontStyle: 'italic' }}>Monday, April 27 — The Iron Road</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(201,168,76,0.15)' }} />
        </View>

        <View style={s.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={s.sectionTitle}>DAILY QUESTS</Text>
            <Text style={{ fontSize: 11, color: '#c9a84c' }}>View All →</Text>
          </View>
          {[
            { icon: '🏋️', name: 'Complete Chest Day', sub: '5 exercises · 18 sets · Done', fill: 1.0, color: '#c94c4c', done: true },
            { icon: '🥩', name: 'Hit Protein Goal', sub: '146g / 200g consumed', fill: 0.73, color: '#4cc97a', done: false, xp: '+350 XP' },
            { icon: '💊', name: 'Morning Stack Taken', sub: 'Zinc · Vitamin D · Omega-3', fill: 1.0, color: '#4c7bc9', done: true },
            { icon: '🏃', name: '10,000 Steps', sub: '4,021 / 10,000 steps', fill: 0.40, color: '#c9a84c', done: false, xp: '+150 XP' },
          ].map((quest) => (
            <View key={quest.name} style={[s.questCard, quest.done && s.questDone]}>
              <Text style={{ fontSize: 22 }}>{quest.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.questName}>{quest.name}</Text>
                <Text style={s.questSub}>{quest.sub}</Text>
                <View style={s.questBar}>
                  <View style={[s.questFill, { width: `${quest.fill * 100}%` as any, backgroundColor: quest.color }]} />
                </View>
              </View>
              {quest.done
                ? <View style={s.checkCircle}><Text style={{ fontSize: 12, color: '#052e16', fontWeight: '700' }}>✓</Text></View>
                : <Text style={s.questXP}>{quest.xp}</Text>}
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={[s.sectionTitle, { marginBottom: 10 }]}>TODAY'S STACK</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['Zinc ✓', 'Vitamin D ✓', 'Omega-3 ✓', 'Creatine ✓', 'CJC-1295 🌙', 'Ipamorelin 🌙'].map((supp) => (
              <View key={supp} style={[s.pill, supp.includes('✓') && s.pillTaken]}>
                <Text style={[s.pillText, supp.includes('✓') && s.pillTextTaken]}>{supp}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={s.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={s.sectionTitle}>NUTRITION</Text>
            <Text style={{ fontSize: 12, color: '#c9a84c' }}>⚡ 2,340 / 1,800 kcal</Text>
          </View>
          <View style={s.macroCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
              {[
                { name: 'Protein', val: '146g', goal: '200g', pct: 0.73, color: '#c94c4c' },
                { name: 'Carbs', val: '165g', goal: '150g', pct: 0.55, color: '#c9a84c' },
                { name: 'Fat', val: '52g', goal: '60g', pct: 0.65, color: '#4cc97a' },
              ].map((macro) => (
                <View key={macro.name} style={{ alignItems: 'center' }}>
                  <View style={{ width: 40, height: 60, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 4 }}>
                    <View style={{ width: '100%', height: `${macro.pct * 100}%` as any, backgroundColor: macro.color, borderRadius: 6 }} />
                  </View>
                  <Text style={[s.macroPct, { color: macro.color }]}>{Math.round(macro.pct * 100)}%</Text>
                  <Text style={s.macroName}>{macro.name}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#e8e8f0', marginTop: 2 }}>{macro.val}/{macro.goal}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={s.logFoodBtn} onPress={() => setScreen('nutrition')}>
              <Text style={s.logFoodText}>+ Log Food or Meal</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.bottomNav}>
        {[
          { icon: '🏠', label: 'Home', key: 'home' },
          { icon: '⚔️', label: 'Train', key: 'train' },
          { icon: '🥩', label: 'Nutrition', key: 'nutrition' },
          { icon: '🏆', label: 'Achieve', key: 'achievements' },
          { icon: '🛒', label: 'Shop', key: 'shop' },
        ].map((tab) => (
          <TouchableOpacity key={tab.label} style={s.navItem} onPress={() => setScreen(tab.key as any)}>
            <Text style={{ fontSize: 20 }}>{tab.icon}</Text>
            <Text style={[s.navLabel, screen === tab.key && s.navLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  logo: { fontSize: 22, fontWeight: '900', color: '#c9a84c', letterSpacing: 4 },
  screenTitle: { fontSize: 20, fontWeight: '900', color: '#c9a84c', letterSpacing: 4 },
  backBtn: { fontSize: 14, color: '#888899', width: 60 },
  streakBadge: { backgroundColor: 'rgba(201,168,76,0.12)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  streakText: { color: '#c9a84c', fontSize: 12, fontWeight: '600' },
  avatarCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#8b2020', borderWidth: 2, borderColor: '#c9a84c', alignItems: 'center', justifyContent: 'center' },
  coinDisplay: { backgroundColor: 'rgba(201,168,76,0.12)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  coinDisplayText: { color: '#c9a84c', fontSize: 12, fontWeight: '700' },
  characterCard: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#1a0e0e', borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', borderRadius: 20, padding: 18 },
  charAvatar: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#c94c4c', borderWidth: 2, borderColor: '#c9a84c', alignItems: 'center', justifyContent: 'center' },
  charName: { fontSize: 17, fontWeight: '700', color: '#e8e8f0', marginBottom: 2 },
  charClass: { fontSize: 11, fontWeight: '600', color: '#c94c4c', letterSpacing: 1, marginBottom: 8 },
  levelBadge: { backgroundColor: '#c9a84c', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  levelText: { fontSize: 11, fontWeight: '700', color: '#0a0a0f' },
  xpBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: '#c9a84c', borderRadius: 3 },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 8, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '700', color: '#c9a84c' },
  statName: { fontSize: 9, color: '#888899', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  quickActionBtn: { flex: 1, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  quickActionText: { fontSize: 12, fontWeight: '600', color: '#888899' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: '#888899', letterSpacing: 1 },
  questCard: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  questDone: { borderColor: 'rgba(76,201,122,0.3)', backgroundColor: 'rgba(76,201,122,0.04)' },
  questName: { fontSize: 13, fontWeight: '600', color: '#e8e8f0', marginBottom: 2 },
  questSub: { fontSize: 11, color: '#888899', marginBottom: 4 },
  questBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  questFill: { height: '100%', borderRadius: 2 },
  questXP: { fontSize: 11, fontWeight: '700', color: '#c9a84c' },
  checkCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4cc97a', alignItems: 'center', justifyContent: 'center' },
  pill: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  pillTaken: { borderColor: 'rgba(76,123,201,0.4)', backgroundColor: 'rgba(76,123,201,0.08)' },
  pillText: { fontSize: 12, fontWeight: '500', color: '#888899' },
  pillTextTaken: { color: '#7ab0e8' },
  macroCard: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 16, padding: 14 },
  macroPct: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  macroName: { fontSize: 10, color: '#888899', textTransform: 'uppercase', letterSpacing: 0.5 },
  logFoodBtn: { backgroundColor: 'rgba(201,168,76,0.1)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)', borderRadius: 10, padding: 10, alignItems: 'center' },
  logFoodText: { fontSize: 13, fontWeight: '600', color: '#c9a84c' },
  bottomNav: { flexDirection: 'row', backgroundColor: 'rgba(10,10,15,0.97)', borderTopWidth: 1, borderTopColor: '#2a2a3a', paddingBottom: 24, paddingTop: 10 },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navLabel: { fontSize: 9, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, color: '#888899' },
  navLabelActive: { color: '#c9a84c' },
  // Tabs
  tabRow: { paddingHorizontal: 16, marginBottom: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 20 },
  tabActive: { borderColor: 'rgba(201,168,76,0.4)', backgroundColor: 'rgba(201,168,76,0.08)' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#888899' },
  tabTextActive: { color: '#c9a84c' },
  // Achievements
  achievementProgress2: { paddingHorizontal: 16, marginBottom: 8 },
  achievementCard: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.6 },
  achievementUnlocked: { opacity: 1, borderColor: 'rgba(201,168,76,0.2)' },
  achievementFeatured: { borderColor: 'rgba(201,168,76,0.25)', backgroundColor: '#1a1508' },
  achievementIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1c1c2a', alignItems: 'center', justifyContent: 'center' },
  achievementIconUnlocked: { backgroundColor: 'rgba(201,168,76,0.15)' },
  achievementIcon: { fontSize: 22 },
  achievementContent: { flex: 1 },
  achievementName: { fontSize: 14, fontWeight: '700', color: '#e8e8f0', marginBottom: 2 },
  achievementNameLocked: { color: '#666' },
  achievementDesc: { fontSize: 11, color: '#888899', lineHeight: 15 },
  achievementBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 2 },
  achievementBarFill: { height: '100%', backgroundColor: '#c9a84c', borderRadius: 2 },
  achievementProgress: { fontSize: 10, color: '#888899' },
  achievementRight: { alignItems: 'center', gap: 6 },
  coinReward: { backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  coinRewardText: { fontSize: 11, fontWeight: '700', color: '#c9a84c' },
  unlockedBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4cc97a', alignItems: 'center', justifyContent: 'center' },
  unlockedBadgeText: { fontSize: 12, color: '#052e16', fontWeight: '700' },
  // Shop
  shopCard: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  shopCardEquipped: { borderColor: 'rgba(201,168,76,0.3)', backgroundColor: '#1a1508' },
  shopIconWrap: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#1c1c2a', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  shopIcon: { fontSize: 26 },
  equippedDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#c9a84c' },
  shopContent: { flex: 1 },
  shopItemName: { fontSize: 14, fontWeight: '700', color: '#e8e8f0' },
  shopItemDesc: { fontSize: 11, color: '#888899', lineHeight: 15, marginTop: 2 },
  shopPrice: { fontSize: 13, fontWeight: '700', color: '#c9a84c' },
  shopPriceCant: { color: '#ef4444' },
  shopActions: { alignItems: 'center' },
  buyBtn: { backgroundColor: '#c9a84c', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  buyBtnDisabled: { backgroundColor: '#2a2a3a' },
  buyBtnText: { fontSize: 13, fontWeight: '700', color: '#0a0a0f' },
  equipBtn: { backgroundColor: 'rgba(201,168,76,0.15)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  equipBtnText: { fontSize: 13, fontWeight: '600', color: '#c9a84c' },
  equippedBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(201,168,76,0.15)', alignItems: 'center', justifyContent: 'center' },
  equippedBtnText: { fontSize: 16, color: '#c9a84c' },
  equippedTag: { backgroundColor: 'rgba(201,168,76,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  equippedTagText: { fontSize: 9, fontWeight: '700', color: '#c9a84c', textTransform: 'uppercase', letterSpacing: 0.5 },
  // Nutrition
  summaryCard: { marginHorizontal: 16, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 20, padding: 18, marginBottom: 12 },
  mealTab: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 12, alignItems: 'center' },
  mealTabActive: { borderColor: 'rgba(201,168,76,0.4)', backgroundColor: 'rgba(201,168,76,0.08)' },
  mealTabText: { fontSize: 13, fontWeight: '600', color: '#888899' },
  mealTabTextActive: { color: '#c9a84c' },
  addFoodBtn: { marginHorizontal: 16, marginBottom: 12, padding: 14, backgroundColor: 'rgba(201,168,76,0.1)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)', borderRadius: 12, alignItems: 'center' },
  addFoodText: { fontSize: 14, fontWeight: '600', color: '#c9a84c' },
  loggedItem: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, padding: 12, fontSize: 15, color: '#e8e8f0' },
  quickAddLabel: { fontSize: 10, fontWeight: '600', color: '#444', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 16, paddingVertical: 8 },
  foodResult: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a2a' },
  // Train
  quickStartBtn: { backgroundColor: '#1a1a26', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  quickStartTitle: { fontSize: 16, fontWeight: '700', color: '#e8e8f0', marginBottom: 2 },
  routineLabel: { fontSize: 11, fontWeight: '600', color: '#888899', letterSpacing: 1, marginBottom: 10 },
  routineCard: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routineName: { fontSize: 15, fontWeight: '600', color: '#e8e8f0', marginBottom: 3 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a3a' },
  cancelBtn: { fontSize: 13, color: '#888899' },
  sessionTimer: { fontSize: 22, fontWeight: '700', color: '#e8e8f0' },
  xpBadge: { backgroundColor: 'rgba(201,168,76,0.12)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  xpBadgeText: { fontSize: 12, fontWeight: '700', color: '#c9a84c' },
  restBar: { height: 36, backgroundColor: '#1a1a1a', borderBottomWidth: 1, borderBottomColor: '#2a2a3a', justifyContent: 'center', overflow: 'hidden' },
  restFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(59,130,246,0.2)' },
  restLabel: { fontSize: 12, color: '#93c5fd', textAlign: 'center', fontWeight: '600' },
  exerciseCard: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 16, padding: 16, margin: 16, marginBottom: 0 },
  exerciseName: { fontSize: 16, fontWeight: '700', color: '#e8e8f0', flex: 1 },
  setHeaderText: { fontSize: 9, fontWeight: '600', color: '#444', textTransform: 'uppercase', letterSpacing: 0.5 },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  setRowDone: { opacity: 0.6 },
  setNum: { width: 30, fontSize: 13, fontWeight: '600', color: '#888899', textAlign: 'center' },
  setInput: { flex: 1, backgroundColor: '#1c1c2a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 8, padding: 8, fontSize: 15, fontWeight: '600', color: '#e8e8f0', textAlign: 'center' },
  setInputDone: { borderColor: 'rgba(76,201,122,0.3)', backgroundColor: 'rgba(76,201,122,0.05)' },
  checkBtn: { width: 44, height: 40, borderRadius: 8, backgroundColor: '#1c1c2a', borderWidth: 1, borderColor: '#2a2a3a', alignItems: 'center', justifyContent: 'center' },
  checkBtnDone: { backgroundColor: 'rgba(76,201,122,0.15)', borderColor: 'rgba(76,201,122,0.4)' },
  checkBtnText: { fontSize: 16, color: '#4cc97a' },
  addExerciseBtn: { margin: 16, padding: 14, borderWidth: 1.5, borderColor: '#2a2a3a', borderStyle: 'dashed', borderRadius: 12, alignItems: 'center' },
  addExerciseText: { fontSize: 14, fontWeight: '600', color: '#888899' },
  finishBtn: { marginHorizontal: 16, padding: 16, backgroundColor: '#c9a84c', borderRadius: 14, alignItems: 'center', marginTop: 8 },
  finishText: { fontSize: 16, fontWeight: '700', color: '#0a0a0f' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1a1a26', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#e8e8f0', marginBottom: 16, textAlign: 'center' },
  modalInput: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 10, padding: 14, fontSize: 15, color: '#e8e8f0', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 14, backgroundColor: '#12121a', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3a' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#888899' },
  modalSave: { flex: 1, padding: 14, backgroundColor: '#c9a84c', borderRadius: 10, alignItems: 'center' },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: '#0a0a0f' },
});