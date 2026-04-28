import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Modal, Vibration, ActivityIndicator, Keyboard, Image, Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ============================================================
// SUPABASE CLIENT
// ============================================================

const SUPABASE_URL = 'https://blrvttulfyeoqromogfz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscnZ0dHVsZnllb3Fyb21vZ2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjgxOTIsImV4cCI6MjA5Mjk0NDE5Mn0.qVS81Q1cLxO5rBmAQTBwAgwYVr_fVkfJ6UZwd0s7Tb0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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
// AUTH SCREEN
// ============================================================

function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAuth() {
    if (!email.trim() || !password.trim()) { setError('Enter email and password.'); return; }
    setLoading(true); setError('');
    try {
      if (mode === 'signup') {
        const { error: e } = await supabase.auth.signUp({ email: email.trim(), password });
        if (e) { setError(e.message); } else { setMode('login'); setError('Check your email to confirm, then log in.'); }
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) { setError(e.message); } else { onAuth(); }
      }
    } catch { setError('Something went wrong.'); }
    setLoading(false);
  }

  return (
    <View style={auth.root}>
      <StatusBar style="light" />
      <View style={auth.container}>
        <Text style={auth.logo}>IRONLORE</Text>
        <Text style={auth.tagline}>Your fitness journey becomes legend.</Text>
        <View style={auth.modeRow}>
          <TouchableOpacity style={[auth.modeBtn, mode === 'login' && auth.modeBtnActive]} onPress={() => setMode('login')}>
            <Text style={[auth.modeBtnText, mode === 'login' && auth.modeBtnTextActive]}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[auth.modeBtn, mode === 'signup' && auth.modeBtnActive]} onPress={() => setMode('signup')}>
            <Text style={[auth.modeBtnText, mode === 'signup' && auth.modeBtnTextActive]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
        <TextInput style={auth.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#444" autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={auth.input} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#444" secureTextEntry />
        {error ? <Text style={auth.error}>{error}</Text> : null}
        <TouchableOpacity style={auth.btn} onPress={handleAuth} disabled={loading}>
          {loading ? <ActivityIndicator color="#0a0a0f" /> : <Text style={auth.btnText}>{mode === 'login' ? 'ENTER THE FORGE' : 'CREATE ACCOUNT'}</Text>}
        </TouchableOpacity>
        <Text style={auth.footer}>No ads. No selling your data. Ever.</Text>
      </View>
    </View>
  );
}

const auth = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0f' },
  container: { flex: 1, justifyContent: 'center', padding: 28 },
  logo: { fontSize: 38, fontWeight: '900', color: '#c9a84c', letterSpacing: 8, textAlign: 'center', marginBottom: 8 },
  tagline: { fontSize: 13, color: '#888899', textAlign: 'center', fontStyle: 'italic', marginBottom: 36 },
  modeRow: { flexDirection: 'row', backgroundColor: '#12121a', borderRadius: 12, padding: 4, marginBottom: 20 },
  modeBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#c9a84c' },
  modeBtnText: { fontSize: 14, fontWeight: '700', color: '#888899' },
  modeBtnTextActive: { color: '#0a0a0f' },
  input: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 12, padding: 16, fontSize: 15, color: '#e8e8f0', marginBottom: 12 },
  error: { fontSize: 12, color: '#f97316', textAlign: 'center', marginBottom: 12, lineHeight: 18 },
  btn: { backgroundColor: '#c9a84c', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { fontSize: 15, fontWeight: '900', color: '#0a0a0f', letterSpacing: 2 },
  footer: { fontSize: 11, color: '#333344', textAlign: 'center', marginTop: 20 },
});

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
      <View style={s.achievementProgress2}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 12, color: '#888899' }}>{unlocked} / {total} unlocked</Text>
          <Text style={{ fontSize: 12, color: '#c9a84c' }}>{Math.round((unlocked / total) * 100)}%</Text>
        </View>
        <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: '100%', backgroundColor: '#c9a84c', borderRadius: 3, width: `${(unlocked / total) * 100}%` as any }} />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabRow}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabRow}>
        {categories.map(cat => (
          <TouchableOpacity key={cat} style={[s.tab, activeCategory === cat && s.tabActive]} onPress={() => setActiveCategory(cat)}>
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
                  {equipped && <View style={s.equippedDot} />}
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
                    <TouchableOpacity style={[s.buyBtn, !canAfford && s.buyBtnDisabled]} onPress={() => canAfford && buyItem(item)}>
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

function ManualFoodEntry({ onAdd }: { onAdd: (food: any) => void }) {
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

function NutritionScreen({ onBack }: { onBack: () => void }) {
  const [nutView, setNutView] = useState<'log' | 'search' | 'scan'>('log');
  const [activeMeal, setActiveMeal] = useState('Breakfast');
  const [logged, setLogged] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
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
        // Prefer per-serving data, fall back to per-100g
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
    } catch (e) {
      setSearchResults([]);
    }
    setSearching(false);
  }

  async function openScanner() {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) { Alert.alert('Permission needed', 'Camera access is required to scan barcodes.'); return; }
    }
    setNutView('scan');
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
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            onBarcodeScanned={handleBarcodeScan}
          >
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
            {!searching && searchQuery.length > 1 && searchResults.length === 0 && (
              <View style={{ padding: 20 }}>
                <Text style={{ fontSize: 13, color: '#888899', textAlign: 'center', marginBottom: 16 }}>No results found. Add it manually:</Text>
                <ManualFoodEntry onAdd={addFood} />
              </View>
            )}
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

function TrainScreen({ onBack, userId }: { onBack: () => void; userId: string }) {
  const [trainView, setTrainView] = useState<'start' | 'session' | 'summary'>('start');
  const [exercises, setExercises] = useState<any[]>([]);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [totalXP, setTotalXP] = useState(0);
  const [addExerciseModal, setAddExerciseModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const sessionRef = useRef<any>(null);
  const restRef = useRef<any>(null);

  useEffect(() => {
    if (trainView === 'session') { sessionRef.current = setInterval(() => setSessionTimer(t => t + 1), 1000); }
    else { clearInterval(sessionRef.current); }
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

  async function finishWorkout() {
    setFinalTime(sessionTimer);
    setTrainView('summary');
    const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.filter((s: any) => s.done).length, 0);
    const totalVolume = exercises.reduce((acc, ex) => acc + ex.sets.filter((s: any) => s.done).reduce((a: number, set: any) => a + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0), 0);
    if (userId && totalSets > 0) {
      await supabase.from('workouts').insert({
        user_id: userId,
        duration: sessionTimer,
        total_xp: totalXP,
        total_volume: totalVolume,
        total_sets: totalSets,
        exercises: exercises,
      });
    }
  }

  // ── SUMMARY VIEW ──────────────────────────────────────────
  if (trainView === 'summary') {
    const completedExercises = exercises.filter(ex => ex.sets.some((s: any) => s.done));
    const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.filter((s: any) => s.done).length, 0);
    const totalVolume = exercises.reduce((acc, ex) => {
      return acc + ex.sets.filter((s: any) => s.done).reduce((a: number, set: any) => {
        return a + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);
      }, 0);
    }, 0);
    const coinsEarned = totalSets * 10;
    const prs = completedExercises.filter(ex => {
      const bestDone = ex.sets.filter((s: any) => s.done).reduce((best: number, set: any) => {
        return Math.max(best, parseFloat(set.weight) || 0);
      }, 0);
      return bestDone > parseFloat(ex.lastWeight || '0');
    });

    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Hero banner */}
          <View style={ws.heroBanner}>
            <Text style={ws.heroIcon}>⚔️</Text>
            <Text style={ws.heroTitle}>WORKOUT COMPLETE</Text>
            <Text style={ws.heroSub}>The iron remembers your effort.</Text>
          </View>

          {/* Stats row */}
          <View style={ws.statsRow}>
            {[
              { icon: '⏱', label: 'Duration', val: formatTime(finalTime) },
              { icon: '🏋️', label: 'Sets', val: String(totalSets) },
              { icon: '📦', label: 'Volume', val: `${totalVolume.toLocaleString()}lb` },
            ].map(stat => (
              <View key={stat.label} style={ws.statBox}>
                <Text style={ws.statBoxIcon}>{stat.icon}</Text>
                <Text style={ws.statBoxVal}>{stat.val}</Text>
                <Text style={ws.statBoxLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* XP + Coins earned */}
          <View style={ws.rewardsRow}>
            <View style={ws.rewardCard}>
              <Text style={ws.rewardIcon}>⚡</Text>
              <Text style={ws.rewardVal}>+{totalXP}</Text>
              <Text style={ws.rewardLabel}>XP EARNED</Text>
            </View>
            <View style={[ws.rewardCard, { borderColor: 'rgba(201,168,76,0.4)', backgroundColor: 'rgba(201,168,76,0.06)' }]}>
              <Text style={ws.rewardIcon}>🪙</Text>
              <Text style={[ws.rewardVal, { color: '#c9a84c' }]}>+{coinsEarned}</Text>
              <Text style={ws.rewardLabel}>IRON COINS</Text>
            </View>
          </View>

          {/* PRs */}
          {prs.length > 0 && (
            <View style={ws.section}>
              <Text style={ws.sectionTitle}>🏆 PERSONAL RECORDS</Text>
              {prs.map((ex, i) => {
                const bestWeight = ex.sets.filter((s: any) => s.done).reduce((best: number, set: any) => Math.max(best, parseFloat(set.weight) || 0), 0);
                const prev = parseFloat(ex.lastWeight || '0');
                return (
                  <View key={i} style={ws.prCard}>
                    <View style={ws.prIconWrap}><Text style={{ fontSize: 20 }}>🔥</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={ws.prName}>{ex.name}</Text>
                      <Text style={ws.prDetail}>{prev}lb → {bestWeight}lb · +{Math.round(bestWeight - prev)}lb PR</Text>
                    </View>
                    <View style={ws.prBadge}><Text style={ws.prBadgeText}>NEW PR</Text></View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Exercise breakdown */}
          <View style={ws.section}>
            <Text style={ws.sectionTitle}>EXERCISE BREAKDOWN</Text>
            {completedExercises.map((ex, i) => {
              const doneSets = ex.sets.filter((s: any) => s.done);
              const bestSet = doneSets.reduce((best: any, curr: any) => {
                if (!best) return curr;
                return (parseFloat(curr.weight) || 0) > (parseFloat(best.weight) || 0) ? curr : best;
              }, null);
              const est1RM = bestSet ? epley1RM(parseFloat(bestSet.weight) || 0, parseInt(bestSet.reps) || 0) : null;
              const vol = doneSets.reduce((a: number, set: any) => a + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0);
              return (
                <View key={i} style={ws.exCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={ws.exName}>{ex.name}</Text>
                    <Text style={{ fontSize: 11, color: '#888899' }}>{doneSets.length} sets</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    {bestSet && <View><Text style={ws.exStatVal}>{bestSet.weight}lb × {bestSet.reps}</Text><Text style={ws.exStatLabel}>Best Set</Text></View>}
                    {est1RM && <View><Text style={ws.exStatVal}>~{est1RM}lb</Text><Text style={ws.exStatLabel}>Est. 1RM</Text></View>}
                    <View><Text style={ws.exStatVal}>{vol.toLocaleString()}lb</Text><Text style={ws.exStatLabel}>Volume</Text></View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Actions */}
          <View style={{ paddingHorizontal: 16, gap: 10, marginTop: 8 }}>
            <TouchableOpacity style={s.finishBtn} onPress={onBack}>
              <Text style={s.finishText}>🏠 Back to Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ws.secondaryBtn} onPress={() => setTrainView('start')}>
              <Text style={ws.secondaryBtnText}>Start Another Workout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── START VIEW ────────────────────────────────────────────
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

  // ── SESSION VIEW ──────────────────────────────────────────
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
          <TouchableOpacity style={s.finishBtn} onPress={finishWorkout}>
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
// WORKOUT SUMMARY STYLES
// ============================================================

const ws = StyleSheet.create({
  heroBanner: { backgroundColor: '#1a0e0e', borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,76,0.2)', paddingTop: 60, paddingBottom: 28, alignItems: 'center', gap: 6 },
  heroIcon: { fontSize: 48, marginBottom: 4 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#c9a84c', letterSpacing: 4 },
  heroSub: { fontSize: 13, color: '#888899', fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  statBox: { flex: 1, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  statBoxIcon: { fontSize: 20 },
  statBoxVal: { fontSize: 18, fontWeight: '800', color: '#e8e8f0' },
  statBoxLabel: { fontSize: 9, fontWeight: '600', color: '#888899', textTransform: 'uppercase', letterSpacing: 0.5 },
  rewardsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  rewardCard: { flex: 1, backgroundColor: 'rgba(76,201,122,0.06)', borderWidth: 1, borderColor: 'rgba(76,201,122,0.3)', borderRadius: 14, padding: 16, alignItems: 'center', gap: 4 },
  rewardIcon: { fontSize: 24 },
  rewardVal: { fontSize: 24, fontWeight: '900', color: '#4cc97a' },
  rewardLabel: { fontSize: 9, fontWeight: '700', color: '#888899', letterSpacing: 1 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#888899', letterSpacing: 1, marginBottom: 10, marginTop: 8 },
  prCard: { backgroundColor: '#1a1508', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  prIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(201,168,76,0.1)', alignItems: 'center', justifyContent: 'center' },
  prName: { fontSize: 14, fontWeight: '700', color: '#e8e8f0', marginBottom: 2 },
  prDetail: { fontSize: 12, color: '#c9a84c' },
  prBadge: { backgroundColor: '#c9a84c', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  prBadgeText: { fontSize: 9, fontWeight: '900', color: '#0a0a0f', letterSpacing: 1 },
  exCard: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 14, padding: 14, marginBottom: 8 },
  exName: { fontSize: 14, fontWeight: '700', color: '#e8e8f0' },
  exStatVal: { fontSize: 14, fontWeight: '700', color: '#c9a84c', marginBottom: 2 },
  exStatLabel: { fontSize: 9, color: '#888899', textTransform: 'uppercase', letterSpacing: 0.5 },
  secondaryBtn: { padding: 14, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 14, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: '#888899' },
});

// ============================================================
// SUPPLEMENT DATA
// ============================================================

type Supplement = {
  id: string;
  name: string;
  dose: string;
  purpose: string;
  timing: 'morning' | 'evening' | 'post-workout';
  taken: boolean;
  streak: number;
  icon: string;
};

const DEFAULT_SUPPLEMENTS: Supplement[] = [
  { id: 'sup1', name: 'Zinc', dose: '30mg', purpose: 'Testosterone support, immune function', timing: 'morning', taken: false, streak: 12, icon: '🔵' },
  { id: 'sup2', name: 'Vitamin D3', dose: '5000 IU', purpose: 'Hormone optimization, bone health', timing: 'morning', taken: false, streak: 23, icon: '☀️' },
  { id: 'sup3', name: 'Omega-3', dose: '2g', purpose: 'Anti-inflammation, joint health', timing: 'morning', taken: false, streak: 8, icon: '🐟' },
  { id: 'sup4', name: 'Creatine', dose: '5g', purpose: 'Strength and power output', timing: 'morning', taken: false, streak: 31, icon: '⚡' },
  { id: 'sup5', name: 'Magnesium Glycinate', dose: '400mg', purpose: 'Sleep quality, muscle recovery', timing: 'evening', taken: false, streak: 17, icon: '🌙' },
  { id: 'sup6', name: 'Ashwagandha', dose: '600mg', purpose: 'Cortisol reduction, stress relief', timing: 'evening', taken: false, streak: 5, icon: '🌿' },
  { id: 'sup7', name: 'CJC-1295', dose: '100mcg', purpose: 'Growth hormone peptide', timing: 'evening', taken: false, streak: 9, icon: '💉' },
  { id: 'sup8', name: 'Ipamorelin', dose: '100mcg', purpose: 'GH secretagogue, recovery', timing: 'evening', taken: false, streak: 9, icon: '💉' },
  { id: 'sup9', name: 'Whey Protein', dose: '50g', purpose: 'Muscle protein synthesis', timing: 'post-workout', taken: false, streak: 28, icon: '🥛' },
  { id: 'sup10', name: 'L-Glutamine', dose: '5g', purpose: 'Gut health, recovery', timing: 'post-workout', taken: false, streak: 14, icon: '💊' },
];

// ============================================================
// SUPPLEMENT SCREEN
// ============================================================

function SupplementScreen({ onBack }: { onBack: () => void }) {
  const [supplements, setSupplements] = useState<Supplement[]>(DEFAULT_SUPPLEMENTS);
  const [activeGroup, setActiveGroup] = useState<'morning' | 'evening' | 'post-workout'>('morning');
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDose, setNewDose] = useState('');
  const [newPurpose, setNewPurpose] = useState('');
  const [newTiming, setNewTiming] = useState<'morning' | 'evening' | 'post-workout'>('morning');

  const groups = [
    { key: 'morning' as const, label: 'Morning', icon: '🌅', color: '#c9a84c' },
    { key: 'evening' as const, label: 'Evening', icon: '🌙', color: '#7ab0e8' },
    { key: 'post-workout' as const, label: 'Post-Workout', icon: '💪', color: '#4cc97a' },
  ];

  const activeGroupData = groups.find(g => g.key === activeGroup)!;
  const groupSupps = supplements.filter(s => s.timing === activeGroup);
  const takenCount = groupSupps.filter(s => s.taken).length;
  const allTaken = takenCount === groupSupps.length && groupSupps.length > 0;
  const totalTaken = supplements.filter(s => s.taken).length;
  const totalSupps = supplements.length;

  function toggleSupplement(id: string) {
    setSupplements(prev => prev.map(s =>
      s.id === id ? { ...s, taken: !s.taken, streak: !s.taken ? s.streak + 1 : s.streak } : s
    ));
  }

  function logAll() {
    setSupplements(prev => prev.map(s =>
      s.timing === activeGroup ? { ...s, taken: true } : s
    ));
  }

  function addSupplement() {
    if (!newName.trim()) return;
    const newSupp: Supplement = {
      id: `sup_${Date.now()}`,
      name: newName.trim(),
      dose: newDose.trim() || '—',
      purpose: newPurpose.trim() || 'Custom supplement',
      timing: newTiming,
      taken: false,
      streak: 0,
      icon: newTiming === 'morning' ? '🔶' : newTiming === 'evening' ? '🔷' : '🟢',
    };
    setSupplements(prev => [...prev, newSupp]);
    setNewName(''); setNewDose(''); setNewPurpose(''); setAddModal(false);
  }

  function removeSupplement(id: string) {
    setSupplements(prev => prev.filter(s => s.id !== id));
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={s.screenTitle}>SUPPLEMENTS</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 12, color: '#888899' }}>{totalTaken} / {totalSupps} taken today</Text>
          <Text style={{ fontSize: 12, color: '#c9a84c', fontWeight: '700' }}>{totalSupps > 0 ? Math.round((totalTaken / totalSupps) * 100) : 0}%</Text>
        </View>
        <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: '100%', backgroundColor: '#c9a84c', borderRadius: 3, width: `${totalSupps > 0 ? (totalTaken / totalSupps) * 100 : 0}%` as any }} />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabRow}>
        {groups.map(g => {
          const gTaken = supplements.filter(s => s.timing === g.key && s.taken).length;
          const gTotal = supplements.filter(s => s.timing === g.key).length;
          const active = activeGroup === g.key;
          return (
            <TouchableOpacity
              key={g.key}
              style={[s.tab, active && { borderColor: `${g.color}66`, backgroundColor: `${g.color}12` }]}
              onPress={() => setActiveGroup(g.key)}
            >
              <Text style={[s.tabText, active && { color: g.color }]}>{g.icon} {g.label}</Text>
              <Text style={{ fontSize: 10, color: active ? g.color : '#444', marginTop: 2 }}>{gTaken}/{gTotal}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView showsVerticalScrollIndicator={false}>
        {!allTaken && groupSupps.length > 0 && (
          <TouchableOpacity style={sup.logAllBtn} onPress={logAll}>
            <Text style={{ fontSize: 16 }}>{activeGroupData.icon}</Text>
            <Text style={[sup.logAllText, { color: activeGroupData.color }]}>Log Entire {activeGroupData.label} Stack</Text>
          </TouchableOpacity>
        )}
        {allTaken && (
          <View style={sup.allDoneBanner}>
            <Text style={sup.allDoneText}>✓ {activeGroupData.label} stack complete!</Text>
          </View>
        )}
        <View style={{ padding: 16, gap: 10 }}>
          {groupSupps.map(supp => (
            <View key={supp.id} style={[sup.suppCard, supp.taken && sup.suppCardTaken]}>
              <TouchableOpacity
                style={[sup.checkCircle, supp.taken && { backgroundColor: activeGroupData.color, borderColor: activeGroupData.color }]}
                onPress={() => toggleSupplement(supp.id)}
              >
                {supp.taken && <Text style={sup.checkMark}>✓</Text>}
              </TouchableOpacity>
              <View style={sup.suppIconWrap}>
                <Text style={{ fontSize: 22 }}>{supp.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Text style={[sup.suppName, supp.taken && { color: '#888899' }]}>{supp.name}</Text>
                  <View style={sup.doseBadge}><Text style={sup.doseText}>{supp.dose}</Text></View>
                </View>
                <Text style={sup.suppPurpose} numberOfLines={1}>{supp.purpose}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Text style={{ fontSize: 10 }}>🔥</Text>
                  <Text style={sup.streakText}>{supp.streak} day streak</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => removeSupplement(supp.id)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 14, color: '#333344' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <TouchableOpacity style={sup.addBtn} onPress={() => { setNewTiming(activeGroup); setAddModal(true); }}>
          <Text style={sup.addBtnText}>+ Add Supplement to {activeGroupData.label}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
      <Modal visible={addModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Add Supplement</Text>
            <Text style={sup.inputLabel}>NAME</Text>
            <TextInput style={s.modalInput} value={newName} onChangeText={setNewName} placeholder="e.g. Vitamin C" placeholderTextColor="#444" autoFocus />
            <Text style={sup.inputLabel}>DOSE</Text>
            <TextInput style={s.modalInput} value={newDose} onChangeText={setNewDose} placeholder="e.g. 1000mg" placeholderTextColor="#444" />
            <Text style={sup.inputLabel}>PURPOSE</Text>
            <TextInput style={s.modalInput} value={newPurpose} onChangeText={setNewPurpose} placeholder="e.g. Immune support" placeholderTextColor="#444" />
            <Text style={sup.inputLabel}>TIMING</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {groups.map(g => (
                <TouchableOpacity
                  key={g.key}
                  style={[sup.timingBtn, newTiming === g.key && { borderColor: g.color, backgroundColor: `${g.color}15` }]}
                  onPress={() => setNewTiming(g.key)}
                >
                  <Text style={[sup.timingBtnText, newTiming === g.key && { color: g.color }]}>{g.icon} {g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setAddModal(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={addSupplement}>
                <Text style={s.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================
// SUPPLEMENT STYLES
// ============================================================

const sup = StyleSheet.create({
  logAllBtn: { marginHorizontal: 16, marginBottom: 4, padding: 14, backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  logAllText: { fontSize: 14, fontWeight: '700' },
  allDoneBanner: { marginHorizontal: 16, marginBottom: 4, padding: 12, backgroundColor: 'rgba(76,201,122,0.08)', borderWidth: 1, borderColor: 'rgba(76,201,122,0.25)', borderRadius: 12, alignItems: 'center' },
  allDoneText: { fontSize: 13, fontWeight: '700', color: '#4cc97a' },
  suppCard: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  suppCardTaken: { opacity: 0.6, borderColor: 'rgba(76,201,122,0.15)' },
  checkCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#2a2a3a', alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 13, color: '#0a0a0f', fontWeight: '700' },
  suppIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  suppName: { fontSize: 14, fontWeight: '700', color: '#e8e8f0' },
  doseBadge: { backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  doseText: { fontSize: 10, fontWeight: '600', color: '#c9a84c' },
  suppPurpose: { fontSize: 11, color: '#888899' },
  streakText: { fontSize: 11, color: '#c9a84c', fontWeight: '600' },
  addBtn: { marginHorizontal: 16, marginTop: 4, padding: 14, borderWidth: 1.5, borderColor: '#2a2a3a', borderStyle: 'dashed', borderRadius: 12, alignItems: 'center' },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#888899' },
  inputLabel: { fontSize: 10, fontWeight: '600', color: '#444455', letterSpacing: 1, marginBottom: 6 },
  timingBtn: { flex: 1, padding: 8, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 8, alignItems: 'center' },
  timingBtnText: { fontSize: 11, fontWeight: '600', color: '#888899' },
});

// ============================================================
// BODY WEIGHT SCREEN
// ============================================================

function BodyWeightScreen({ onBack, userId }: { onBack: () => void; userId: string }) {
  const [entries, setEntries] = useState<{ id: string; weight: number; date: string }[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadEntries(); }, []);

  async function loadEntries() {
    setLoading(true);
    const { data } = await supabase
      .from('body_weight')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30);
    if (data) setEntries(data);
    setLoading(false);
  }

  async function logWeight() {
    if (!newWeight.trim() || isNaN(parseFloat(newWeight))) return;
    setSaving(true);
    const { data, error } = await supabase.from('body_weight').insert({
      user_id: userId,
      weight: parseFloat(newWeight),
      date: new Date().toISOString().split('T')[0],
    }).select().single();
    if (data) setEntries(prev => [data, ...prev]);
    setNewWeight('');
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    await supabase.from('body_weight').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latest = sorted[sorted.length - 1]?.weight;
  const earliest = sorted[0]?.weight;
  const change = latest && earliest ? latest - earliest : null;
  const goal = goalWeight ? parseFloat(goalWeight) : null;

  // Simple bar chart
  const maxW = sorted.length ? Math.max(...sorted.map(e => e.weight)) : 1;
  const minW = sorted.length ? Math.min(...sorted.map(e => e.weight)) : 0;
  const range = maxW - minW || 1;

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={s.screenTitle}>BODY WEIGHT</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Log new weight */}
        <View style={{ padding: 16 }}>
          <View style={bw.logCard}>
            <Text style={bw.logLabel}>LOG TODAY'S WEIGHT</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TextInput
                style={[s.modalInput, { flex: 1, marginBottom: 0 }]}
                value={newWeight}
                onChangeText={setNewWeight}
                placeholder="e.g. 185.5"
                placeholderTextColor="#444"
                keyboardType="numeric"
              />
              <TouchableOpacity style={bw.logBtn} onPress={logWeight} disabled={saving}>
                {saving ? <ActivityIndicator color="#0a0a0f" size="small" /> : <Text style={bw.logBtnText}>Log</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats */}
          {entries.length > 0 && (
            <View style={bw.statsRow}>
              <View style={bw.statBox}>
                <Text style={bw.statVal}>{latest}lb</Text>
                <Text style={bw.statLabel}>Current</Text>
              </View>
              {change !== null && (
                <View style={bw.statBox}>
                  <Text style={[bw.statVal, { color: change < 0 ? '#4cc97a' : change > 0 ? '#ef4444' : '#888899' }]}>
                    {change > 0 ? '+' : ''}{change.toFixed(1)}lb
                  </Text>
                  <Text style={bw.statLabel}>Total Change</Text>
                </View>
              )}
              {goal && latest && (
                <View style={bw.statBox}>
                  <Text style={[bw.statVal, { color: '#c9a84c' }]}>{Math.abs(latest - goal).toFixed(1)}lb</Text>
                  <Text style={bw.statLabel}>To Goal</Text>
                </View>
              )}
            </View>
          )}

          {/* Goal input */}
          <View style={bw.goalRow}>
            <Text style={{ fontSize: 12, color: '#888899', flex: 1 }}>Goal weight (optional)</Text>
            <TextInput
              style={bw.goalInput}
              value={goalWeight}
              onChangeText={setGoalWeight}
              placeholder="lbs"
              placeholderTextColor="#444"
              keyboardType="numeric"
            />
          </View>

          {/* Trend chart */}
          {sorted.length > 1 && (
            <View style={bw.chartCard}>
              <Text style={bw.chartTitle}>30-DAY TREND</Text>
              <View style={bw.chartBars}>
                {sorted.slice(-14).map((entry, i) => {
                  const h = Math.max(((entry.weight - minW) / range) * 80 + 10, 10);
                  const isLatest = i === sorted.slice(-14).length - 1;
                  return (
                    <View key={entry.id} style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 8, color: isLatest ? '#c9a84c' : '#333344', marginBottom: 2 }}>
                        {isLatest ? `${entry.weight}` : ''}
                      </Text>
                      <View style={[bw.bar, { height: h, backgroundColor: isLatest ? '#c9a84c' : '#2a2a3a' }]} />
                      <Text style={{ fontSize: 7, color: '#333344', marginTop: 2 }}>
                        {entry.date.slice(5)}
                      </Text>
                    </View>
                  );
                })}
                {goal && (
                  <View style={[bw.goalLine, { bottom: Math.max(((goal - minW) / range) * 80 + 10, 10) + 16 }]} />
                )}
              </View>
            </View>
          )}

          {/* Log history */}
          <Text style={[s.sectionTitle, { marginTop: 16, marginBottom: 10 }]}>HISTORY</Text>
          {loading ? <ActivityIndicator color="#c9a84c" style={{ padding: 20 }} /> :
            entries.length === 0 ? (
              <Text style={{ color: '#444', textAlign: 'center', padding: 20 }}>No entries yet. Log your first weight above.</Text>
            ) : (
              entries.map(entry => (
                <View key={entry.id} style={bw.entryRow}>
                  <Text style={bw.entryDate}>{entry.date}</Text>
                  <Text style={bw.entryWeight}>{entry.weight} lb</Text>
                  <TouchableOpacity onPress={() => deleteEntry(entry.id)}>
                    <Text style={{ fontSize: 14, color: '#333344' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            )
          }
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const bw = StyleSheet.create({
  logCard: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 16, padding: 16, marginBottom: 12 },
  logLabel: { fontSize: 10, fontWeight: '700', color: '#888899', letterSpacing: 1 },
  logBtn: { backgroundColor: '#c9a84c', borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' },
  logBtnText: { fontSize: 14, fontWeight: '700', color: '#0a0a0f' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: '#e8e8f0', marginBottom: 2 },
  statLabel: { fontSize: 9, color: '#888899', textTransform: 'uppercase', letterSpacing: 0.5 },
  goalRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 12, padding: 14, marginBottom: 12 },
  goalInput: { backgroundColor: '#1c1c2a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 8, padding: 8, fontSize: 14, color: '#e8e8f0', width: 70, textAlign: 'center' },
  chartCard: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 16, padding: 16, marginBottom: 12 },
  chartTitle: { fontSize: 10, fontWeight: '700', color: '#888899', letterSpacing: 1, marginBottom: 12 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 2, position: 'relative' },
  bar: { flex: 1, borderRadius: 3 },
  goalLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(201,168,76,0.4)', borderStyle: 'dashed' },
  entryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 12, padding: 14, marginBottom: 8 },
  entryDate: { flex: 1, fontSize: 13, color: '#888899' },
  entryWeight: { fontSize: 15, fontWeight: '700', color: '#c9a84c', marginRight: 12 },
});

// ============================================================
// AI COACH SCREEN
// ============================================================

function CoachScreen({ onBack, userId, character }: { onBack: () => void; userId: string; character: any }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<any>(null);

  const chosenClass = CLASSES.find(c => c.id === character?.classId);

  const systemPrompt = `You are the AI coach for IronLore, a LitRPG fitness app. The user's warrior class is ${chosenClass?.name || 'Warrior'}. 

Your personality: ${chosenClass?.coach || '"No excuses. Add weight."'}

You are ${chosenClass?.name === 'Warrior' ? 'gruff, direct, and battle-hardened. You speak in short, punchy sentences. No fluff.' :
    chosenClass?.name === 'Ranger' ? 'calm, technical, and precise. You focus on consistency and data.' :
    chosenClass?.name === 'Monk' ? 'philosophical and balanced. You speak with wisdom and calm.' :
    'intense, aggressive, and hype. You motivate with fire and energy.'}

The user's name is ${character?.name || 'Warrior'}. Always stay in character. Keep responses concise — 2-4 sentences max unless asked for detail. Reference their fitness journey, class, and goals. Never break immersion.`;

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: chosenClass?.name === 'Warrior' ? `${character?.name}. You're here. Good. The forge waits for no one. What do you need?` :
        chosenClass?.name === 'Ranger' ? `Welcome back, ${character?.name}. Ready to analyze your progress and plan your next move?` :
        chosenClass?.name === 'Monk' ? `${character?.name}. The mind is still. The body is ready. How can I guide you today?` :
        `${character?.name}! YOU'RE HERE! The iron is HOT and we're about to go BEAST MODE. What are we destroying today?!`
    }]);
  }, []);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user' as const, content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await fetch('https://blrvttulfyeoqromogfz.supabase.co/functions/v1/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscnZ0dHVsZnllb3Fyb21vZ2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjgxOTIsImV4cCI6MjA5Mjk0NDE5Mn0.qVS81Q1cLxO5rBmAQTBwAgwYVr_fVkfJ6UZwd0s7Tb0`,
        },
        body: JSON.stringify({
          systemPrompt,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "The forge is silent. Try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: "The connection to the Iron Realm was lost. Try again." }]);
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={s.screenTitle}>COACH</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Coach header */}
      <View style={co.coachHeader}>
        <View style={[co.coachAvatar, { backgroundColor: `${chosenClass?.color}30` }]}>
          <Text style={{ fontSize: 28 }}>{chosenClass?.icon || '⚔️'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[co.coachName, { color: chosenClass?.color || '#c9a84c' }]}>
            {chosenClass?.name || 'Warrior'} Coach
          </Text>
          <Text style={co.coachTagline}>{chosenClass?.tagline || 'Forge your body in iron and fire'}</Text>
        </View>
        <View style={co.onlineDot} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, i) => (
          <View key={i} style={[co.bubble, msg.role === 'user' ? co.userBubble : co.assistantBubble]}>
            {msg.role === 'assistant' && (
              <Text style={{ fontSize: 16, marginBottom: 4 }}>{chosenClass?.icon || '⚔️'}</Text>
            )}
            <Text style={[co.bubbleText, msg.role === 'user' && co.userBubbleText]}>{msg.content}</Text>
          </View>
        ))}
        {loading && (
          <View style={co.assistantBubble}>
            <ActivityIndicator color="#c9a84c" size="small" />
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Input */}
      <View style={co.inputRow}>
        <TextInput
          style={co.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask your coach..."
          placeholderTextColor="#444"
          multiline
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[co.sendBtn, { backgroundColor: input.trim() ? '#c9a84c' : '#2a2a3a' }]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Text style={{ fontSize: 18 }}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const co = StyleSheet.create({
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a2a' },
  coachAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  coachName: { fontSize: 15, fontWeight: '700' },
  coachTagline: { fontSize: 11, color: '#888899', fontStyle: 'italic' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4cc97a' },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 14 },
  assistantBubble: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: '#c9a84c', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: '#e8e8f0', lineHeight: 20 },
  userBubbleText: { color: '#0a0a0f', fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 32, gap: 10, borderTopWidth: 1, borderTopColor: '#1a1a2a' },
  input: { flex: 1, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 14, padding: 12, fontSize: 14, color: '#e8e8f0', maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

// ============================================================
// PROFILE SCREEN
// ============================================================

function ProfileScreen({ onBack, userId, character, coins, onSignOut }: {
  onBack: () => void;
  userId: string;
  character: any;
  coins: number;
  onSignOut: () => void;
}) {
  const [workoutCount, setWorkoutCount] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [loading, setLoading] = useState(true);

  const chosenClass = CLASSES.find(c => c.id === character?.classId);
  const chosenGoal = GOAL_PATHS.find(g => g.id === character?.goalId);
  const classTitle = chosenClass?.name === 'Monk' ? 'Ascendant' : chosenClass?.name === 'Ranger' ? 'Swift' : chosenClass?.name === 'Berserker' ? 'Unbound' : 'Ironborn';

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    setLoading(true);
    const { data } = await supabase.from('workouts').select('total_volume').eq('user_id', userId);
    if (data) {
      setWorkoutCount(data.length);
      setTotalVolume(data.reduce((acc, w) => acc + (w.total_volume || 0), 0));
    }
    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    onSignOut();
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={s.screenTitle}>PROFILE</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Character card */}
        <View style={pr.heroCard}>
          <View style={[pr.avatar, { backgroundColor: `${chosenClass?.color}40`, borderColor: chosenClass?.color || '#c9a84c' }]}>
            <Text style={{ fontSize: 40 }}>{chosenClass?.icon || '⚔️'}</Text>
          </View>
          <Text style={[pr.name, { color: chosenClass?.color || '#c9a84c' }]}>{character?.name || 'Warrior'}</Text>
          <Text style={pr.title}>the {classTitle}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <View style={[pr.badge, { backgroundColor: `${chosenClass?.color}20`, borderColor: `${chosenClass?.color}50` }]}>
              <Text style={[pr.badgeText, { color: chosenClass?.color }]}>{chosenClass?.name?.toUpperCase()} CLASS</Text>
            </View>
            {chosenGoal && (
              <View style={[pr.badge, { backgroundColor: `${chosenGoal.color}20`, borderColor: `${chosenGoal.color}50` }]}>
                <Text style={[pr.badgeText, { color: chosenGoal.color }]}>{chosenGoal.icon} {chosenGoal.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Workouts', val: loading ? '—' : String(workoutCount), icon: '🏋️' },
            { label: 'Volume', val: loading ? '—' : `${(totalVolume / 1000).toFixed(1)}k`, icon: '📦' },
            { label: 'Coins', val: coins.toLocaleString(), icon: '🪙' },
          ].map(stat => (
            <View key={stat.label} style={pr.statBox}>
              <Text style={{ fontSize: 18, marginBottom: 4 }}>{stat.icon}</Text>
              <Text style={pr.statVal}>{stat.val}</Text>
              <Text style={pr.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Class stats */}
        {chosenClass && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={[s.sectionTitle, { marginBottom: 10 }]}>BASE STATS</Text>
            <View style={s.statsGrid}>
              {Object.entries(chosenClass.stats).map(([stat, val]) => {
                const icons: Record<string, string> = { Strength: '💪', Vitality: '❤️', Endurance: '⚡', Focus: '🧠' };
                return (
                  <View key={stat} style={s.statCard}>
                    <Text style={{ fontSize: 14, marginBottom: 2 }}>{icons[stat]}</Text>
                    <Text style={s.statVal}>{val * 10}</Text>
                    <Text style={s.statName}>{stat}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={[s.sectionTitle, { marginBottom: 10 }]}>SETTINGS</Text>
          <TouchableOpacity style={pr.settingRow} onPress={handleSignOut}>
            <Text style={{ fontSize: 18 }}>🚪</Text>
            <Text style={pr.settingText}>Sign Out</Text>
            <Text style={{ fontSize: 16, color: '#444' }}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const pr = StyleSheet.create({
  heroCard: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a2a', marginBottom: 16 },
  avatar: { width: 90, height: 90, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  name: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  title: { fontSize: 14, color: '#888899', fontStyle: 'italic' },
  badge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statBox: { flex: 1, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 14, padding: 14, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: '#e8e8f0', marginBottom: 2 },
  statLabel: { fontSize: 9, color: '#888899', textTransform: 'uppercase', letterSpacing: 0.5 },
  settingRow: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  settingText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#e8e8f0' },
});

// ============================================================
// ONBOARDING DATA
// ============================================================

const CLASSES = [
  {
    id: 'warrior',
    icon: '⚔️',
    name: 'Warrior',
    tagline: 'Forge your body in iron and fire',
    desc: 'Built for the barbell. Strength and muscle are your obsession.',
    coach: '"No excuses. Add weight."',
    color: '#c94c4c',
    stats: { Strength: 5, Vitality: 4, Endurance: 2, Focus: 2 },
    best: 'Powerlifters · Bodybuilders · Strength athletes',
  },
  {
    id: 'ranger',
    icon: '🏹',
    name: 'Ranger',
    tagline: 'Swift, lean, and relentless',
    desc: 'Cardio is your weapon. Endurance and fat loss define your path.',
    coach: '"Consistency over intensity."',
    color: '#4cc97a',
    stats: { Strength: 2, Vitality: 4, Endurance: 5, Focus: 3 },
    best: 'Runners · Cyclists · Fat loss focus',
  },
  {
    id: 'monk',
    icon: '🧘',
    name: 'Monk',
    tagline: 'The body follows the mind',
    desc: 'Balance, mindfulness, and wellness. All stats grow in harmony.',
    coach: '"The body follows the mind."',
    color: '#7ab0e8',
    stats: { Strength: 3, Vitality: 3, Endurance: 3, Focus: 5 },
    best: 'Yoga · Meditation · Wellness focus',
  },
  {
    id: 'berserker',
    icon: '🔥',
    name: 'Berserker',
    tagline: 'You were born for this',
    desc: 'Maximum intensity. All stats grow faster — but consistency is everything.',
    coach: '"YOU WERE BORN FOR THIS."',
    color: '#f97316',
    stats: { Strength: 4, Vitality: 3, Endurance: 4, Focus: 3 },
    best: 'HIIT · CrossFit · Sport athletes',
  },
];

const GOAL_PATHS = [
  { id: 'ironborn', icon: '🏋️', name: 'Ironborn', desc: 'Build maximum strength and muscle mass', color: '#c94c4c' },
  { id: 'blade', icon: '🗡️', name: 'Blade', desc: 'Cut body fat and get lean and defined', color: '#c9a84c' },
  { id: 'monk', icon: '☯️', name: 'Monk Path', desc: 'Balanced wellness, mind and body together', color: '#7ab0e8' },
  { id: 'warrior', icon: '⚡', name: 'Warrior', desc: 'Athletic performance and sport-specific training', color: '#4cc97a' },
  { id: 'builder', icon: '🔄', name: 'Builder', desc: 'Body recomposition — gain muscle, lose fat simultaneously', color: '#a855f7' },
];

// ============================================================
// ONBOARDING SCREEN
// ============================================================

type CharacterData = {
  name: string;
  classId: string;
  goalId: string;
};

function OnboardingScreen({ onComplete }: { onComplete: (data: CharacterData) => void }) {
  const [step, setStep] = useState(0);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [name, setName] = useState('');
  const [revealed, setRevealed] = useState(false);

  const chosenClass = CLASSES.find(c => c.id === selectedClass);
  const chosenGoal = GOAL_PATHS.find(g => g.id === selectedGoal);

  function nextStep() { setStep(s => s + 1); }

  function handleReveal() {
    setRevealed(true);
    setTimeout(() => {
      onComplete({ name: name.trim() || 'Warrior', classId: selectedClass, goalId: selectedGoal });
    }, 1800);
  }

  if (step === 0) {
    return (
      <View style={ob.root}>
        <StatusBar style="light" />
        <View style={ob.welcomeContainer}>
          <View style={ob.emblemWrap}>
            <Text style={ob.emblemTop}>⚔</Text>
            <View style={ob.emblemDivider} />
            <Text style={ob.emblemBottom}>⚔</Text>
          </View>
          <Text style={ob.welcomeTitle}>IRONLORE</Text>
          <Text style={ob.welcomeSub}>Your fitness journey becomes legend.</Text>
          <Text style={ob.welcomeBody}>
            Build your warrior. Track every rep, every meal, every milestone.
            Level up in the real world.
          </Text>
          <View style={ob.runeRow}>
            {['⚔️', '🛡️', '🔥', '💀', '👑'].map((r, i) => (
              <Text key={i} style={[ob.rune, { opacity: 0.15 + i * 0.15 }]}>{r}</Text>
            ))}
          </View>
          <TouchableOpacity style={ob.primaryBtn} onPress={nextStep}>
            <Text style={ob.primaryBtnText}>BEGIN YOUR JOURNEY</Text>
          </TouchableOpacity>
          <Text style={ob.welcomeFooter}>Free forever · No credit card required</Text>
        </View>
      </View>
    );
  }

  if (step === 1) {
    return (
      <View style={ob.root}>
        <StatusBar style="light" />
        <View style={ob.stepHeader}>
          <Text style={ob.stepNum}>STEP 1 OF 3</Text>
          <Text style={ob.stepTitle}>Choose Your Class</Text>
          <Text style={ob.stepDesc}>Your class shapes your stats growth and your AI coach's personality.</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
          {CLASSES.map(cls => {
            const active = selectedClass === cls.id;
            return (
              <TouchableOpacity
                key={cls.id}
                style={[ob.classCard, active && { borderColor: cls.color, backgroundColor: `${cls.color}10` }]}
                onPress={() => setSelectedClass(cls.id)}
              >
                <View style={[ob.classIconWrap, { backgroundColor: `${cls.color}18` }]}>
                  <Text style={ob.classIcon}>{cls.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Text style={[ob.className, active && { color: cls.color }]}>{cls.name}</Text>
                    {active && <View style={[ob.selectedTag, { backgroundColor: cls.color }]}><Text style={ob.selectedTagText}>Selected</Text></View>}
                  </View>
                  <Text style={ob.classTagline}>{cls.tagline}</Text>
                  <Text style={ob.classDesc}>{cls.desc}</Text>
                  <Text style={ob.classCoach}>{cls.coach}</Text>
                  <View style={{ marginTop: 10, gap: 4 }}>
                    {Object.entries(cls.stats).map(([stat, val]) => (
                      <View key={stat} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={ob.statLabel}>{stat}</Text>
                        <View style={ob.statBarBg}>
                          <View style={[ob.statBarFill, { width: `${(val / 5) * 100}%` as any, backgroundColor: active ? cls.color : '#444' }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                  <Text style={ob.classBest}>Best for: {cls.best}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={ob.footer}>
          <TouchableOpacity
            style={[ob.primaryBtn, !selectedClass && ob.primaryBtnDisabled]}
            onPress={() => selectedClass && nextStep()}
          >
            <Text style={ob.primaryBtnText}>CONTINUE →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 2) {
    return (
      <View style={ob.root}>
        <StatusBar style="light" />
        <View style={ob.stepHeader}>
          <Text style={ob.stepNum}>STEP 2 OF 3</Text>
          <Text style={ob.stepTitle}>Name Your Warrior</Text>
          <Text style={ob.stepDesc}>This is how you'll be known in the Iron Realm.</Text>
        </View>
        <View style={{ padding: 24 }}>
          <View style={[ob.classIconWrap, { alignSelf: 'center', width: 72, height: 72, borderRadius: 20, marginBottom: 24, backgroundColor: `${chosenClass?.color}20` }]}>
            <Text style={{ fontSize: 36 }}>{chosenClass?.icon}</Text>
          </View>
          <TextInput
            style={ob.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name..."
            placeholderTextColor="#444"
            maxLength={20}
            autoFocus
          />
          <Text style={ob.namePreview}>
            {name.trim() ? `${name.trim()} the ${chosenClass?.name === 'Monk' ? 'Ascendant' : chosenClass?.name === 'Ranger' ? 'Swift' : chosenClass?.name === 'Berserker' ? 'Unbound' : 'Ironborn'}` : 'Your name · the Ironborn'}
          </Text>
          <View style={{ marginTop: 24, gap: 10 }}>
            <Text style={ob.suggestLabel}>SUGGESTED NAMES</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['Garrett', 'Kael', 'Theron', 'Dax', 'Riven', 'Sora', 'Mara', 'Lyric'].map(n => (
                <TouchableOpacity key={n} style={ob.suggestPill} onPress={() => setName(n)}>
                  <Text style={ob.suggestPillText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        <View style={ob.footer}>
          <TouchableOpacity style={ob.primaryBtn} onPress={nextStep}>
            <Text style={ob.primaryBtnText}>CONTINUE →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 3) {
    return (
      <View style={ob.root}>
        <StatusBar style="light" />
        <View style={ob.stepHeader}>
          <Text style={ob.stepNum}>STEP 3 OF 3</Text>
          <Text style={ob.stepTitle}>Choose Your Path</Text>
          <Text style={ob.stepDesc}>Your goal path focuses your daily quests and AI coach recommendations.</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}>
          {GOAL_PATHS.map(goal => {
            const active = selectedGoal === goal.id;
            return (
              <TouchableOpacity
                key={goal.id}
                style={[ob.goalCard, active && { borderColor: goal.color, backgroundColor: `${goal.color}0d` }]}
                onPress={() => setSelectedGoal(goal.id)}
              >
                <Text style={ob.goalIcon}>{goal.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[ob.goalName, active && { color: goal.color }]}>{goal.name}</Text>
                  <Text style={ob.goalDesc}>{goal.desc}</Text>
                </View>
                <View style={[ob.radioOuter, active && { borderColor: goal.color }]}>
                  {active && <View style={[ob.radioInner, { backgroundColor: goal.color }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={ob.footer}>
          <TouchableOpacity
            style={[ob.primaryBtn, !selectedGoal && ob.primaryBtnDisabled]}
            onPress={() => selectedGoal && nextStep()}
          >
            <Text style={ob.primaryBtnText}>FORGE MY CHARACTER →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={ob.root}>
      <StatusBar style="light" />
      <View style={ob.revealContainer}>
        <Text style={ob.revealEyebrow}>YOUR WARRIOR AWAITS</Text>
        <View style={[ob.revealAvatar, { borderColor: chosenClass?.color || '#c9a84c', shadowColor: chosenClass?.color || '#c9a84c' }]}>
          <Text style={{ fontSize: 52 }}>{chosenClass?.icon}</Text>
        </View>
        <Text style={[ob.revealName, { color: chosenClass?.color || '#c9a84c' }]}>
          {name.trim() || 'Warrior'}
        </Text>
        <Text style={ob.revealTitle}>
          the {chosenClass?.name === 'Monk' ? 'Ascendant' : chosenClass?.name === 'Ranger' ? 'Swift' : chosenClass?.name === 'Berserker' ? 'Unbound' : 'Ironborn'}
        </Text>
        <View style={[ob.revealClassBadge, { backgroundColor: `${chosenClass?.color}20`, borderColor: `${chosenClass?.color}50` }]}>
          <Text style={[ob.revealClassText, { color: chosenClass?.color }]}>{chosenClass?.name?.toUpperCase()} CLASS</Text>
        </View>
        <View style={[ob.revealGoalBadge, { backgroundColor: `${chosenGoal?.color}15`, borderColor: `${chosenGoal?.color}40` }]}>
          <Text style={{ fontSize: 14 }}>{chosenGoal?.icon}</Text>
          <Text style={[ob.revealGoalText, { color: chosenGoal?.color }]}>{chosenGoal?.name} Path</Text>
        </View>
        <View style={ob.revealStats}>
          {chosenClass && Object.entries(chosenClass.stats).map(([stat, val]) => (
            <View key={stat} style={ob.revealStatItem}>
              <Text style={[ob.revealStatVal, { color: chosenClass.color }]}>{val * 10}</Text>
              <Text style={ob.revealStatName}>{stat}</Text>
            </View>
          ))}
        </View>
        <Text style={ob.revealCoach}>{chosenClass?.coach}</Text>
        <TouchableOpacity
          style={[ob.primaryBtn, { marginTop: 24, opacity: revealed ? 0.5 : 1 }]}
          onPress={handleReveal}
          disabled={revealed}
        >
          <Text style={ob.primaryBtnText}>{revealed ? 'ENTERING THE FORGE...' : '⚔  ENTER THE FORGE'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================
// ONBOARDING STYLES
// ============================================================

const ob = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0f' },
  welcomeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emblemWrap: { alignItems: 'center', marginBottom: 20 },
  emblemTop: { fontSize: 28, color: 'rgba(201,168,76,0.6)' },
  emblemDivider: { width: 60, height: 1, backgroundColor: 'rgba(201,168,76,0.3)', marginVertical: 6 },
  emblemBottom: { fontSize: 28, color: 'rgba(201,168,76,0.6)' },
  welcomeTitle: { fontSize: 42, fontWeight: '900', color: '#c9a84c', letterSpacing: 8, marginBottom: 8 },
  welcomeSub: { fontSize: 14, color: '#888899', fontStyle: 'italic', marginBottom: 20, textAlign: 'center' },
  welcomeBody: { fontSize: 14, color: '#666677', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  runeRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  rune: { fontSize: 22 },
  primaryBtn: { backgroundColor: '#c9a84c', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', width: '100%' },
  primaryBtnDisabled: { backgroundColor: '#2a2a3a' },
  primaryBtnText: { fontSize: 15, fontWeight: '900', color: '#0a0a0f', letterSpacing: 2 },
  welcomeFooter: { fontSize: 11, color: '#333344', marginTop: 14 },
  stepHeader: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a2a' },
  stepNum: { fontSize: 10, fontWeight: '700', color: '#c9a84c', letterSpacing: 2, marginBottom: 6 },
  stepTitle: { fontSize: 26, fontWeight: '900', color: '#e8e8f0', marginBottom: 6 },
  stepDesc: { fontSize: 13, color: '#888899', lineHeight: 18 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, backgroundColor: 'rgba(10,10,15,0.97)', borderTopWidth: 1, borderTopColor: '#1a1a2a' },
  classCard: { backgroundColor: '#12121a', borderWidth: 1.5, borderColor: '#2a2a3a', borderRadius: 18, padding: 16, flexDirection: 'row', gap: 14 },
  classIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  classIcon: { fontSize: 26 },
  className: { fontSize: 17, fontWeight: '800', color: '#e8e8f0' },
  classTagline: { fontSize: 12, color: '#c9a84c', fontStyle: 'italic', marginBottom: 4 },
  classDesc: { fontSize: 12, color: '#888899', lineHeight: 17 },
  classCoach: { fontSize: 11, color: '#555566', fontStyle: 'italic', marginTop: 4 },
  selectedTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  selectedTagText: { fontSize: 9, fontWeight: '700', color: '#0a0a0f', textTransform: 'uppercase', letterSpacing: 0.5 },
  statLabel: { fontSize: 9, color: '#666677', textTransform: 'uppercase', letterSpacing: 0.5, width: 66 },
  statBarBg: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 2 },
  classBest: { fontSize: 10, color: '#444455', marginTop: 8, fontStyle: 'italic' },
  nameInput: { backgroundColor: '#12121a', borderWidth: 1.5, borderColor: '#2a2a3a', borderRadius: 14, padding: 16, fontSize: 20, fontWeight: '700', color: '#e8e8f0', textAlign: 'center', marginBottom: 10 },
  namePreview: { fontSize: 14, color: '#c9a84c', textAlign: 'center', fontStyle: 'italic' },
  suggestLabel: { fontSize: 10, fontWeight: '600', color: '#444455', letterSpacing: 1 },
  suggestPill: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  suggestPillText: { fontSize: 13, color: '#888899' },
  goalCard: { backgroundColor: '#12121a', borderWidth: 1.5, borderColor: '#2a2a3a', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  goalIcon: { fontSize: 28 },
  goalName: { fontSize: 15, fontWeight: '700', color: '#e8e8f0', marginBottom: 3 },
  goalDesc: { fontSize: 12, color: '#888899' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#2a2a3a', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  revealContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  revealEyebrow: { fontSize: 10, fontWeight: '700', color: '#c9a84c', letterSpacing: 3, marginBottom: 20 },
  revealAvatar: { width: 110, height: 110, borderRadius: 28, borderWidth: 3, backgroundColor: '#1a0e0e', alignItems: 'center', justifyContent: 'center', marginBottom: 18, shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  revealName: { fontSize: 34, fontWeight: '900', marginBottom: 4 },
  revealTitle: { fontSize: 14, color: '#888899', fontStyle: 'italic', marginBottom: 14 },
  revealClassBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 10 },
  revealClassText: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  revealGoalBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 20 },
  revealGoalText: { fontSize: 12, fontWeight: '600' },
  revealStats: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  revealStatItem: { alignItems: 'center' },
  revealStatVal: { fontSize: 22, fontWeight: '900' },
  revealStatName: { fontSize: 9, color: '#888899', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  revealCoach: { fontSize: 12, color: '#555566', fontStyle: 'italic', textAlign: 'center' },
});

// ============================================================
// HOME SCREEN
// ============================================================

export default function HomeScreen() {
  const [screen, setScreen] = useState<'home' | 'train' | 'nutrition' | 'achievements' | 'shop' | 'supplements' | 'bodyweight' | 'coach' | 'profile'>('home');
  const [coins, setCoins] = useState(1250);
  const [hasCharacter, setHasCharacter] = useState(false);
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadProfile(session.user.id);
      }
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadProfile(session.user.id);
      } else {
        setUserId(null);
        setHasCharacter(false);
        setCharacter(null);
      }
    });
    registerForPushNotifications();
    return () => subscription.unsubscribe();
  }, []);

  async function registerForPushNotifications() {
    if (!Device.isDevice) return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
  }

  async function scheduleCoachReminder(characterName: string, coachPersonality: string) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'IRONLORE',
        body: coachPersonality === 'warrior' ? `${characterName}. The forge grows cold. You haven't trained today.` :
          coachPersonality === 'berserker' ? `${characterName}!! GET UP. The iron is waiting. LET'S GO.` :
          coachPersonality === 'ranger' ? `${characterName}, consistency is everything. Time to train.` :
          `${characterName}, the body follows the mind. Return to your practice.`,
      },
      trigger: { hour: 18, minute: 0, repeats: true },
    });
  }

  async function loadProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data?.name && data?.class_id) {
      setCharacter({ name: data.name, classId: data.class_id, goalId: data.goal_id || '' });
      setCoins(data.coins || 1250);
      setHasCharacter(true);
    }
  }

  async function handleOnboardingComplete(data: CharacterData) {
    setCharacter(data);
    setHasCharacter(true);
    if (userId) {
      await supabase.from('profiles').update({
        name: data.name,
        class_id: data.classId,
        goal_id: data.goalId,
      }).eq('id', userId);
    }
  }

  function earnCoins(amount: number) { setCoins(c => c + amount); }
  function spendCoins(amount: number) { setCoins(c => c - amount); }

  if (!authChecked) {
    return <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#c9a84c" size="large" /></View>;
  }

  if (!userId) return <AuthScreen onAuth={() => {}} />;
  if (!hasCharacter) return <OnboardingScreen onComplete={handleOnboardingComplete} />;

  const chosenClass = CLASSES.find(c => c.id === character?.classId);
  const classTitle = chosenClass?.name === 'Monk' ? 'Ascendant' : chosenClass?.name === 'Ranger' ? 'Swift' : chosenClass?.name === 'Berserker' ? 'Unbound' : 'Ironborn';
  const charDisplayName = character ? `${character.name} the ${classTitle}` : 'Warrior';
  const charClassLabel = chosenClass ? `${chosenClass.icon} ${chosenClass.name.toUpperCase()} CLASS` : '⚔ WARRIOR CLASS';

  if (screen === 'train') return <TrainScreen onBack={() => setScreen('home')} userId={userId} />;
  if (screen === 'nutrition') return <NutritionScreen onBack={() => setScreen('home')} />;
  if (screen === 'achievements') return <AchievementsScreen onBack={() => setScreen('home')} coins={coins} onEarn={earnCoins} />;
  if (screen === 'shop') return <ShopScreen onBack={() => setScreen('home')} coins={coins} onSpend={spendCoins} />;
  if (screen === 'supplements') return <SupplementScreen onBack={() => setScreen('home')} />;
  if (screen === 'bodyweight') return <BodyWeightScreen onBack={() => setScreen('home')} userId={userId} />;
  if (screen === 'coach') return <CoachScreen onBack={() => setScreen('home')} userId={userId} character={character} />;
  if (screen === 'profile') return <ProfileScreen onBack={() => setScreen('home')} userId={userId} character={character} coins={coins} onSignOut={() => setScreen('home')} />;

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
            <TouchableOpacity onPress={() => setScreen('profile')}>
              <View style={[s.avatarCircle, { borderColor: chosenClass?.color || '#c9a84c', backgroundColor: chosenClass ? `${chosenClass.color}30` : '#8b2020' }]}>
                <Text style={{ fontSize: 16 }}>{chosenClass?.icon || '⚔️'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.characterCard}>
          <View style={{ flexDirection: 'row', gap: 14, marginBottom: 14 }}>
            <TouchableOpacity onPress={() => setScreen('profile')}>
              <View style={[s.charAvatar, { backgroundColor: chosenClass ? `${chosenClass.color}40` : '#c94c4c' }]}>
                <Text style={{ fontSize: 28 }}>{chosenClass?.icon || '⚔️'}</Text>
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.charName}>{charDisplayName}</Text>
              <Text style={[s.charClass, { color: chosenClass?.color || '#c94c4c' }]}>{charClassLabel}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={s.levelBadge}><Text style={s.levelText}>LVL 1</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: '#888899', marginBottom: 3 }}>0 / 1,000 XP</Text>
                  <View style={s.xpBar}><View style={[s.xpFill, { width: '0%' }]} /></View>
                </View>
              </View>
            </View>
          </View>
          <View style={s.statsGrid}>
            {chosenClass ? Object.entries(chosenClass.stats).map(([stat, val]) => {
              const icons: Record<string, string> = { Strength: '💪', Vitality: '❤️', Endurance: '⚡', Focus: '🧠' };
              return (
                <View key={stat} style={s.statCard}>
                  <Text style={{ fontSize: 14, marginBottom: 2 }}>{icons[stat] || '⚡'}</Text>
                  <Text style={s.statVal}>{val * 10}</Text>
                  <Text style={s.statName}>{stat}</Text>
                </View>
              );
            }) : [
              { icon: '💪', val: '50', name: 'Strength' },
              { icon: '❤️', val: '50', name: 'Vitality' },
              { icon: '⚡', val: '50', name: 'Endurance' },
              { icon: '🧠', val: '50', name: 'Focus' },
            ].map((stat) => (
              <View key={stat.name} style={s.statCard}>
                <Text style={{ fontSize: 14, marginBottom: 2 }}>{stat.icon}</Text>
                <Text style={s.statVal}>{stat.val}</Text>
                <Text style={s.statName}>{stat.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 12, marginBottom: 4 }}>
          <TouchableOpacity style={s.quickActionBtn} onPress={() => setScreen('achievements')}>
            <Text style={{ fontSize: 20 }}>🏆</Text>
            <Text style={s.quickActionText}>Achievements</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickActionBtn} onPress={() => setScreen('bodyweight')}>
            <Text style={{ fontSize: 20 }}>⚖️</Text>
            <Text style={s.quickActionText}>Body Weight</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickActionBtn} onPress={() => setScreen('coach')}>
            <Text style={{ fontSize: 20 }}>🤖</Text>
            <Text style={s.quickActionText}>Coach</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginVertical: 12, gap: 8 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(201,168,76,0.15)' }} />
          <Text style={{ fontSize: 10, color: 'rgba(201,168,76,0.4)', fontStyle: 'italic' }}>The Iron Road Begins</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(201,168,76,0.15)' }} />
        </View>

        <View style={s.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={s.sectionTitle}>DAILY QUESTS</Text>
            <Text style={{ fontSize: 11, color: '#c9a84c' }}>View All →</Text>
          </View>
          {[
            { icon: '🏋️', name: 'Complete a Workout', sub: 'Start any training session', fill: 0.0, color: '#c94c4c', done: false, xp: '+500 XP' },
            { icon: '🥩', name: 'Hit Protein Goal', sub: '0g / 200g consumed', fill: 0.0, color: '#4cc97a', done: false, xp: '+350 XP' },
            { icon: '💊', name: 'Take Morning Stack', sub: 'Log your morning supplements', fill: 0.0, color: '#4c7bc9', done: false, xp: '+100 XP' },
            { icon: '🏃', name: '10,000 Steps', sub: '0 / 10,000 steps', fill: 0.0, color: '#c9a84c', done: false, xp: '+150 XP' },
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={s.sectionTitle}>TODAY'S STACK</Text>
            <TouchableOpacity onPress={() => setScreen('supplements')}><Text style={{ fontSize: 11, color: '#c9a84c' }}>Manage →</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['Zinc', 'Vitamin D3', 'Omega-3', 'Creatine', 'Magnesium 🌙', 'CJC-1295 🌙'].map((supp) => (
              <TouchableOpacity key={supp} style={s.pill} onPress={() => setScreen('supplements')}>
                <Text style={s.pillText}>{supp}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={s.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={s.sectionTitle}>NUTRITION</Text>
            <Text style={{ fontSize: 12, color: '#c9a84c' }}>0 / 1,800 kcal</Text>
          </View>
          <View style={s.macroCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
              {[
                { name: 'Protein', val: '0g', goal: '200g', pct: 0, color: '#c94c4c' },
                { name: 'Carbs', val: '0g', goal: '150g', pct: 0, color: '#c9a84c' },
                { name: 'Fat', val: '0g', goal: '60g', pct: 0, color: '#4cc97a' },
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
          { icon: '🤖', label: 'Coach', key: 'coach' },
          { icon: '🥩', label: 'Nutrition', key: 'nutrition' },
          { icon: '👤', label: 'Profile', key: 'profile' },
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
  tabRow: { paddingHorizontal: 16, marginBottom: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 20 },
  tabActive: { borderColor: 'rgba(201,168,76,0.4)', backgroundColor: 'rgba(201,168,76,0.08)' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#888899' },
  tabTextActive: { color: '#c9a84c' },
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