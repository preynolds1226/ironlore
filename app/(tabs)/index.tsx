import { useCallback, useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Modal, Vibration, ActivityIndicator, Switch, Linking, Animated, Easing
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Sharing from 'expo-sharing';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';

import { supabase } from '@/src/data/supabaseClient';
import { ACHIEVEMENTS, CLASSES, GOAL_PATHS, SHOP_ITEMS } from '@/src/domain/gameData';
import { IronLore } from '@/src/ui/ironloreTokens';
import { CoachScreen } from '@/src/screens/CoachScreen';
import { NutritionScreen as NutritionScreenComponent } from '@/src/screens/NutritionScreen';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
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
// AUTH SCREEN
// ============================================================

function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'confirm' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmedEmail, setConfirmedEmail] = useState('');

  async function handleAuth() {
    if (!email.trim() || !password.trim()) { setError('Enter email and password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    try {
      if (mode === 'signup') {
        const { error: e } = await supabase.auth.signUp({ email: email.trim(), password });
        if (e) { setError(e.message); }
        else { setConfirmedEmail(email.trim()); setMode('confirm'); }
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) {
          if (e.message.includes('Email not confirmed')) {
            setConfirmedEmail(email.trim());
            setMode('confirm');
          } else {
            setError(e.message);
          }
        } else { onAuth(); }
      }
    } catch { setError('Something went wrong. Check your connection.'); }
    setLoading(false);
  }

  async function handleResendConfirmation() {
    setLoading(true);
    const { error: e } = await supabase.auth.resend({ type: 'signup', email: confirmedEmail });
    if (e) { setError(e.message); }
    else { setError('Confirmation email resent!'); }
    setLoading(false);
  }

  async function handlePasswordReset() {
    if (!email.trim()) { setError('Enter your email first.'); return; }
    setLoading(true);
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (e) { setError(e.message); }
    else { setError('Password reset email sent! Check your inbox.'); }
    setLoading(false);
  }

  // Email confirmation screen
  if (mode === 'confirm') {
    return (
      <View style={auth.root}>
        <StatusBar style="light" />
        <View style={auth.container}>
          <Text style={{ fontSize: 56, textAlign: 'center', marginBottom: 20 }}>📬</Text>
          <Text style={auth.logo}>CHECK YOUR EMAIL</Text>
          <Text style={{ fontSize: 14, color: IronLore.colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
            We sent a confirmation link to:
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#c9a84c', textAlign: 'center', marginBottom: 24 }}>
            {confirmedEmail}
          </Text>
          <Text style={{ fontSize: 13, color: '#666677', textAlign: 'center', lineHeight: 20, marginBottom: 32 }}>
            Click the link in the email to activate your account, then come back and log in.
          </Text>
          {error ? <Text style={[auth.error, { color: error.includes('resent') ? '#4cc97a' : '#f97316' }]}>{error}</Text> : null}
          <TouchableOpacity style={auth.btn} onPress={() => { setMode('login'); setError(''); }}>
            <Text style={auth.btnText}>GO TO LOGIN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={handleResendConfirmation} disabled={loading}>
            <Text style={{ fontSize: 13, color: IronLore.colors.muted }}>
              {loading ? 'Sending...' : "Didn't get it? Resend email"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={auth.root}>
      <StatusBar style="light" />
      <View style={auth.container}>
        <Text style={auth.logo}>IRONLORE</Text>
        <Text style={auth.tagline}>Your fitness journey becomes legend.</Text>
        <View style={auth.modeRow}>
          <TouchableOpacity style={[auth.modeBtn, mode === 'login' && auth.modeBtnActive]} onPress={() => { setMode('login'); setError(''); }}>
            <Text style={[auth.modeBtnText, mode === 'login' && auth.modeBtnTextActive]}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[auth.modeBtn, mode === 'signup' && auth.modeBtnActive]} onPress={() => { setMode('signup'); setError(''); }}>
            <Text style={[auth.modeBtnText, mode === 'signup' && auth.modeBtnTextActive]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
        <TextInput style={auth.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#444" autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={auth.input} value={password} onChangeText={setPassword} placeholder="Password (min 6 characters)" placeholderTextColor="#444" secureTextEntry />
        {error ? <Text style={auth.error}>{error}</Text> : null}
        <TouchableOpacity style={auth.btn} onPress={handleAuth} disabled={loading}>
          {loading ? <ActivityIndicator color="#0a0a0f" /> : <Text style={auth.btnText}>{mode === 'login' ? 'ENTER THE FORGE' : 'CREATE ACCOUNT'}</Text>}
        </TouchableOpacity>
        {mode === 'login' && (
          <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={handlePasswordReset}>
            <Text style={{ fontSize: 13, color: IronLore.colors.muted }}>Forgot password?</Text>
          </TouchableOpacity>
        )}
        <Text style={auth.footer}>No ads. No selling your data. Ever.</Text>
      </View>
    </View>
  );
}

const auth = StyleSheet.create({
  root: { flex: 1, backgroundColor: IronLore.colors.bg },
  container: { flex: 1, justifyContent: 'center', padding: IronLore.spacing.xl },
  logo: { ...IronLore.type.title, color: IronLore.colors.gold, textAlign: 'center', marginBottom: 8 },
  tagline: { fontSize: 13, color: IronLore.colors.muted, textAlign: 'center', fontStyle: 'italic', marginBottom: 36 },
  modeRow: { flexDirection: 'row', backgroundColor: IronLore.colors.panel, borderRadius: IronLore.radii.md, padding: 4, marginBottom: 20 },
  modeBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: IronLore.colors.gold },
  modeBtnText: { fontSize: 14, fontWeight: '700', color: IronLore.colors.muted },
  modeBtnTextActive: { color: IronLore.colors.bg },
  input: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: IronLore.radii.md, padding: 16, fontSize: 15, color: IronLore.colors.text, marginBottom: 12 },
  error: { fontSize: 12, color: '#f97316', textAlign: 'center', marginBottom: 12, lineHeight: 18 },
  btn: { backgroundColor: IronLore.colors.gold, borderRadius: IronLore.radii.md, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { ...IronLore.type.button, color: IronLore.colors.bg },
  footer: { fontSize: 11, color: '#333344', textAlign: 'center', marginTop: 20 },
});

// ============================================================
// SETTINGS SCREEN
// ============================================================

function SettingsScreen({ onBack, userId, character, cleanMode, onCleanModeToggle, onUpdate }: {
  onBack: () => void;
  userId: string;
  character: any;
  cleanMode: boolean;
  onCleanModeToggle: (val: boolean) => void;
  onUpdate: (data: { name: string; goalId: string; calorieGoal: number; proteinGoal: number }) => void;
}) {
  const [name, setName] = useState(character?.name || '');
  const [goalId, setGoalId] = useState(character?.goalId || '');
  const [calorieGoal, setCalorieGoal] = useState('1800');
  const [proteinGoal, setProteinGoal] = useState('200');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [handle, setHandle] = useState('');
  const [privacyWorkouts, setPrivacyWorkouts] = useState<'private' | 'friends' | 'public'>('friends');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then(({ status }) => setNotifGranted(status === 'granted'))
      .catch(() => setNotifGranted(null));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('handle,privacy_workouts')
          .eq('id', userId)
          .maybeSingle();
        if (data?.handle) setHandle(String(data.handle));
        if (data?.privacy_workouts) setPrivacyWorkouts(data.privacy_workouts);
      } catch {
        // ignore
      }
    })();
  }, [userId]);

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    const normalizedHandle = handle.trim().toLowerCase().replace(/^@/, '');
    const handleOk = !normalizedHandle || /^[a-z0-9_]{3,20}$/.test(normalizedHandle);
    if (!handleOk) {
      setSaveError('Handle must be 3–20 characters: letters, numbers, underscore.');
      setSaving(false);
      return;
    }
    await supabase.from('profiles').update({
      name: name.trim(),
      goal_id: goalId,
      handle: normalizedHandle || null,
      privacy_workouts: privacyWorkouts,
    }).eq('id', userId);
    onUpdate({ name: name.trim(), goalId, calorieGoal: parseInt(calorieGoal) || 1800, proteinGoal: parseInt(proteinGoal) || 200 });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={s.screenTitle}>SETTINGS</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>

        {/* Clean Mode */}
        <Text style={[s.sectionTitle, { marginBottom: 10 }]}>DISPLAY</Text>
        <View style={{ backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: IronLore.colors.text, marginBottom: 3 }}>Clean Mode</Text>
            <Text style={{ fontSize: 12, color: IronLore.colors.muted, lineHeight: 17 }}>Hide all RPG elements. Shows a pure fitness tracker with no XP, classes, coins, or lore.</Text>
          </View>
          <Switch
            value={cleanMode}
            onValueChange={onCleanModeToggle}
            trackColor={{ false: IronLore.colors.border, true: IronLore.colors.gold }}
            thumbColor={cleanMode ? IronLore.colors.bg : IronLore.colors.muted}
          />
        </View>

        {/* Notifications */}
        <Text style={[s.sectionTitle, { marginBottom: 10 }]}>NOTIFICATIONS</Text>
        <View style={{ backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: IronLore.colors.text, marginBottom: 3 }}>Coach reminders</Text>
              <Text style={{ fontSize: 12, color: IronLore.colors.muted, lineHeight: 17 }}>
                {notifGranted === false ? 'Disabled. Enable notifications to receive reminders.' : 'Optional. Used for reminders and nudges.'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: notifGranted === true ? IronLore.colors.green : notifGranted === false ? IronLore.colors.red : IronLore.colors.muted }}>
                {notifGranted === true ? 'ON' : notifGranted === false ? 'OFF' : '—'}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  await Linking.openSettings();
                  const { status } = await Notifications.getPermissionsAsync().catch(() => ({ status: 'undetermined' as any }));
                  setNotifGranted(status === 'granted');
                }}
                style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(201,168,76,0.15)', borderRadius: 10 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '900', color: IronLore.colors.gold, letterSpacing: 1 }}>OPEN SETTINGS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Character */}
        <Text style={[s.sectionTitle, { marginBottom: 10 }]}>CHARACTER</Text>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 12, color: IronLore.colors.muted, marginBottom: 6 }}>Warrior Name</Text>
          <TextInput
            style={s.modalInput}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#444"
            maxLength={20}
          />
        </View>

        <Text style={[s.sectionTitle, { marginBottom: 10 }]}>SOCIAL</Text>
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 12, color: IronLore.colors.muted, marginBottom: 6 }}>Handle</Text>
          <TextInput
            style={s.modalInput}
            value={handle}
            onChangeText={setHandle}
            placeholder="@your_handle"
            placeholderTextColor="#444"
            autoCapitalize="none"
            maxLength={24}
          />
          <Text style={{ fontSize: 11, color: IronLore.colors.muted, marginTop: 6, lineHeight: 16 }}>
            Letters, numbers, underscore. Example: @ironborn_42
          </Text>
        </View>

        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 12, color: IronLore.colors.muted, marginBottom: 8 }}>Workout Privacy</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { key: 'friends' as const, label: 'Friends' },
              { key: 'public' as const, label: 'Public' },
              { key: 'private' as const, label: 'Private' },
            ].map(opt => {
              const active = privacyWorkouts === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[{ flex: 1, paddingVertical: 10, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: active ? 'rgba(201,168,76,0.4)' : IronLore.colors.border, borderRadius: 12, alignItems: 'center' }]}
                  onPress={() => setPrivacyWorkouts(opt.key)}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: active ? IronLore.colors.gold : IronLore.colors.muted }}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Goal Path */}
        <Text style={[s.sectionTitle, { marginBottom: 10 }]}>GOAL PATH</Text>
        <View style={{ gap: 8, marginBottom: 20 }}>
          {GOAL_PATHS.map(goal => {
            const active = goalId === goal.id;
            return (
              <TouchableOpacity
                key={goal.id}
                style={[{ backgroundColor: IronLore.colors.panel, borderWidth: 1.5, borderColor: active ? goal.color : IronLore.colors.border, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, active && { backgroundColor: `${goal.color}0d` }]}
                onPress={() => setGoalId(goal.id)}
              >
                <Text style={{ fontSize: 22 }}>{goal.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 14, fontWeight: '700', color: IronLore.colors.text }, active && { color: goal.color }]}>{goal.name}</Text>
                  <Text style={{ fontSize: 11, color: IronLore.colors.muted }}>{goal.desc}</Text>
                </View>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: active ? goal.color : IronLore.colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  {active && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: goal.color }} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Nutrition goals */}
        <Text style={[s.sectionTitle, { marginBottom: 10 }]}>NUTRITION GOALS</Text>
        <View style={{ gap: 12, marginBottom: 24 }}>
          <View>
            <Text style={{ fontSize: 12, color: IronLore.colors.muted, marginBottom: 6 }}>Daily Calories</Text>
            <TextInput style={s.modalInput} value={calorieGoal} onChangeText={setCalorieGoal} placeholder="1800" placeholderTextColor="#444" keyboardType="numeric" />
          </View>
          <View>
            <Text style={{ fontSize: 12, color: IronLore.colors.muted, marginBottom: 6 }}>Daily Protein (g)</Text>
            <TextInput style={s.modalInput} value={proteinGoal} onChangeText={setProteinGoal} placeholder="200" placeholderTextColor="#444" keyboardType="numeric" />
          </View>
        </View>

        {/* Save button */}
        {saveError ? <Text style={{ color: IronLore.colors.red, fontSize: 12, fontWeight: '700', marginBottom: 10 }}>{saveError}</Text> : null}
        <TouchableOpacity style={[s.finishBtn, saved && { backgroundColor: IronLore.colors.green }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={IronLore.colors.bg} /> : <Text style={s.finishText}>{saved ? '✓ Saved!' : 'Save Changes'}</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ============================================================
// ACHIEVEMENTS SCREEN
// ============================================================

function AchievementsScreen({ onBack, coins, onEarn }: { onBack: () => void; coins: number; onEarn: (amount: number) => void }) {
  const [activeTab, setActiveTab] = useState('featured');
  const tabs = ['featured', 'Strength', 'Nutrition', 'Streak'];

  const claimAchievement = useCallback((achievement: any) => {
    if (!achievement.unlocked) return;
    onEarn(achievement.reward);
  }, [onEarn]);

  const renderAchievement = (item: any, featured = false) => (
    <TouchableOpacity
      key={item.id}
      style={[s.achievementCard, item.unlocked && s.achievementUnlocked, featured && s.achievementFeatured]}
      activeOpacity={0.85}
      onPress={() => claimAchievement(item)}
    >
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
    </TouchableOpacity>
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
          <Text style={{ fontSize: 12, color: IronLore.colors.muted }}>{unlocked} / {total} unlocked</Text>
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
            <Text style={{ fontSize: 13, color: IronLore.colors.muted, textAlign: 'center', marginBottom: 16, lineHeight: 18 }}>{confirmModal?.desc}</Text>
            <View style={{ backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 10, padding: 12, marginBottom: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#c9a84c' }}>🪙 {confirmModal?.price?.toLocaleString()}</Text>
              <Text style={{ fontSize: 11, color: IronLore.colors.muted, marginTop: 2 }}>Iron Coins</Text>
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setConfirmModal(null)} activeOpacity={0.85}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={confirmPurchase} activeOpacity={0.85}>
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
// Nutrition is implemented in `src/screens/NutritionScreen.tsx`.
// ============================================================
// TRAIN SCREEN
// ============================================================

function TrainScreen({ onBack, userId, character, onWorkoutComplete }: { onBack: () => void; userId: string; character: CharacterData | null; onWorkoutComplete: () => void }) {
  const [trainView, setTrainView] = useState<'start' | 'session' | 'summary'>('start');
  const [workoutMode, setWorkoutMode] = useState<'gym' | 'cardio' | 'hiit' | 'yoga' | 'calisthenics' | 'abs'>('gym');
  const [nonGymChecks, setNonGymChecks] = useState<Record<string, boolean>>({});
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState<string | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [totalXP, setTotalXP] = useState(0);
  const [addExerciseModal, setAddExerciseModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [prShareOpen, setPrShareOpen] = useState(false);
  const [prSelectedIdx, setPrSelectedIdx] = useState(0);
  const prCaptureRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const restRef = useRef<any>(null);

  const NON_GYM_MODES: {
    id: 'cardio' | 'hiit' | 'yoga' | 'calisthenics' | 'abs';
    icon: string;
    title: string;
    desc: string;
    checks: { id: string; label: string }[];
  }[] = [
    { id: 'cardio', icon: '🏃', title: 'Cardio', desc: 'Steady pace or intervals. Chase minutes.', checks: [{ id: 'warmup', label: 'Warm up' }, { id: 'main', label: 'Main set' }, { id: 'cooldown', label: 'Cool down' }] },
    { id: 'hiit', icon: '⚡', title: 'HIIT', desc: 'Short bursts. High intent. Low excuses.', checks: [{ id: 'warmup', label: 'Warm up' }, { id: 'rounds', label: 'Finish rounds' }, { id: 'cooldown', label: 'Cool down' }] },
    { id: 'yoga', icon: '🧘', title: 'Yoga', desc: 'Mobility + breath. Recover your Focus.', checks: [{ id: 'flow', label: 'Complete flow' }, { id: 'hold', label: 'Hold 3 poses' }, { id: 'breath', label: '2 min breathing' }] },
    { id: 'calisthenics', icon: '🤸', title: 'Calisthenics', desc: 'Bodyweight strength. Clean reps.', checks: [{ id: 'push', label: 'Push movement' }, { id: 'pull', label: 'Pull movement' }, { id: 'legs', label: 'Legs movement' }] },
    { id: 'abs', icon: '🧱', title: 'Ab Circuit', desc: 'Core circuit. Tight form, steady pace.', checks: [{ id: 'circuit1', label: 'Circuit 1' }, { id: 'circuit2', label: 'Circuit 2' }, { id: 'finisher', label: 'Finisher' }] },
  ];

  const WORKOUT_TEMPLATES: {
    id: 'ppl_push' | 'ppl_pull' | 'ppl_legs';
    title: string;
    subtitle: string;
    exercises: { name: string; lastWeight: string; lastReps: string }[];
  }[] = [
    {
      id: 'ppl_push',
      title: 'PPL — Push Day',
      subtitle: 'Chest, shoulders, triceps',
      exercises: [
        { name: 'Bench Press', lastWeight: '135', lastReps: '5' },
        { name: 'Incline Dumbbell Press', lastWeight: '50', lastReps: '10' },
        { name: 'Overhead Press', lastWeight: '95', lastReps: '5' },
        { name: 'Lateral Raise', lastWeight: '15', lastReps: '15' },
        { name: 'Tricep Pushdown', lastWeight: '60', lastReps: '12' },
      ],
    },
    {
      id: 'ppl_pull',
      title: 'PPL — Pull Day',
      subtitle: 'Back, rear delts, biceps',
      exercises: [
        { name: 'Barbell Row', lastWeight: '135', lastReps: '8' },
        { name: 'Lat Pulldown', lastWeight: '120', lastReps: '10' },
        { name: 'Pull-Up', lastWeight: '0', lastReps: '8' },
        { name: 'Face Pull', lastWeight: '50', lastReps: '15' },
        { name: 'Dumbbell Curl', lastWeight: '25', lastReps: '12' },
      ],
    },
    {
      id: 'ppl_legs',
      title: 'PPL — Legs Day',
      subtitle: 'Quads, hamstrings, glutes, calves',
      exercises: [
        { name: 'Back Squat', lastWeight: '185', lastReps: '5' },
        { name: 'Romanian Deadlift', lastWeight: '185', lastReps: '8' },
        { name: 'Leg Press', lastWeight: '270', lastReps: '10' },
        { name: 'Leg Curl', lastWeight: '90', lastReps: '12' },
        { name: 'Calf Raise', lastWeight: '90', lastReps: '15' },
      ],
    },
  ];

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
    setWorkoutMode('gym');
    setNonGymChecks({});
    setTemplateId(null);
    setTemplateTitle(null);
    setExercises(ROUTINES[name].map(ex => ({ ...ex, sets: Array(3).fill(null).map(() => ({ weight: ex.lastWeight, reps: ex.lastReps, done: false })) })));
    setSessionTimer(0); setTotalXP(0); setTrainView('session');
  }

  function startQuick() {
    setWorkoutMode('gym');
    setNonGymChecks({});
    setTemplateId(null);
    setTemplateTitle(null);
    setExercises([]);
    setSessionTimer(0);
    setTotalXP(0);
    setTrainView('session');
  }

  function startTemplate(id: 'ppl_push' | 'ppl_pull' | 'ppl_legs') {
    const template = WORKOUT_TEMPLATES.find(t => t.id === id);
    if (!template) return;
    setWorkoutMode('gym');
    setNonGymChecks({});
    setTemplateId(template.id);
    setTemplateTitle(template.title);
    setExercises(template.exercises.map((ex) => ({
      ...ex,
      sets: Array(3).fill(null).map(() => ({ weight: ex.lastWeight, reps: ex.lastReps, done: false })),
    })));
    setSessionTimer(0);
    setTotalXP(0);
    setTrainView('session');
  }

  function startNonGym(id: 'cardio' | 'hiit' | 'yoga' | 'calisthenics' | 'abs') {
    setWorkoutMode(id);
    const mode = NON_GYM_MODES.find(m => m.id === id);
    const initialChecks: Record<string, boolean> = {};
    for (const c of (mode?.checks || [])) initialChecks[c.id] = false;
    setNonGymChecks(initialChecks);
    setTemplateId(null);
    setTemplateTitle(null);
    setExercises([]);
    setSessionTimer(0);
    setTotalXP(0);
    setTrainView('session');
  }

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
    const nonGymCompleted = Object.values(nonGymChecks).filter(Boolean).length;
    const nonGymTotal = Object.keys(nonGymChecks).length || 3;
    const nonGymXP = Math.max(100, Math.round((sessionTimer / 60) * 10) + nonGymCompleted * 25);
    const finalXP = workoutMode === 'gym' ? totalXP : nonGymXP;
    setTotalXP(finalXP);
    if (userId && (totalSets > 0 || workoutMode !== 'gym')) {
      await supabase.from('workouts').insert({
        user_id: userId,
        duration: sessionTimer,
        total_xp: finalXP,
        total_volume: totalVolume,
        total_sets: totalSets,
        exercises: workoutMode === 'gym'
          ? exercises.map((ex) => ({
            ...ex,
            meta: templateId
              ? { ...(ex.meta || {}), templateId, templateTitle }
              : ex.meta,
          }))
          : [{
            name: `NON-GYM: ${workoutMode.toUpperCase()}`,
            lastWeight: '0',
            lastReps: '0',
            sets: [],
            meta: { mode: workoutMode, checks: nonGymChecks, checksDone: nonGymCompleted, checksTotal: nonGymTotal },
          }],
      });
      onWorkoutComplete();
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
    const prItems = prs.map((ex) => {
      const doneSets = ex.sets.filter((s: any) => s.done);
      const bestSet = doneSets.reduce((best: any, curr: any) => {
        if (!best) return curr;
        return (parseFloat(curr.weight) || 0) > (parseFloat(best.weight) || 0) ? curr : best;
      }, null);
      const bestWeight = doneSets.reduce((best: number, set: any) => Math.max(best, parseFloat(set.weight) || 0), 0);
      const prev = parseFloat(ex.lastWeight || '0');
      const reps = parseInt(bestSet?.reps, 10) || 0;
      return {
        liftName: ex.name as string,
        prevWeight: prev,
        newWeight: bestWeight,
        topReps: reps,
        delta: bestWeight - prev,
      };
    });

    const chosenClass = CLASSES.find(c => c.id === character?.classId);
    const prSelected = prItems[prSelectedIdx] || prItems[0] || null;
    const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();

    async function sharePR() {
      try {
        const available = await Sharing.isAvailableAsync();
        if (!available) return;
        if (!prCaptureRef.current) return;
        const uri = await captureRef(prCaptureRef, { format: 'png', quality: 1, result: 'tmpfile' });
        await Sharing.shareAsync(uri);
      } catch {
        // canceled / failed
      }
    }

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
              <TouchableOpacity
                style={[ws.secondaryBtn, { marginBottom: 10 }]}
                onPress={() => { setPrSelectedIdx(0); setPrShareOpen(true); }}
                activeOpacity={0.85}
              >
                <Text style={ws.secondaryBtnText}>↗ Share a PR</Text>
              </TouchableOpacity>
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
                    <Text style={{ fontSize: 11, color: IronLore.colors.muted }}>{doneSets.length} sets</Text>
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
            <TouchableOpacity style={s.finishBtn} onPress={onBack} activeOpacity={0.85}>
              <Text style={s.finishText}>🏠 Back to Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ws.secondaryBtn} onPress={() => setTrainView('start')} activeOpacity={0.85}>
              <Text style={ws.secondaryBtnText}>Start Another Workout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Hidden capture target */}
        {prSelected ? (
          <View style={{ position: 'absolute', left: -9999, top: 0 }}>
            <ViewShot ref={prCaptureRef} options={{ format: 'png', quality: 1 }}>
              <PRShareCard
                dateLabel={dateLabel}
                playerName={character?.name || 'Warrior'}
                classIcon={chosenClass?.icon || '⚔️'}
                className={chosenClass?.name || 'Warrior'}
                liftName={prSelected.liftName}
                prevWeight={prSelected.prevWeight}
                newWeight={prSelected.newWeight}
                topReps={prSelected.topReps}
                durationLabel={formatTime(finalTime)}
                volumeLabel={`${Math.round(totalVolume).toLocaleString()}lb`}
              />
            </ViewShot>
          </View>
        ) : null}

        <Modal visible={prShareOpen} transparent animationType="fade" onRequestClose={() => setPrShareOpen(false)}>
          <View style={s.modalOverlay}>
            <View style={[s.modal, { borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
              <Text style={s.modalTitle}>Share PR</Text>
              <Text style={{ ...IronLore.type.body, color: IronLore.colors.muted, textAlign: 'center', marginBottom: 14 }}>
                Choose a PR to share.
              </Text>

              {prItems.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
                  {prItems.map((p, idx) => {
                    const active = idx === prSelectedIdx;
                    return (
                      <TouchableOpacity
                        key={`${p.liftName}-${idx}`}
                        style={[an.chip, active && an.chipActive]}
                        onPress={() => setPrSelectedIdx(idx)}
                        activeOpacity={0.85}
                      >
                        <Text style={[an.chipText, active && an.chipTextActive]} numberOfLines={1}>{p.liftName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {prSelected && (
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ width: 270, height: 337, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: IronLore.colors.border }}>
                    <View style={{ width: 1080, height: 1350, transform: [{ scale: 0.25 }] }}>
                      <PRShareCard
                        dateLabel={dateLabel}
                        playerName={character?.name || 'Warrior'}
                        classIcon={chosenClass?.icon || '⚔️'}
                        className={chosenClass?.name || 'Warrior'}
                        liftName={prSelected.liftName}
                        prevWeight={prSelected.prevWeight}
                        newWeight={prSelected.newWeight}
                        topReps={prSelected.topReps}
                        durationLabel={formatTime(finalTime)}
                        volumeLabel={`${Math.round(totalVolume).toLocaleString()}lb`}
                      />
                    </View>
                  </View>
                  <Text style={{ ...IronLore.type.body, color: IronLore.colors.muted, textAlign: 'center', marginTop: 10 }}>
                    Works best for Stories.
                  </Text>
                </View>
              )}

              <View style={s.modalBtns}>
                <TouchableOpacity style={s.modalCancel} onPress={() => setPrShareOpen(false)} activeOpacity={0.85}>
                  <Text style={s.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.modalSave} onPress={sharePR} activeOpacity={0.85}>
                  <Text style={s.modalSaveText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
          <Text style={s.routineLabel}>NON-GYM MODES</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            {NON_GYM_MODES.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[s.routineCard, { width: '48%', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}
                onPress={() => startNonGym(m.id)}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 22 }}>{m.icon}</Text>
                <View style={{ gap: 2 }}>
                  <Text style={s.routineName}>{m.title}</Text>
                  <Text style={{ fontSize: 12, color: IronLore.colors.muted, lineHeight: 16 }}>{m.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.routineLabel}>WORKOUT TEMPLATES</Text>
          {WORKOUT_TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={s.routineCard}
              onPress={() => startTemplate(t.id)}
              activeOpacity={0.85}
            >
              <View>
                <Text style={s.routineName}>{t.title}</Text>
                <Text style={{ fontSize: 12, color: IronLore.colors.muted }}>{t.subtitle} · {t.exercises.length} exercises</Text>
              </View>
              <Text style={{ fontSize: 22, color: IronLore.colors.muted }}>›</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={s.quickStartBtn} onPress={startQuick} activeOpacity={0.85}>
            <Text style={{ fontSize: 28 }}>⚡</Text>
            <View><Text style={s.quickStartTitle}>Quick Start</Text><Text style={{ fontSize: 12, color: IronLore.colors.muted }}>Blank session — add exercises as you go</Text></View>
          </TouchableOpacity>
          <Text style={s.routineLabel}>YOUR ROUTINES</Text>
          {Object.keys(ROUTINES).map(name => (
            <TouchableOpacity key={name} style={s.routineCard} onPress={() => startRoutine(name)} activeOpacity={0.85}>
              <View><Text style={s.routineName}>{name}</Text><Text style={{ fontSize: 12, color: IronLore.colors.muted }}>{ROUTINES[name].length} exercises · 3 sets each</Text></View>
              <Text style={{ fontSize: 22, color: IronLore.colors.muted }}>›</Text>
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
        <View style={s.xpBadge}>
          <Text style={s.xpBadgeText}>
            +{workoutMode === 'gym' ? totalXP : Math.max(100, Math.round((sessionTimer / 60) * 10) + Object.values(nonGymChecks).filter(Boolean).length * 25)} XP
          </Text>
        </View>
      </View>
      {restActive && (
        <View style={s.restBar}>
          <View style={[s.restFill, { width: `${(restTimer / REST_SECONDS) * 100}%` as any }]} />
          <Text style={s.restLabel}>Rest — {restTimer}s</Text>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false}>
        {workoutMode !== 'gym' && (
          <View style={[s.exerciseCard, { marginTop: 16 }]}>
            <Text style={s.exerciseName}>
              {NON_GYM_MODES.find(m => m.id === workoutMode)?.icon} {NON_GYM_MODES.find(m => m.id === workoutMode)?.title}
            </Text>
            <Text style={{ fontSize: 12, color: IronLore.colors.muted, marginTop: 6 }}>
              {NON_GYM_MODES.find(m => m.id === workoutMode)?.desc}
            </Text>
            <View style={{ height: 12 }} />
            <Text style={[s.setHeaderText, { marginBottom: 8 }]}>CHECKPOINTS</Text>
            <View style={{ gap: 8 }}>
              {(NON_GYM_MODES.find(m => m.id === workoutMode)?.checks || []).map((c) => {
                const done = !!nonGymChecks[c.id];
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.setRow, { paddingVertical: 12 }, done && { backgroundColor: 'rgba(76,201,122,0.06)', borderColor: 'rgba(76,201,122,0.25)' }]}
                    onPress={() => setNonGymChecks(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.setNum, done && { color: '#4cc97a' }]}>{done ? '✓' : '○'}</Text>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: IronLore.colors.text }}>{c.label}</Text>
                    <Text style={{ fontSize: 12, color: IronLore.colors.muted }}>{done ? 'Done' : 'Tap'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ height: 14 }} />
            <TouchableOpacity style={s.finishBtn} onPress={finishWorkout} activeOpacity={0.85}>
              <Text style={s.finishText}>⚔ Finish Session</Text>
            </TouchableOpacity>
          </View>
        )}

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
                  <Text style={{ fontSize: 12, color: IronLore.colors.muted }}>{completedSets}/{ex.sets.length}</Text>
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
        {workoutMode === 'gym' && (
          <>
            <TouchableOpacity style={s.addExerciseBtn} onPress={() => setAddExerciseModal(true)}>
              <Text style={s.addExerciseText}>+ Add Exercise</Text>
            </TouchableOpacity>
            {exercises.length > 0 && (
              <TouchableOpacity style={s.finishBtn} onPress={finishWorkout} activeOpacity={0.85}>
                <Text style={s.finishText}>⚔ Finish Workout</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
      <Modal visible={addExerciseModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Add Exercise</Text>
            <TextInput style={s.modalInput} value={newExerciseName} onChangeText={setNewExerciseName} placeholder="Exercise name..." placeholderTextColor="#444" autoFocus />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setAddExerciseModal(false)} activeOpacity={0.85}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={addExercise} activeOpacity={0.85}><Text style={s.modalSaveText}>Add</Text></TouchableOpacity>
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
  heroBanner: { backgroundColor: IronLore.colors.bg, borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,76,0.2)', paddingTop: 60, paddingBottom: 28, alignItems: 'center', gap: 6 },
  heroIcon: { fontSize: 48, marginBottom: 4 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: IronLore.colors.gold, letterSpacing: 4 },
  heroSub: { fontSize: 13, color: IronLore.colors.muted, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  statBox: { flex: 1, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  statBoxIcon: { fontSize: 20 },
  statBoxVal: { fontSize: 18, fontWeight: '800', color: IronLore.colors.text },
  statBoxLabel: { fontSize: 9, fontWeight: '600', color: IronLore.colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  rewardsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  rewardCard: { flex: 1, backgroundColor: 'rgba(76,201,122,0.06)', borderWidth: 1, borderColor: 'rgba(76,201,122,0.3)', borderRadius: 14, padding: 16, alignItems: 'center', gap: 4 },
  rewardIcon: { fontSize: 24 },
  rewardVal: { fontSize: 24, fontWeight: '900', color: IronLore.colors.green },
  rewardLabel: { fontSize: 9, fontWeight: '700', color: IronLore.colors.muted, letterSpacing: 1 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: IronLore.colors.muted, letterSpacing: 1, marginBottom: 10, marginTop: 8 },
  prCard: { backgroundColor: '#1a1508', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  prIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(201,168,76,0.1)', alignItems: 'center', justifyContent: 'center' },
  prName: { fontSize: 14, fontWeight: '700', color: IronLore.colors.text, marginBottom: 2 },
  prDetail: { fontSize: 12, color: IronLore.colors.gold },
  prBadge: { backgroundColor: IronLore.colors.gold, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  prBadgeText: { fontSize: 9, fontWeight: '900', color: IronLore.colors.bg, letterSpacing: 1 },
  exCard: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 14, padding: 14, marginBottom: 8 },
  exName: { fontSize: 14, fontWeight: '700', color: IronLore.colors.text },
  exStatVal: { fontSize: 14, fontWeight: '700', color: IronLore.colors.gold, marginBottom: 2 },
  exStatLabel: { fontSize: 9, color: IronLore.colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  secondaryBtn: { padding: 14, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 14, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: IronLore.colors.muted },
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

function SupplementScreen({ onBack, onSuppsUpdate }: { onBack: () => void; onSuppsUpdate?: (taken: number, total: number) => void }) {
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
    setSupplements(prev => {
      const updated = prev.map(s =>
        s.id === id ? { ...s, taken: !s.taken, streak: !s.taken ? s.streak + 1 : s.streak } : s
      );
      const morningTaken = updated.filter(s => s.timing === 'morning' && s.taken).length;
      const morningTotal = updated.filter(s => s.timing === 'morning').length;
      onSuppsUpdate?.(morningTaken, morningTotal);
      return updated;
    });
  }

  function logAll() {
    setSupplements(prev => {
      const updated = prev.map(s =>
        s.timing === activeGroup ? { ...s, taken: true } : s
      );
      const morningTaken = updated.filter(s => s.timing === 'morning' && s.taken).length;
      const morningTotal = updated.filter(s => s.timing === 'morning').length;
      onSuppsUpdate?.(morningTaken, morningTotal);
      return updated;
    });
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
          <Text style={{ fontSize: 12, color: IronLore.colors.muted }}>{totalTaken} / {totalSupps} taken today</Text>
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
                  <Text style={[sup.suppName, supp.taken && { color: IronLore.colors.muted }]}>{supp.name}</Text>
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
              <TouchableOpacity style={s.modalCancel} onPress={() => setAddModal(false)} activeOpacity={0.85}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={addSupplement} activeOpacity={0.85}>
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
  logAllText: { fontSize: 14, fontWeight: '700', color: IronLore.colors.gold },
  allDoneBanner: { marginHorizontal: 16, marginBottom: 4, padding: 12, backgroundColor: 'rgba(76,201,122,0.08)', borderWidth: 1, borderColor: 'rgba(76,201,122,0.25)', borderRadius: 12, alignItems: 'center' },
  allDoneText: { fontSize: 13, fontWeight: '700', color: IronLore.colors.green },
  suppCard: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  suppCardTaken: { opacity: 0.6, borderColor: 'rgba(76,201,122,0.15)' },
  checkCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: IronLore.colors.border, alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 13, color: IronLore.colors.bg, fontWeight: '700' },
  suppIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  suppName: { fontSize: 14, fontWeight: '700', color: IronLore.colors.text },
  doseBadge: { backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  doseText: { fontSize: 10, fontWeight: '600', color: IronLore.colors.gold },
  suppPurpose: { fontSize: 11, color: IronLore.colors.muted },
  streakText: { fontSize: 11, color: IronLore.colors.gold, fontWeight: '600' },
  addBtn: { marginHorizontal: 16, marginTop: 4, padding: 14, borderWidth: 1.5, borderColor: IronLore.colors.border, borderStyle: 'dashed', borderRadius: 12, alignItems: 'center' },
  addBtnText: { fontSize: 13, fontWeight: '600', color: IronLore.colors.muted },
  inputLabel: { fontSize: 10, fontWeight: '600', color: IronLore.colors.muted, letterSpacing: 1, marginBottom: 6 },
  timingBtn: { flex: 1, padding: 8, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 8, alignItems: 'center' },
  timingBtnText: { fontSize: 11, fontWeight: '600', color: IronLore.colors.muted },
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

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('body_weight')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30);
    if (data) setEntries(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  async function logWeight() {
    if (!newWeight.trim() || isNaN(parseFloat(newWeight))) return;
    setSaving(true);
    const { data } = await supabase.from('body_weight').insert({
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
            <Text style={bw.logLabel}>LOG TODAY&apos;S WEIGHT</Text>
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
                  <Text style={[bw.statVal, { color: change < 0 ? IronLore.colors.green : change > 0 ? IronLore.colors.red : IronLore.colors.muted }]}>
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
            <Text style={{ fontSize: 12, color: IronLore.colors.muted, flex: 1 }}>Goal weight (optional)</Text>
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
                      <View style={[bw.bar, { height: h, backgroundColor: isLatest ? IronLore.colors.gold : IronLore.colors.border }]} />
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
  logCard: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  logLabel: { fontSize: 10, fontWeight: '700', color: IronLore.colors.muted, letterSpacing: 1 },
  logBtn: { backgroundColor: IronLore.colors.gold, borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' },
  logBtnText: { fontSize: 14, fontWeight: '700', color: IronLore.colors.bg },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: IronLore.colors.text, marginBottom: 2 },
  statLabel: { fontSize: 9, color: IronLore.colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  goalRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 12, padding: 14, marginBottom: 12 },
  goalInput: { backgroundColor: IronLore.colors.panel2, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 8, padding: 8, fontSize: 14, color: IronLore.colors.text, width: 70, textAlign: 'center' },
  chartCard: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  chartTitle: { fontSize: 10, fontWeight: '700', color: IronLore.colors.muted, letterSpacing: 1, marginBottom: 12 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 2, position: 'relative' },
  bar: { flex: 1, borderRadius: 3 },
  goalLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(201,168,76,0.4)', borderStyle: 'dashed' },
  entryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  entryDate: { flex: 1, fontSize: 13, color: IronLore.colors.muted },
  entryWeight: { fontSize: 15, fontWeight: '700', color: '#c9a84c', marginRight: 12 },
});

// ============================================================
// PROFILE SCREEN
// ============================================================

function ProfileScreen({ onBack, userId, character, coins, streak, onSignOut, onSettings, onAnalytics, onFriends }: {
  onBack: () => void;
  userId: string;
  character: any;
  coins: number;
  streak: number;
  onSignOut: () => void;
  onSettings: () => void;
  onAnalytics: () => void;
  onFriends: () => void;
}) {
  const [workoutCount, setWorkoutCount] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [loading, setLoading] = useState(true);

  const chosenClass = CLASSES.find(c => c.id === character?.classId);
  const chosenGoal = GOAL_PATHS.find(g => g.id === character?.goalId);
  const classTitle = chosenClass?.name === 'Monk' ? 'Ascendant' : chosenClass?.name === 'Ranger' ? 'Swift' : chosenClass?.name === 'Berserker' ? 'Unbound' : 'Ironborn';

  const loadStats = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('workouts').select('total_volume').eq('user_id', userId);
    if (data) {
      setWorkoutCount(data.length);
      setTotalVolume(data.reduce((acc, w) => acc + (w.total_volume || 0), 0));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadStats(); }, [loadStats]);

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
            { label: 'Streak', val: `${streak}d`, icon: '🔥' },
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
          <TouchableOpacity style={pr.settingRow} onPress={onFriends}>
            <Text style={{ fontSize: 18 }}>🧑‍🤝‍🧑</Text>
            <Text style={pr.settingText}>Friends</Text>
            <Text style={{ fontSize: 16, color: '#444' }}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pr.settingRow} onPress={onAnalytics}>
            <Text style={{ fontSize: 18 }}>📈</Text>
            <Text style={pr.settingText}>Analytics</Text>
            <Text style={{ fontSize: 16, color: '#444' }}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pr.settingRow} onPress={onSettings}>
            <Text style={{ fontSize: 18 }}>⚙️</Text>
            <Text style={pr.settingText}>Settings</Text>
            <Text style={{ fontSize: 16, color: '#444' }}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pr.settingRow} onPress={handleSignOut}>
            <Text style={{ fontSize: 18 }}>🚪</Text>
            <Text style={pr.settingText}>Sign Out</Text>
            <Text style={{ fontSize: 16, color: '#444' }}>›</Text>
          </TouchableOpacity>        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const pr = StyleSheet.create({
  heroCard: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a2a', marginBottom: 16 },
  avatar: { width: 90, height: 90, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  name: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  title: { fontSize: 14, color: IronLore.colors.muted, fontStyle: 'italic' },
  badge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statBox: { flex: 1, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 14, padding: 14, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: IronLore.colors.text, marginBottom: 2 },
  statLabel: { fontSize: 9, color: IronLore.colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingRow: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  settingText: { flex: 1, fontSize: 14, fontWeight: '600', color: IronLore.colors.text },
});

// ============================================================
// WORKOUT HISTORY SCREEN
// ============================================================

function WorkoutHistoryScreen({ onBack, userId }: { onBack: () => void; userId: string }) {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadWorkouts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setWorkouts(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadWorkouts(); }, [loadWorkouts]);

  function formatTime(secs: number) {
    if (!secs) return '0:00';
    return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={s.screenTitle}>HISTORY</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#c9a84c" size="large" />
        </View>
      ) : workouts.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>⚔️</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: IronLore.colors.text, marginBottom: 8 }}>No workouts yet</Text>
          <Text style={{ fontSize: 13, color: IronLore.colors.muted, textAlign: 'center' }}>Complete your first workout to see your history here.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 10 }}>
          {/* Summary stats */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
            {[
              { icon: '🏋️', label: 'Workouts', val: String(workouts.length) },
              { icon: '📦', label: 'Total Volume', val: `${Math.round(workouts.reduce((a, w) => a + (w.total_volume || 0), 0) / 1000)}k lb` },
              { icon: '⚡', label: 'Total XP', val: workouts.reduce((a, w) => a + (w.total_xp || 0), 0).toLocaleString() },
            ].map(stat => (
              <View key={stat.label} style={{ flex: 1, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, marginBottom: 4 }}>{stat.icon}</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#c9a84c' }}>{stat.val}</Text>
                <Text style={{ fontSize: 9, color: IronLore.colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {workouts.map((workout) => {
            const isExpanded = expanded === workout.id;
            const exercises = workout.exercises || [];
            return (
              <TouchableOpacity
                key={workout.id}
                style={[wh.card, isExpanded && wh.cardExpanded]}
                onPress={() => setExpanded(isExpanded ? null : workout.id)}
                activeOpacity={0.8}
              >
                {/* Header row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View>
                    <Text style={wh.date}>{formatDate(workout.created_at)}</Text>
                    <Text style={wh.exerciseCount}>{exercises.length} exercises</Text>
                  </View>
                  <Text style={{ fontSize: 16, color: '#444' }}>{isExpanded ? '▲' : '▼'}</Text>
                </View>

                {/* Stats row */}
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View>
                    <Text style={wh.statVal}>{formatTime(workout.duration)}</Text>
                    <Text style={wh.statLabel}>Duration</Text>
                  </View>
                  <View>
                    <Text style={wh.statVal}>{workout.total_sets || 0}</Text>
                    <Text style={wh.statLabel}>Sets</Text>
                  </View>
                  <View>
                    <Text style={wh.statVal}>{((workout.total_volume || 0) / 1000).toFixed(1)}k</Text>
                    <Text style={wh.statLabel}>Volume lb</Text>
                  </View>
                  <View>
                    <Text style={[wh.statVal, { color: '#c9a84c' }]}>+{workout.total_xp || 0}</Text>
                    <Text style={wh.statLabel}>XP</Text>
                  </View>
                </View>

                {/* Expanded exercise list */}
                {isExpanded && exercises.length > 0 && (
                  <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: IronLore.colors.border, paddingTop: 14, gap: 8 }}>
                    {exercises.map((ex: any, i: number) => {
                      const doneSets = (ex.sets || []).filter((s: any) => s.done);
                      const bestSet = doneSets.reduce((best: any, curr: any) => {
                        if (!best) return curr;
                        return (parseFloat(curr.weight) || 0) > (parseFloat(best.weight) || 0) ? curr : best;
                      }, null);
                      return (
                        <View key={i} style={wh.exRow}>
                          <Text style={wh.exName} numberOfLines={1}>{ex.name}</Text>
                          <Text style={wh.exDetail}>
                            {doneSets.length} sets{bestSet ? ` · ${bestSet.weight}lb × ${bestSet.reps}` : ''}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const wh = StyleSheet.create({
  card: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardExpanded: { borderColor: 'rgba(201,168,76,0.3)', backgroundColor: '#1a1508' },
  date: { fontSize: 15, fontWeight: '700', color: IronLore.colors.text, marginBottom: 2 },
  exerciseCount: { fontSize: 11, color: IronLore.colors.muted },
  statVal: { fontSize: 16, fontWeight: '800', color: IronLore.colors.text, marginBottom: 2 },
  statLabel: { fontSize: 9, color: IronLore.colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exName: { fontSize: 13, fontWeight: '600', color: IronLore.colors.text, flex: 1 },
  exDetail: { fontSize: 11, color: IronLore.colors.muted },
});

// ============================================================
// WATER SCREEN
// ============================================================

function WaterScreen(props: {
  onBack: () => void;
  waterOz: number;
  waterGoalOz: number;
  onAdd: (oz: number) => void;
  onSetGoal: (goalOz: number) => void;
}) {
  const { onBack, waterOz, waterGoalOz, onAdd, onSetGoal } = props;
  const [goalText, setGoalText] = useState(String(waterGoalOz));
  const pct = waterGoalOz > 0 ? Math.max(0, Math.min(1, waterOz / waterGoalOz)) : 0;

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={s.screenTitle}>WATER</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }}>
        <View style={wa.card}>
          <Text style={wa.title}>TODAY</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Text style={wa.big}>{Math.round(waterOz)} oz</Text>
            <Text style={wa.goal}>/ {waterGoalOz} oz</Text>
          </View>
          <View style={wa.barBg}>
            <View style={[wa.barFill, { width: `${pct * 100}%` }]} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {[8, 12, 16].map((amt) => (
              <TouchableOpacity key={amt} style={wa.addBtn} onPress={() => onAdd(amt)} activeOpacity={0.85}>
                <Text style={wa.addText}>+{amt}oz</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={wa.addBtn} onPress={() => onAdd(-8)} activeOpacity={0.85}>
              <Text style={[wa.addText, { color: IronLore.colors.muted }]}>-8oz</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={wa.card}>
          <Text style={wa.title}>GOAL</Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TextInput
              style={[s.modalInput, { flex: 1, marginBottom: 0 }]}
              value={goalText}
              onChangeText={setGoalText}
              placeholder="80"
              placeholderTextColor="#444"
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={wa.saveBtn}
              onPress={() => {
                const next = parseInt(goalText, 10);
                if (!Number.isFinite(next)) return;
                onSetGoal(next);
              }}
              activeOpacity={0.85}
            >
              <Text style={wa.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
          <Text style={wa.hint}>Tip: 80oz is a good default. Adjust for your size and training.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const wa = StyleSheet.create({
  card: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  title: { ...IronLore.type.section, color: IronLore.colors.muted, textTransform: 'uppercase', marginBottom: 10 },
  big: { fontSize: 40, fontWeight: '900', color: IronLore.colors.text },
  goal: { fontSize: 14, fontWeight: '900', color: IronLore.colors.muted, marginBottom: 8 },
  barBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden', marginTop: 12 },
  barFill: { height: '100%', backgroundColor: '#4c7bc9', borderRadius: 8 },
  addBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  addText: { fontSize: 12, fontWeight: '900', color: IronLore.colors.text },
  saveBtn: { backgroundColor: IronLore.colors.gold, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  saveText: { fontSize: 12, fontWeight: '900', color: IronLore.colors.bg, letterSpacing: 1 },
  hint: { fontSize: 12, color: IronLore.colors.muted, marginTop: 10, lineHeight: 18 },
});

// ============================================================
// ANALYTICS SCREEN
// ============================================================

type AnalyticsGoals = { calories: number; protein: number; carbs: number; fat: number };

function AnalyticsScreen({ onBack, userId, goals }: { onBack: () => void; userId: string; goals: AnalyticsGoals }) {
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [liftQuery, setLiftQuery] = useState('');
  const [activeLift, setActiveLift] = useState<string | null>(null);
  const [activePointIdx, setActivePointIdx] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [chartMetric, setChartMetric] = useState<'e1rm' | 'topWeight' | 'sessionVolume'>('e1rm');
  const [heatmapSelected, setHeatmapSelected] = useState<{ date: string; count: number; volume: number } | null>(null);

  const [nutritionLoading, setNutritionLoading] = useState(true);
  const [nutritionDays, setNutritionDays] = useState<{ date: string; totals: { calories: number; protein: number; carbs: number; fat: number } }[]>([]);

  function normalizeLiftName(raw: string) {
    const s = (raw || '').trim().toLowerCase();
    if (!s) return '';
    const cleaned = s
      .replace(/[’']/g, '')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const alias: Record<string, string> = {
      'barbell bench press': 'bench press',
      'benchpress': 'bench press',
      'pull up': 'pull-up',
      'pullups': 'pull-up',
      'pullup': 'pull-up',
      'chin up': 'chin-up',
      'chinup': 'chin-up',
      'over head press': 'overhead press',
      'ohp': 'overhead press',
      'romanian deadlift': 'rdl',
      'r dl': 'rdl',
      'barbell row': 'row',
      'bent over row': 'row',
      'lat pull down': 'lat pulldown',
      'lat pull-down': 'lat pulldown',
    };
    return alias[cleaned] || cleaned;
  }

  function displayLiftName(normalized: string) {
    if (!normalized) return '';
    return normalized
      .split(' ')
      .map(w => w.length ? (w[0].toUpperCase() + w.slice(1)) : w)
      .join(' ');
  }

  function dayKey(d: Date) {
    return d.toISOString().split('T')[0];
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });
      setWorkouts(data || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  useEffect(() => {
    const loadNutrition = async () => {
      setNutritionLoading(true);
      const days: { date: string; totals: { calories: number; protein: number; carbs: number; fat: number } }[] = [];
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = `ironlore:nutritionDay:${dayKey(d)}`;
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.date && parsed?.totals) days.push({ date: parsed.date, totals: parsed.totals });
        } catch {
          // ignore invalid
        }
      }
      setNutritionDays(days);
      setNutritionLoading(false);
    };
    loadNutrition();
  }, []);

  const perLift = (() => {
    const map = new Map<string, { date: string; e1rm: number; topWeight: number; topReps: number; sessionVolume: number; isPR: boolean }[]>();
    const prBest = new Map<string, number>(); // best e1RM so far (for PR marking)
    for (const w of workouts) {
      const date = typeof w.created_at === 'string' ? w.created_at.slice(0, 10) : dayKey(new Date());
      const exs = Array.isArray(w.exercises) ? w.exercises : [];
      for (const ex of exs) {
        const normalized = normalizeLiftName(ex?.name || '');
        if (!normalized) continue;
        const doneSets = (ex.sets || []).filter((s: any) => s?.done);
        if (doneSets.length === 0) continue;
        let best = { e1rm: 0, topWeight: 0, topReps: 0, sessionVolume: 0 };
        for (const s of doneSets) {
          const weight = parseFloat(String(s.weight)) || 0;
          const reps = parseInt(String(s.reps), 10) || 0;
          if (weight <= 0 || reps <= 0) continue;
          const e1 = epley1RM(weight, reps);
          if (e1 > best.e1rm) best = { e1rm: e1, topWeight: weight, topReps: reps, sessionVolume: best.sessionVolume };
          best.sessionVolume += weight * reps;
        }
        if (best.e1rm <= 0) continue;
        const prevBest = prBest.get(normalized) || 0;
        const isPR = best.e1rm > prevBest;
        if (isPR) prBest.set(normalized, best.e1rm);

        if (!map.has(normalized)) map.set(normalized, []);
        map.get(normalized)!.push({ date, ...best, isPR });
      }
    }
    return map;
  })();

  const liftNames = (() => {
    const all = Array.from(perLift.entries()).map(([name, series]) => ({ name, count: series.length }));
    all.sort((a, b) => b.count - a.count);
    const q = liftQuery.trim().toLowerCase();
    const filtered = q ? all.filter(x => x.name.toLowerCase().includes(q)) : all;
    return filtered.map(x => x.name);
  })();

  const resolvedActiveLift = activeLift || liftNames[0] || null;
  const activeSeries = resolvedActiveLift ? (perLift.get(resolvedActiveLift) || []) : [];
  const activeLast12 = activeSeries.slice(-12);
  const metricValue = (p: any) => chartMetric === 'e1rm' ? p.e1rm : chartMetric === 'topWeight' ? p.topWeight : p.sessionVolume;
  const maxVal = activeLast12.length ? Math.max(...activeLast12.map(metricValue)) : 0;
  const minVal = activeLast12.length ? Math.min(...activeLast12.map(metricValue)) : 0;
  const selectedPoint = (activePointIdx !== null && activeLast12[activePointIdx]) ? activeLast12[activePointIdx] : null;
  const chartHeight = 120;

  const heatmap = (() => {
    const counts = new Map<string, number>();
    const volumes = new Map<string, number>();
    for (const w of workouts) {
      const date = typeof w.created_at === 'string' ? w.created_at.slice(0, 10) : null;
      if (!date) continue;
      counts.set(date, (counts.get(date) || 0) + 1);
      volumes.set(date, (volumes.get(date) || 0) + (w.total_volume || 0));
    }
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 7 * 12 + 1);
    // normalize to Sunday
    start.setDate(start.getDate() - start.getDay());
    const days: { date: string; count: number; volume: number }[] = [];
    for (let i = 0; i < 7 * 12; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = dayKey(d);
      days.push({ date: key, count: counts.get(key) || 0, volume: volumes.get(key) || 0 });
    }
    return days;
  })();

  const mostImproved = (() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    let best: { name: string; delta: number; from: number; to: number } | null = null;
    for (const [name, series] of perLift.entries()) {
      const recent = series.filter(p => new Date(p.date) >= cutoff);
      if (recent.length < 2) continue;
      const from = recent[0].e1rm;
      const to = Math.max(...recent.map(p => p.e1rm));
      const delta = to - from;
      if (!best || delta > best.delta) best = { name, delta, from, to };
    }
    return best;
  })();

  const nutritionConsistency = (() => {
    if (nutritionDays.length === 0) return null;
    const hitsProtein = nutritionDays.filter(d => (d.totals?.protein || 0) >= goals.protein).length;
    const percent = Math.round((hitsProtein / nutritionDays.length) * 100);
    return { daysLogged: nutritionDays.length, hitsProtein, percent };
  })();

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={s.screenTitle}>ANALYTICS</Text>
        <View style={{ width: 60 }} />
      </View>

      {(loading || nutritionLoading) ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={IronLore.colors.gold} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}>
          {workouts.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 28 }}>
              <Text style={{ fontSize: 42, marginBottom: 10 }}>📈</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: IronLore.colors.text, marginBottom: 8 }}>No workouts yet</Text>
              <Text style={{ fontSize: 13, color: IronLore.colors.muted, textAlign: 'center', lineHeight: 18 }}>
                Complete a few sessions and your charts will appear here.
              </Text>
            </View>
          ) : (
            <>
              <View style={an.card}>
                <Text style={an.cardTitle}>PER-LIFT PROGRESS</Text>
                <TextInput
                  style={an.search}
                  value={liftQuery}
                  onChangeText={setLiftQuery}
                  placeholder="Search lift…"
                  placeholderTextColor="#444"
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {liftNames.slice(0, 12).map((name) => {
                    const active = name === resolvedActiveLift;
                    return (
                      <TouchableOpacity
                        key={name}
                        style={[an.chip, active && an.chipActive]}
                        onPress={() => { setActiveLift(name); setActivePointIdx(null); }}
                        activeOpacity={0.85}
                      >
                        <Text style={[an.chipText, active && an.chipTextActive]} numberOfLines={1}>{displayLiftName(name)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {resolvedActiveLift && activeLast12.length > 0 ? (
                  <View style={{ marginTop: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
                      <Text style={an.subTitle}>{displayLiftName(resolvedActiveLift)}</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[
                          { key: 'e1rm' as const, label: 'e1RM' },
                          { key: 'topWeight' as const, label: 'Top' },
                          { key: 'sessionVolume' as const, label: 'Vol' },
                        ].map(m => {
                          const active = chartMetric === m.key;
                          return (
                            <TouchableOpacity
                              key={m.key}
                              style={[an.metricPill, active && an.metricPillActive]}
                              onPress={() => { setChartMetric(m.key); setActivePointIdx(null); }}
                              activeOpacity={0.85}
                            >
                              <Text style={[an.metricPillText, active && an.metricPillTextActive]}>{m.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                    <View
                      style={an.chartBars}
                      onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
                    >
                      {/* Trend line + dots overlay */}
                      {chartWidth > 0 && activeLast12.length > 1 && (
                        <View pointerEvents="none" style={[an.chartOverlay, { height: chartHeight }]}>
                          {activeLast12.map((p, idx) => {
                            const n = activeLast12.length;
                            const xStep = chartWidth / n;
                            const x = idx * xStep + xStep / 2;
                            const y = maxVal ? (chartHeight - Math.max((metricValue(p) / maxVal) * 90 + 8, 8)) : chartHeight - 8;
                            const next = activeLast12[idx + 1];
                            const isSelected = activePointIdx === idx;

                            const nextX = next ? ((idx + 1) * xStep + xStep / 2) : x;
                            const nextY = next ? (chartHeight - (maxVal ? Math.max((metricValue(next) / maxVal) * 90 + 8, 8) : 8)) : y;
                            const dx = nextX - x;
                            const dy = nextY - y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                            return (
                              <View key={`pt-${p.date}-${idx}`} style={{ position: 'absolute', left: 0, top: 0, width: chartWidth, height: chartHeight }}>
                                {next ? (
                                  <View
                                    style={{
                                      position: 'absolute',
                                      left: x,
                                      top: y,
                                      width: dist,
                                      height: 2,
                                      backgroundColor: 'rgba(201,168,76,0.35)',
                                      transform: [{ rotate: `${angle}deg` }],
                                      transformOrigin: 'left',
                                    } as any}
                                  />
                                ) : null}
                                <View
                                  style={[
                                    an.dot,
                                    {
                                      left: x - 4,
                                      top: y - 4,
                                      backgroundColor: isSelected ? IronLore.colors.gold : 'rgba(201,168,76,0.55)',
                                      borderColor: isSelected ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.25)',
                                    },
                                  ]}
                                />
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {activeLast12.map((p, idx) => {
                        const h = maxVal ? Math.max((metricValue(p) / maxVal) * 90 + 8, 8) : 8;
                        const isLast = idx === activeLast12.length - 1;
                        const isSelected = activePointIdx === idx;
                        return (
                          <TouchableOpacity
                            key={`${p.date}-${idx}`}
                            style={{ alignItems: 'center', flex: 1 }}
                            onPress={() => setActivePointIdx(idx)}
                            activeOpacity={0.85}
                          >
                            <Text style={{ fontSize: 8, color: isSelected ? IronLore.colors.gold : isLast ? IronLore.colors.gold : '#333344', marginBottom: 2 }}>
                              {isSelected ? `${metricValue(p)}` : isLast ? `${metricValue(p)}` : ''}
                            </Text>
                            <View style={{ width: '100%', height: h, position: 'relative' }}>
                              <View
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  top: 0,
                                  bottom: 0,
                                  backgroundColor: isSelected ? 'rgba(201,168,76,0.55)' : isLast ? IronLore.colors.gold : IronLore.colors.border,
                                  borderRadius: 3,
                                  borderWidth: isSelected ? 1 : 0,
                                  borderColor: isSelected ? 'rgba(201,168,76,0.35)' : 'transparent',
                                }}
                              />
                              {p.isPR && chartMetric === 'e1rm' ? (
                                <View style={an.prDot} />
                              ) : null}
                            </View>
                            <Text style={{ fontSize: 7, color: isSelected ? IronLore.colors.gold : '#333344', marginTop: 2 }}>{p.date.slice(5)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                      <Text style={{ fontSize: 11, color: IronLore.colors.muted }}>Min {minVal || '—'}</Text>
                      <Text style={{ fontSize: 11, color: IronLore.colors.muted }}>Max {maxVal || '—'}</Text>
                    </View>
                    {selectedPoint && (
                      <View style={an.tooltip}>
                        <Text style={an.tooltipTitle}>{selectedPoint.date}</Text>
                        <Text style={an.tooltipBody}>
                          {chartMetric === 'e1rm' ? `e1RM ${selectedPoint.e1rm}` : chartMetric === 'topWeight' ? `Top ${selectedPoint.topWeight}` : `Volume ${Math.round(selectedPoint.sessionVolume)}`} • top set {selectedPoint.topWeight}×{selectedPoint.topReps}
                        </Text>
                      </View>
                    )}

                    {/* PR history */}
                    {chartMetric === 'e1rm' && activeSeries.filter(p => p.isPR).length > 0 ? (
                      <View style={{ marginTop: 12 }}>
                        <Text style={an.smallTitle}>PR HISTORY</Text>
                        {activeSeries.filter(p => p.isPR).slice(-6).reverse().map((p, i) => (
                          <View key={`${p.date}-pr-${i}`} style={an.prRow}>
                            <Text style={an.prDate}>{p.date}</Text>
                            <Text style={an.prVal}>{p.e1rm} e1RM</Text>
                            <Text style={an.prDetail}>{p.topWeight}×{p.topReps}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    <Text style={{ fontSize: 12, color: IronLore.colors.muted, marginTop: 10 }}>
                      Estimated 1RM (Epley) • last {activeLast12.length} sessions
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: IronLore.colors.muted, marginTop: 14 }}>
                    Log at least 2 sets on a lift to see a trend.
                  </Text>
                )}
              </View>

              <View style={an.card}>
                <Text style={an.cardTitle}>WORKOUT FREQUENCY</Text>
                <Text style={{ fontSize: 12, color: IronLore.colors.muted, marginBottom: 10 }}>Last 12 weeks</Text>
                <View style={an.heatmapWrap}>
                  {Array.from({ length: 12 }).map((_, weekIdx) => (
                    <View key={weekIdx} style={{ gap: 4 }}>
                      {Array.from({ length: 7 }).map((__, dayIdx) => {
                        const item = heatmap[weekIdx * 7 + dayIdx];
                        const c = item?.count || 0;
                        const bg = c === 0 ? 'rgba(255,255,255,0.04)' : c === 1 ? 'rgba(201,168,76,0.18)' : c === 2 ? 'rgba(201,168,76,0.28)' : 'rgba(201,168,76,0.42)';
                        return (
                          <TouchableOpacity
                            key={`${weekIdx}-${dayIdx}`}
                            onPress={() => setHeatmapSelected(item ? { date: item.date, count: item.count, volume: item.volume } : null)}
                            activeOpacity={0.85}
                            style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: bg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
                {heatmapSelected ? (
                  <View style={an.tooltip}>
                    <Text style={an.tooltipTitle}>{heatmapSelected.date}</Text>
                    <Text style={an.tooltipBody}>
                      {heatmapSelected.count} workout{heatmapSelected.count === 1 ? '' : 's'} • {Math.round(heatmapSelected.volume).toLocaleString()} lb volume
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: IronLore.colors.muted, marginTop: 10 }}>
                    Tap a day to inspect.
                  </Text>
                )}
              </View>

              <View style={an.card}>
                <Text style={an.cardTitle}>MOST IMPROVED (30 DAYS)</Text>
                {mostImproved ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: IronLore.colors.text }}>{mostImproved.name}</Text>
                    <Text style={{ fontSize: 13, color: IronLore.colors.muted, marginTop: 6 }}>
                      {mostImproved.from} → {mostImproved.to} e1RM • +{Math.round(mostImproved.delta)} improvement
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: IronLore.colors.muted, marginTop: 10 }}>
                    Log a lift at least twice this month to calculate improvement.
                  </Text>
                )}
              </View>

              <View style={an.card}>
                <Text style={an.cardTitle}>NUTRITION CONSISTENCY</Text>
                {nutritionConsistency ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 26, fontWeight: '900', color: IronLore.colors.gold }}>{nutritionConsistency.percent}%</Text>
                    <Text style={{ fontSize: 12, color: IronLore.colors.muted, marginTop: 4 }}>
                      Protein goal hit {nutritionConsistency.hitsProtein}/{nutritionConsistency.daysLogged} logged days
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: IronLore.colors.muted, marginTop: 10 }}>
                    Log food for a few days to unlock consistency metrics.
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const an = StyleSheet.create({
  card: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardTitle: { ...IronLore.type.section, color: IronLore.colors.muted, textTransform: 'uppercase', marginBottom: 10 },
  subTitle: { fontSize: 15, fontWeight: '900', color: IronLore.colors.text, marginBottom: 10 },
  smallTitle: { fontSize: 10, fontWeight: '900', color: IronLore.colors.muted, letterSpacing: 1.5, marginBottom: 8, marginTop: 6 },
  search: { backgroundColor: IronLore.colors.panel2, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: IronLore.colors.text, marginBottom: 10 },
  chip: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, maxWidth: 180 },
  chipActive: { backgroundColor: 'rgba(201,168,76,0.12)', borderColor: 'rgba(201,168,76,0.28)' },
  chipText: { fontSize: 12, fontWeight: '700', color: IronLore.colors.muted },
  chipTextActive: { color: IronLore.colors.gold },
  metricPill: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  metricPillActive: { backgroundColor: 'rgba(201,168,76,0.12)', borderColor: 'rgba(201,168,76,0.28)' },
  metricPillText: { fontSize: 11, fontWeight: '800', color: IronLore.colors.muted },
  metricPillTextActive: { color: IronLore.colors.gold },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 2, position: 'relative' },
  chartOverlay: { position: 'absolute', left: 0, right: 0, top: 0 },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, borderWidth: 1 },
  prDot: { position: 'absolute', right: 2, top: 2, width: 6, height: 6, borderRadius: 3, backgroundColor: '#4cc97a', borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' },
  tooltip: { marginTop: 10, backgroundColor: IronLore.colors.panel2, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 12, padding: 12 },
  tooltipTitle: { fontSize: 12, fontWeight: '900', color: IronLore.colors.text, marginBottom: 4 },
  tooltipBody: { fontSize: 12, fontWeight: '700', color: IronLore.colors.muted },
  prRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 },
  prDate: { width: 86, fontSize: 11, fontWeight: '800', color: IronLore.colors.text },
  prVal: { width: 70, fontSize: 11, fontWeight: '900', color: IronLore.colors.gold },
  prDetail: { flex: 1, fontSize: 11, fontWeight: '700', color: IronLore.colors.muted, textAlign: 'right' },
  heatmapWrap: { flexDirection: 'row', gap: 4, justifyContent: 'space-between' },
});

// ============================================================
// FRIENDS SCREEN
// ============================================================

type FriendProfile = { id: string; name?: string | null; handle?: string | null; class_id?: string | null };
type FriendRequestRow = { id: string; from_user_id: string; to_user_id: string; status: 'pending' | 'accepted' | 'declined' | 'cancelled'; created_at: string };

function FriendsScreen({ onBack, userId }: { onBack: () => void; userId: string }) {
  const [tab, setTab] = useState<'feed' | 'requests' | 'friends'>('feed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [handleQuery, setHandleQuery] = useState('');
  const [sending, setSending] = useState(false);

  const [requests, setRequests] = useState<FriendRequestRow[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [requestProfiles, setRequestProfiles] = useState<Record<string, FriendProfile>>({});

  const friendIds = friends.map(f => f.id);
  const profilesById = new Map(friends.map(f => [f.id, f]));

  function titleCase(s: string) {
    return (s || '')
      .split(' ')
      .map(w => w.length ? (w[0].toUpperCase() + w.slice(1)) : w)
      .join(' ');
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  const loadRequests = useCallback(async () => {
    const { data } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    setRequests((data || []) as any);

    const ids = Array.from(new Set((data || []).flatMap((r: any) => [r.from_user_id, r.to_user_id]).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id,name,handle,class_id')
        .in('id', ids);
      const map: Record<string, FriendProfile> = {};
      for (const p of (profs || []) as any[]) map[p.id] = p;
      setRequestProfiles(map);
    } else {
      setRequestProfiles({});
    }
  }, [userId]);

  const loadFriends = useCallback(async () => {
    const { data } = await supabase
      .from('friends')
      .select('friend_user_id')
      .eq('user_id', userId);
    const ids = (data || []).map((r: any) => r.friend_user_id).filter(Boolean);
    if (ids.length === 0) {
      setFriends([]);
      return;
    }
    const { data: profs } = await supabase
      .from('profiles')
      .select('id,name,handle,class_id')
      .in('id', ids);
    setFriends((profs || []) as any);
  }, [userId]);

  const loadFeed = useCallback(async () => {
    if (friendIds.length === 0) {
      setFeed([]);
      return;
    }
    const { data } = await supabase
      .from('workouts')
      .select('user_id,created_at,duration,total_volume,total_sets,total_xp')
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .limit(30);
    setFeed(data || []);
  }, [friendIds]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await loadFriends();
      await loadRequests();
    } catch {
      setError('Could not load friends. Check your connection.');
    }
    setLoading(false);
  }, [loadFriends, loadRequests]);

  useEffect(() => { refreshAll(); }, [refreshAll]);
  useEffect(() => { loadFeed(); }, [loadFeed]);

  async function sendRequest() {
    const handle = handleQuery.trim().toLowerCase().replace(/^@/, '');
    if (!handle) return;
    setSending(true);
    setError('');
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id,handle,name')
        .eq('handle', handle)
        .maybeSingle();
      if (!prof?.id) {
        setError('No user found with that handle.');
        setSending(false);
        return;
      }
      if (prof.id === userId) {
        setError('You can’t add yourself.');
        setSending(false);
        return;
      }
      const { error: e } = await supabase.from('friend_requests').insert({
        from_user_id: userId,
        to_user_id: prof.id,
        status: 'pending',
      });
      if (e) setError(e.message);
      else {
        setHandleQuery('');
        await loadRequests();
      }
    } catch {
      setError('Failed to send request.');
    }
    setSending(false);
  }

  async function acceptRequest(req: FriendRequestRow) {
    setError('');
    try {
      await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', req.id);
      await supabase.from('friends').upsert([
        { user_id: req.from_user_id, friend_user_id: req.to_user_id },
        { user_id: req.to_user_id, friend_user_id: req.from_user_id },
      ], { onConflict: 'user_id,friend_user_id' });
      await refreshAll();
    } catch {
      setError('Failed to accept request.');
    }
  }

  async function declineRequest(req: FriendRequestRow) {
    setError('');
    try {
      await supabase.from('friend_requests').update({ status: 'declined' }).eq('id', req.id);
      await loadRequests();
    } catch {
      setError('Failed to decline request.');
    }
  }

  async function cancelRequest(req: FriendRequestRow) {
    setError('');
    try {
      await supabase.from('friend_requests').update({ status: 'cancelled' }).eq('id', req.id);
      await loadRequests();
    } catch {
      setError('Failed to cancel request.');
    }
  }

  async function removeFriend(friendId: string) {
    setError('');
    try {
      await supabase.from('friends').delete().eq('user_id', userId).eq('friend_user_id', friendId);
      await supabase.from('friends').delete().eq('user_id', friendId).eq('friend_user_id', userId);
      await refreshAll();
    } catch {
      setError('Failed to remove friend.');
    }
  }

  const incoming = requests.filter(r => r.status === 'pending' && r.to_user_id === userId);
  const outgoing = requests.filter(r => r.status === 'pending' && r.from_user_id === userId);

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={s.screenTitle}>FRIENDS</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={IronLore.colors.gold} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }}>
          <View style={fr.card}>
            <Text style={fr.cardTitle}>ADD FRIEND</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[fr.input, { flex: 1 }]}
                value={handleQuery}
                onChangeText={setHandleQuery}
                placeholder="@handle"
                placeholderTextColor="#444"
                autoCapitalize="none"
              />
              <TouchableOpacity style={[fr.primaryBtn, sending && { opacity: 0.6 }]} onPress={sendRequest} disabled={sending} activeOpacity={0.85}>
                <Text style={fr.primaryText}>{sending ? 'Sending…' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
            {error ? <Text style={fr.errorText}>{error}</Text> : null}
          </View>

          <View style={fr.segment}>
            {[
              { key: 'feed' as const, label: 'Feed' },
              { key: 'requests' as const, label: `Requests${incoming.length ? ` (${incoming.length})` : ''}` },
              { key: 'friends' as const, label: `Friends (${friends.length})` },
            ].map(t => {
              const active = tab === t.key;
              return (
                <TouchableOpacity key={t.key} style={[fr.segBtn, active && fr.segBtnActive]} onPress={() => setTab(t.key)} activeOpacity={0.85}>
                  <Text style={[fr.segText, active && fr.segTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {tab === 'requests' && (
            <View style={fr.card}>
              <Text style={fr.cardTitle}>REQUESTS</Text>
              {incoming.length === 0 && outgoing.length === 0 ? (
                <Text style={fr.muted}>No pending requests.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {incoming.map(req => (
                    <View key={req.id} style={fr.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={fr.rowTitle}>
                          {requestProfiles[req.from_user_id]?.name || `@${requestProfiles[req.from_user_id]?.handle || 'unknown'}`}
                        </Text>
                        <Text style={fr.rowSub}>Incoming request</Text>
                      </View>
                      <View style={fr.rowBtns}>
                        <TouchableOpacity style={fr.secondaryBtn} onPress={() => declineRequest(req)} activeOpacity={0.85}><Text style={fr.secondaryText}>Decline</Text></TouchableOpacity>
                        <TouchableOpacity style={fr.primaryBtn} onPress={() => acceptRequest(req)} activeOpacity={0.85}><Text style={fr.primaryText}>Accept</Text></TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {outgoing.map(req => (
                    <View key={req.id} style={fr.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={fr.rowTitle}>
                          {requestProfiles[req.to_user_id]?.name || `@${requestProfiles[req.to_user_id]?.handle || 'unknown'}`}
                        </Text>
                        <Text style={fr.rowSub}>Outgoing request</Text>
                      </View>
                      <View style={fr.rowBtns}>
                        <TouchableOpacity style={fr.secondaryBtn} onPress={() => cancelRequest(req)} activeOpacity={0.85}><Text style={fr.secondaryText}>Cancel</Text></TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {tab === 'friends' && (
            <View style={fr.card}>
              <Text style={fr.cardTitle}>FRIENDS</Text>
              {friends.length === 0 ? (
                <Text style={fr.muted}>No friends yet. Add a handle above.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {friends.map(f => (
                    <View key={f.id} style={fr.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={fr.rowTitle}>{f.name || titleCase((f.handle || '').replace(/^@/, '')) || 'Friend'}</Text>
                        <Text style={fr.rowSub}>@{(f.handle || '').replace(/^@/, '')}</Text>
                      </View>
                      <TouchableOpacity style={fr.secondaryBtn} onPress={() => removeFriend(f.id)} activeOpacity={0.85}>
                        <Text style={fr.secondaryText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {tab === 'feed' && (
            <View style={fr.card}>
              <Text style={fr.cardTitle}>FRIEND FEED</Text>
              {friendIds.length === 0 ? (
                <Text style={fr.muted}>Add friends to see their workouts.</Text>
              ) : feed.length === 0 ? (
                <Text style={fr.muted}>No recent workouts yet.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {feed.map((w: any, i: number) => {
                    const p = profilesById.get(w.user_id);
                    return (
                      <View key={`${w.user_id}-${w.created_at}-${i}`} style={fr.feedCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <Text style={fr.feedName}>{p?.name || `@${p?.handle || 'friend'}`}</Text>
                            <Text style={fr.feedDate}>{formatDate(w.created_at)}</Text>
                          </View>
                          <Text style={fr.feedBadge}>FRIENDS</Text>
                        </View>
                        <View style={fr.feedStats}>
                          <View>
                            <Text style={fr.feedStatVal}>{Math.round((w.duration || 0) / 60)}m</Text>
                            <Text style={fr.feedStatLabel}>Duration</Text>
                          </View>
                          <View>
                            <Text style={fr.feedStatVal}>{w.total_sets || 0}</Text>
                            <Text style={fr.feedStatLabel}>Sets</Text>
                          </View>
                          <View>
                            <Text style={fr.feedStatVal}>{Math.round((w.total_volume || 0) / 1000).toFixed(1)}k</Text>
                            <Text style={fr.feedStatLabel}>Volume</Text>
                          </View>
                          <View>
                            <Text style={[fr.feedStatVal, { color: IronLore.colors.gold }]}>+{w.total_xp || 0}</Text>
                            <Text style={fr.feedStatLabel}>XP</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const fr = StyleSheet.create({
  card: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardTitle: { ...IronLore.type.section, color: IronLore.colors.muted, textTransform: 'uppercase', marginBottom: 10 },
  input: { backgroundColor: IronLore.colors.panel2, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: IronLore.colors.text },
  errorText: { marginTop: 10, fontSize: 12, fontWeight: '700', color: IronLore.colors.red },
  muted: { fontSize: 12, color: IronLore.colors.muted, lineHeight: 18 },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segBtnActive: { backgroundColor: 'rgba(201,168,76,0.12)' },
  segText: { fontSize: 12, fontWeight: '800', color: IronLore.colors.muted },
  segTextActive: { color: IronLore.colors.gold },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  rowTitle: { fontSize: 14, fontWeight: '800', color: IronLore.colors.text },
  rowSub: { fontSize: 12, fontWeight: '700', color: IronLore.colors.muted, marginTop: 4 },
  rowBtns: { flexDirection: 'row', gap: 8 },
  primaryBtn: { backgroundColor: IronLore.colors.gold, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 13, fontWeight: '900', color: IronLore.colors.bg },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 13, fontWeight: '800', color: IronLore.colors.muted },
  feedCard: { backgroundColor: IronLore.colors.panel2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 },
  feedName: { fontSize: 14, fontWeight: '900', color: IronLore.colors.text },
  feedDate: { fontSize: 11, fontWeight: '700', color: IronLore.colors.muted, marginTop: 4 },
  feedBadge: { fontSize: 10, fontWeight: '900', color: IronLore.colors.gold, letterSpacing: 2 },
  feedStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  feedStatVal: { fontSize: 14, fontWeight: '900', color: IronLore.colors.text, marginBottom: 2 },
  feedStatLabel: { fontSize: 9, fontWeight: '700', color: IronLore.colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
});

// ============================================================
// ONBOARDING DATA
// ============================================================

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
  function prevStep() { setStep(s => Math.max(0, s - 1)); }

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
            Build your warrior. Track training, nutrition, and progress.
            Earn XP in the real world.
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
          <Text style={ob.stepDesc}>Your class sets your vibe, quests, and Coach voice.</Text>
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
          <TouchableOpacity style={ob.backBtn} onPress={prevStep}>
            <Text style={ob.backBtnText}>← Back</Text>
          </TouchableOpacity>
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
          <Text style={ob.stepDesc}>This is your name in the Iron Realm.</Text>
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
          <TouchableOpacity style={ob.backBtn} onPress={prevStep}>
            <Text style={ob.backBtnText}>← Back</Text>
          </TouchableOpacity>
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
          <Text style={ob.stepDesc}>Your path sets your daily focus and Coach guidance.</Text>
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
          <TouchableOpacity style={ob.backBtn} onPress={prevStep}>
            <Text style={ob.backBtnText}>← Back</Text>
          </TouchableOpacity>
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
  root: { flex: 1, backgroundColor: IronLore.colors.bg },
  welcomeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emblemWrap: { alignItems: 'center', marginBottom: 20 },
  emblemTop: { fontSize: 28, color: 'rgba(201,168,76,0.6)' },
  emblemDivider: { width: 60, height: 1, backgroundColor: 'rgba(201,168,76,0.3)', marginVertical: 6 },
  emblemBottom: { fontSize: 28, color: 'rgba(201,168,76,0.6)' },
  welcomeTitle: { fontSize: 42, fontWeight: '900', color: IronLore.colors.gold, letterSpacing: 8, marginBottom: 8 },
  welcomeSub: { fontSize: 14, color: IronLore.colors.muted, fontStyle: 'italic', marginBottom: 20, textAlign: 'center' },
  welcomeBody: { fontSize: 14, color: '#666677', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  runeRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  rune: { fontSize: 22 },
  primaryBtn: { backgroundColor: IronLore.colors.gold, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', width: '100%' },
  primaryBtnDisabled: { backgroundColor: IronLore.colors.border },
  primaryBtnText: { ...IronLore.type.button, color: IronLore.colors.bg },
  welcomeFooter: { fontSize: 11, color: '#333344', marginTop: 14 },
  stepHeader: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: IronLore.colors.border },
  stepNum: { fontSize: 10, fontWeight: '700', color: IronLore.colors.gold, letterSpacing: 2, marginBottom: 6 },
  stepTitle: { fontSize: 26, fontWeight: '900', color: IronLore.colors.text, marginBottom: 6 },
  stepDesc: { fontSize: 13, color: IronLore.colors.muted, lineHeight: 18 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, backgroundColor: 'rgba(10,10,15,0.97)', borderTopWidth: 1, borderTopColor: IronLore.colors.border },
  backBtn: { alignSelf: 'center', marginBottom: 10, paddingVertical: 8, paddingHorizontal: 12 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: IronLore.colors.muted },
  classCard: { backgroundColor: IronLore.colors.panel, borderWidth: 1.5, borderColor: IronLore.colors.border, borderRadius: 18, padding: 16, flexDirection: 'row', gap: 14 },
  classIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  classIcon: { fontSize: 26 },
  className: { fontSize: 17, fontWeight: '800', color: IronLore.colors.text },
  classTagline: { fontSize: 12, color: IronLore.colors.gold, fontStyle: 'italic', marginBottom: 4 },
  classDesc: { fontSize: 12, color: IronLore.colors.muted, lineHeight: 17 },
  classCoach: { fontSize: 11, color: '#555566', fontStyle: 'italic', marginTop: 4 },
  selectedTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  selectedTagText: { fontSize: 9, fontWeight: '700', color: IronLore.colors.bg, textTransform: 'uppercase', letterSpacing: 0.5 },
  statLabel: { fontSize: 9, color: '#666677', textTransform: 'uppercase', letterSpacing: 0.5, width: 66 },
  statBarBg: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 2 },
  classBest: { fontSize: 10, color: IronLore.colors.muted, marginTop: 8, fontStyle: 'italic' },
  nameInput: { backgroundColor: IronLore.colors.panel, borderWidth: 1.5, borderColor: IronLore.colors.border, borderRadius: 14, padding: 16, fontSize: 20, fontWeight: '700', color: IronLore.colors.text, textAlign: 'center', marginBottom: 10 },
  namePreview: { fontSize: 14, color: IronLore.colors.gold, textAlign: 'center', fontStyle: 'italic' },
  suggestLabel: { fontSize: 10, fontWeight: '600', color: '#444455', letterSpacing: 1 },
  suggestPill: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  suggestPillText: { fontSize: 13, color: IronLore.colors.muted },
  goalCard: { backgroundColor: IronLore.colors.panel, borderWidth: 1.5, borderColor: IronLore.colors.border, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  goalIcon: { fontSize: 28 },
  goalName: { fontSize: 15, fontWeight: '700', color: IronLore.colors.text, marginBottom: 3 },
  goalDesc: { fontSize: 12, color: IronLore.colors.muted },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: IronLore.colors.border, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  revealContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  revealEyebrow: { fontSize: 10, fontWeight: '700', color: IronLore.colors.gold, letterSpacing: 3, marginBottom: 20 },
  revealAvatar: { width: 110, height: 110, borderRadius: 28, borderWidth: 3, backgroundColor: '#1a0e0e', alignItems: 'center', justifyContent: 'center', marginBottom: 18, shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  revealName: { fontSize: 34, fontWeight: '900', marginBottom: 4 },
  revealTitle: { fontSize: 14, color: IronLore.colors.muted, fontStyle: 'italic', marginBottom: 14 },
  revealClassBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 10 },
  revealClassText: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  revealGoalBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 20 },
  revealGoalText: { fontSize: 12, fontWeight: '600' },
  revealStats: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  revealStatItem: { alignItems: 'center' },
  revealStatVal: { fontSize: 22, fontWeight: '900' },
  revealStatName: { fontSize: 9, color: IronLore.colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  revealCoach: { fontSize: 12, color: '#555566', fontStyle: 'italic', textAlign: 'center' },
});

// ============================================================
// HOME SCREEN
// ============================================================

export default function HomeScreen() {
  const [screen, setScreen] = useState<'home' | 'train' | 'nutrition' | 'achievements' | 'shop' | 'supplements' | 'bodyweight' | 'coach' | 'profile' | 'history' | 'settings' | 'analytics' | 'friends' | 'water'>('home');
  const [cleanMode, setCleanMode] = useState(false);
  const [streak, setStreak] = useState(0);
  const [workoutDoneToday, setWorkoutDoneToday] = useState(false);
  const [morningSuppsCount, setMorningSuppsCount] = useState(0);
  const [morningSuppsTotal, setMorningSuppsTotal] = useState(4);
  const [proteinToday, setProteinToday] = useState(0);
  const [waterOz, setWaterOz] = useState(0);
  const [waterGoalOz, setWaterGoalOz] = useState(80);
  const [coins, setCoins] = useState(1250);
  const [dailyRewardOpen, setDailyRewardOpen] = useState(false);
  const [dailyRewardCoins, setDailyRewardCoins] = useState(0);
  const [dailyRewardDay, setDailyRewardDay] = useState(1);
  const [spinOpen, setSpinOpen] = useState(false);
  const [spinLastDate, setSpinLastDate] = useState<string | null>(null);
  const [spinResult, setSpinResult] = useState<{ coins: number; label: string } | null>(null);
  const [spinSpinning, setSpinSpinning] = useState(false);
  const spinRotation = useRef(new Animated.Value(0)).current;
  const spinTickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hasCharacter, setHasCharacter] = useState(false);
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareCaptureRef = useRef<any>(null);

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
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadWater() {
      const today = new Date().toISOString().split('T')[0];
      const key = `ironlore:waterDay:${today}`;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.consumedOz === 'number') setWaterOz(parsed.consumedOz);
        if (typeof parsed?.goalOz === 'number') setWaterGoalOz(parsed.goalOz);
      } catch {
        // ignore
      }
    }
    loadWater();
  }, []);

  async function persistWater(next: { consumedOz: number; goalOz: number }) {
    const today = new Date().toISOString().split('T')[0];
    const key = `ironlore:waterDay:${today}`;
    await AsyncStorage.setItem(key, JSON.stringify({ date: today, ...next }));
  }

  async function addWater(oz: number) {
    const next = Math.max(0, Math.round((waterOz + oz) * 10) / 10);
    setWaterOz(next);
    await persistWater({ consumedOz: next, goalOz: waterGoalOz });
  }

  async function setWaterGoal(nextGoal: number) {
    const goal = Math.max(20, Math.min(200, Math.round(nextGoal)));
    setWaterGoalOz(goal);
    await persistWater({ consumedOz: waterOz, goalOz: goal });
  }

  useEffect(() => {
    AsyncStorage.getItem('cleanMode').then(val => {
      if (val === 'true') setCleanMode(true);
    });
    // Register push notifications
    if (Device.isDevice) {
      Notifications.getPermissionsAsync().then(({ status }) => {
        if (status !== 'granted') {
          Notifications.requestPermissionsAsync();
        }
      });
    }
  }, []);

  useEffect(() => {
    async function loadSpinState() {
      if (!userId) return;
      const key = `ironlore:spinWheel:${userId}`;
      const val = await AsyncStorage.getItem(key);
      setSpinLastDate(val);
    }
    loadSpinState();
  }, [userId]);

  function toggleCleanMode(val: boolean) {
    setCleanMode(val);
    AsyncStorage.setItem('cleanMode', val ? 'true' : 'false');
  }

  async function loadProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data?.name && data?.class_id) {
      setCharacter({ name: data.name, classId: data.class_id, goalId: data.goal_id || '' });
      setCoins(data.coins || 1250);
      setHasCharacter(true);

      // Streak logic
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = data.last_login;
      let newStreak = data.streak || 0;
      const isNewLoginDay = !lastLogin || lastLogin !== today;

      if (!lastLogin) {
        // First login ever
        newStreak = 1;
      } else if (lastLogin === today) {
        // Already logged in today, keep streak
        newStreak = data.streak || 1;
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (lastLogin === yesterdayStr) {
          // Logged in yesterday — increment
          newStreak = (data.streak || 0) + 1;
        } else {
          // Missed a day — reset
          newStreak = 1;
        }
      }

      setStreak(newStreak);

      // Save updated streak and last_login
      await supabase.from('profiles').update({
        streak: newStreak,
        last_login: today,
      }).eq('id', uid);

      // Daily login reward (local-claim to prevent double pop)
      if (isNewLoginDay) {
        const claimKey = `ironlore:dailyRewardClaim:${uid}`;
        const claimed = await AsyncStorage.getItem(claimKey);
        if (claimed !== today) {
          const day = Math.min(7, Math.max(1, newStreak));
          const rewardTable = [0, 50, 75, 100, 125, 150, 200, 300]; // index = day
          setDailyRewardDay(day);
          setDailyRewardCoins(rewardTable[day] ?? 100);
          setDailyRewardOpen(true);
        }
      }
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

  async function claimDailyReward() {
    if (!userId || dailyRewardCoins <= 0) {
      setDailyRewardOpen(false);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const claimKey = `ironlore:dailyRewardClaim:${userId}`;
    await AsyncStorage.setItem(claimKey, today);
    const nextCoins = coins + dailyRewardCoins;
    setCoins(nextCoins);
    setDailyRewardOpen(false);
    setDailyRewardCoins(0);
    await supabase.from('profiles').update({ coins: nextCoins }).eq('id', userId);
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const spunToday = !!spinLastDate && spinLastDate === todayStr;
  const spinAvailable = workoutDoneToday && !spunToday;

  async function doSpinWheel() {
    if (!userId) return;
    if (!spinAvailable) return;
    if (spinSpinning) return;

    // Weighted rewards (coins-only for launch safety)
    const rewards: { coins: number; label: string; weight: number }[] = [
      { coins: 25, label: 'Common', weight: 34 },
      { coins: 50, label: 'Common', weight: 28 },
      { coins: 75, label: 'Uncommon', weight: 18 },
      { coins: 100, label: 'Uncommon', weight: 10 },
      { coins: 150, label: 'Rare', weight: 6 },
      { coins: 250, label: 'Epic', weight: 3 },
      { coins: 500, label: 'Legendary', weight: 1 },
    ];
    const total = rewards.reduce((sum, r) => sum + r.weight, 0);
    let roll = Math.random() * total;
    let chosen = rewards[0];
    for (const r of rewards) {
      roll -= r.weight;
      if (roll <= 0) {
        chosen = r;
        break;
      }
    }

    setSpinSpinning(true);
    setSpinResult(null);
    spinRotation.setValue(0);

    // Ticking haptics while spinning
    if (spinTickTimerRef.current) clearInterval(spinTickTimerRef.current);
    spinTickTimerRef.current = setInterval(() => {
      Haptics.selectionAsync().catch(() => {});
    }, 80);

    const durationMs = 1350;
    await new Promise<void>((resolve) => {
      Animated.timing(spinRotation, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => resolve());
    });
    if (spinTickTimerRef.current) {
      clearInterval(spinTickTimerRef.current);
      spinTickTimerRef.current = null;
    }

    Vibration.vibrate(20);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSpinResult({ coins: chosen.coins, label: chosen.label });

    const key = `ironlore:spinWheel:${userId}`;
    await AsyncStorage.setItem(key, todayStr);
    setSpinLastDate(todayStr);

    const nextCoins = coins + chosen.coins;
    setCoins(nextCoins);
    await supabase.from('profiles').update({ coins: nextCoins }).eq('id', userId);
    setSpinSpinning(false);
  }

  if (!authChecked) {
    return <View style={{ flex: 1, backgroundColor: IronLore.colors.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={IronLore.colors.gold} size="large" /></View>;
  }

  if (!userId) return <AuthScreen onAuth={() => {}} />;
  if (!hasCharacter) return <OnboardingScreen onComplete={handleOnboardingComplete} />;

  const chosenClass = CLASSES.find(c => c.id === character?.classId);
  const classTitle = chosenClass?.name === 'Monk' ? 'Ascendant' : chosenClass?.name === 'Ranger' ? 'Swift' : chosenClass?.name === 'Berserker' ? 'Unbound' : 'Ironborn';
  const charDisplayName = character ? `${character.name} the ${classTitle}` : 'Warrior';
  const charClassLabel = chosenClass ? `${chosenClass.icon} ${chosenClass.name.toUpperCase()} CLASS` : '⚔ WARRIOR CLASS';

  const wellnessWorkout = workoutDoneToday ? 1 : 0;
  const wellnessProtein = GOALS.protein ? Math.max(0, Math.min(1, proteinToday / GOALS.protein)) : 0;
  const wellnessSupps = morningSuppsTotal ? Math.max(0, Math.min(1, morningSuppsCount / morningSuppsTotal)) : 0;
  const wellnessStreak = Math.max(0, Math.min(1, streak / 7));
  const wellnessScore = Math.round((wellnessWorkout * 0.35 + wellnessProtein * 0.30 + wellnessSupps * 0.20 + wellnessStreak * 0.15) * 100);

  const sharePayload = {
    playerName: character?.name || 'Warrior',
    className: chosenClass?.name || 'Warrior',
    classIcon: chosenClass?.icon || '⚔️',
    dateLabel: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase(),
    stats: [
      { label: 'Streak', value: `${streak}d` },
      { label: 'Coins', value: coins.toLocaleString() },
      { label: 'Protein', value: `${Math.round(proteinToday)}g` },
      {
        label: 'Quests',
        value: `${[
          workoutDoneToday,
          GOALS.protein ? proteinToday >= GOALS.protein : false,
          morningSuppsTotal ? morningSuppsCount >= morningSuppsTotal : false,
        ].filter(Boolean).length}/3`,
      },
    ],
    quests: [
      { name: 'Forge the Iron', detail: workoutDoneToday ? 'Complete' : 'Train today', pct: workoutDoneToday ? 1 : 0, reward: '+200 XP' },
      { name: 'Protein Pact', detail: `${Math.round(proteinToday)} / ${GOALS.protein}g`, pct: GOALS.protein ? proteinToday / GOALS.protein : 0, reward: '+150 XP' },
      { name: 'Morning Stack', detail: `${morningSuppsCount} / ${morningSuppsTotal} taken`, pct: morningSuppsTotal ? morningSuppsCount / morningSuppsTotal : 0, reward: '+100 XP' },
    ],
  };

  async function shareQuestCard() {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) return;
      if (!shareCaptureRef.current) return;

      const uri = await captureRef(shareCaptureRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await Sharing.shareAsync(uri);
    } catch {
      // no-op (canceled / failed)
    }
  }

  const homeContent = (
    <View style={s.root}>
      <StatusBar style="light" />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Text style={s.logo}>IRONLORE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={[s.coinDisplay, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
              onPress={() => setShareOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={s.coinDisplayText}>↗ Share</Text>
            </TouchableOpacity>
            {!cleanMode && (
              <TouchableOpacity style={s.coinDisplay} onPress={() => setScreen('shop')}>
                <Text style={s.coinDisplayText}>🪙 {coins.toLocaleString()}</Text>
              </TouchableOpacity>
            )}
            {!cleanMode && (
              <View style={s.streakBadge}><Text style={s.streakText}>🔥 {streak}</Text></View>
            )}
            <TouchableOpacity onPress={() => setScreen('profile')}>
              <View style={[s.avatarCircle, { borderColor: chosenClass?.color || '#c9a84c', backgroundColor: chosenClass ? `${chosenClass.color}30` : '#8b2020' }]}>
                <Text style={{ fontSize: 16 }}>{chosenClass?.icon || '⚔️'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.wellnessCard}>
          <View style={s.wellnessTop}>
            <Text style={s.wellnessTitle}>WELLNESS SCORE</Text>
            <Text style={s.wellnessScore}>{wellnessScore}</Text>
          </View>
          <View style={s.wellnessBarBg}>
            <View style={[s.wellnessBarFill, { width: `${Math.max(0, Math.min(100, wellnessScore))}%` }]} />
          </View>
          <View style={s.wellnessBreakdown}>
            <Text style={s.wellnessChip}>{workoutDoneToday ? '🏋️ Workout ✓' : '🏋️ Workout'}</Text>
            <Text style={s.wellnessChip}>🥩 {Math.round(proteinToday)}/{GOALS.protein}g</Text>
            <Text style={s.wellnessChip}>💊 {morningSuppsCount}/{morningSuppsTotal}</Text>
            <Text style={s.wellnessChip}>🔥 {streak}d</Text>
          </View>

          <TouchableOpacity
            style={s.waterRow}
            onPress={() => setScreen('water')}
            activeOpacity={0.85}
          >
            <Text style={s.waterLabel}>💧 Water</Text>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <View style={s.waterBarBg}>
                <View style={[s.waterBarFill, { width: `${Math.min((waterOz / waterGoalOz) * 100, 100)}%` as any }]} />
              </View>
            </View>
            <Text style={s.waterValue}>{Math.round(waterOz)}/{waterGoalOz}oz</Text>
          </TouchableOpacity>
        </View>

        {!cleanMode && (
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
                  <Text style={{ fontSize: 10, color: IronLore.colors.muted, marginBottom: 3 }}>0 / 1,000 XP</Text>
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
        )}

        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 12, marginBottom: 4 }}>
          {!cleanMode && (
            <TouchableOpacity style={s.quickActionBtn} onPress={() => setScreen('achievements')}>
              <Text style={{ fontSize: 20 }}>🏆</Text>
              <Text style={s.quickActionText}>Achievements</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.quickActionBtn} onPress={() => setScreen('history')}>
            <Text style={{ fontSize: 20 }}>📋</Text>
            <Text style={s.quickActionText}>History</Text>
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

        {!cleanMode && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginVertical: 12, gap: 8 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(201,168,76,0.15)' }} />
          <Text style={{ fontSize: 10, color: 'rgba(201,168,76,0.4)', fontStyle: 'italic' }}>The Iron Road Begins</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(201,168,76,0.15)' }} />
        </View>
        )}

        <View style={s.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={s.sectionTitle}>{cleanMode ? 'TODAY\'S GOALS' : 'DAILY QUESTS'}</Text>
            <Text style={{ fontSize: 11, color: '#c9a84c' }}>View All →</Text>
          </View>
          {[
            {
              icon: '🏋️',
              name: 'Complete a Workout',
              sub: workoutDoneToday ? 'Workout complete!' : 'Start any training session',
              fill: workoutDoneToday ? 1.0 : 0.0,
              color: '#c94c4c',
              done: workoutDoneToday,
              xp: '+500 XP',
            },
            {
              icon: '🥩',
              name: 'Hit Protein Goal',
              sub: `${Math.round(proteinToday)}g / ${GOALS.protein}g consumed`,
              fill: Math.min(proteinToday / GOALS.protein, 1.0),
              color: '#4cc97a',
              done: proteinToday >= GOALS.protein,
              xp: '+350 XP',
            },
            {
              icon: '💊',
              name: 'Take Morning Stack',
              sub: morningSuppsTotal > 0 ? `${morningSuppsCount} / ${morningSuppsTotal} supplements taken` : 'Log your morning supplements',
              fill: morningSuppsTotal > 0 ? morningSuppsCount / morningSuppsTotal : 0,
              color: '#4c7bc9',
              done: morningSuppsTotal > 0 && morningSuppsCount >= morningSuppsTotal,
              xp: '+100 XP',
            },
            {
              icon: '🏃',
              name: '10,000 Steps',
              sub: '0 / 10,000 steps',
              fill: 0.0,
              color: '#c9a84c',
              done: false,
              xp: '+150 XP',
            },
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
                : !cleanMode ? <Text style={s.questXP}>{quest.xp}</Text> : null}
            </View>
          ))}

          {!cleanMode && (
            <TouchableOpacity
              style={[
                s.questCard,
                { marginTop: 6, opacity: spinAvailable ? 1 : 0.55 },
              ]}
              onPress={() => { setSpinResult(null); setSpinSpinning(false); spinRotation.setValue(0); setSpinOpen(true); }}
              activeOpacity={0.85}
              disabled={!workoutDoneToday}
            >
              <Text style={{ fontSize: 22 }}>🎡</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.questName}>Spin the Wheel</Text>
                <Text style={s.questSub}>
                  {!workoutDoneToday
                    ? 'Complete a workout to unlock today’s spin'
                    : spunToday
                      ? 'Already spun today — come back tomorrow'
                      : 'One spin per day — claim your bonus coins'}
                </Text>
                <View style={s.questBar}>
                  <View style={[s.questFill, { width: `${spunToday ? 100 : workoutDoneToday ? 60 : 0}%` as any, backgroundColor: IronLore.colors.gold }]} />
                </View>
              </View>
              {spunToday
                ? <View style={s.checkCircle}><Text style={{ fontSize: 12, color: '#052e16', fontWeight: '700' }}>✓</Text></View>
                : <Text style={s.questXP}>+ Coins</Text>}
            </TouchableOpacity>
          )}
        </View>

        <View style={s.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={s.sectionTitle}>TODAY&apos;S STACK</Text>
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
                  <Text style={{ fontSize: 11, fontWeight: '600', color: IronLore.colors.text, marginTop: 2 }}>{macro.val}/{macro.goal}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={s.logFoodBtn} onPress={() => setScreen('nutrition')}>
              <Text style={s.logFoodText}>+ Log Food or Meal</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );

  let content: React.ReactNode = homeContent;
  if (screen === 'train') content = <TrainScreen onBack={() => setScreen('home')} userId={userId} character={character} onWorkoutComplete={() => setWorkoutDoneToday(true)} />;
  else if (screen === 'nutrition') content = <NutritionScreenComponent onBack={() => setScreen('home')} onProteinUpdate={(protein) => setProteinToday(protein)} onTotalsUpdate={() => {}} goals={GOALS} meals={MEALS} quickFoods={QUICK_FOODS} s={s} />;
  else if (screen === 'coach') content = <CoachScreen onBack={() => setScreen('home')} userId={userId} character={character} />;
  else if (screen === 'profile') content = <ProfileScreen onBack={() => setScreen('home')} userId={userId} character={character} coins={coins} streak={streak} onSignOut={() => setScreen('home')} onSettings={() => setScreen('settings')} onAnalytics={() => setScreen('analytics')} onFriends={() => setScreen('friends')} />;
  else if (screen === 'achievements') content = <AchievementsScreen onBack={() => setScreen('home')} coins={coins} onEarn={earnCoins} />;
  else if (screen === 'shop') content = <ShopScreen onBack={() => setScreen('home')} coins={coins} onSpend={spendCoins} />;
  else if (screen === 'supplements') content = <SupplementScreen onBack={() => setScreen('home')} onSuppsUpdate={(taken, total) => { setMorningSuppsCount(taken); setMorningSuppsTotal(total); }} />;
  else if (screen === 'bodyweight') content = <BodyWeightScreen onBack={() => setScreen('home')} userId={userId} />;
  else if (screen === 'history') content = <WorkoutHistoryScreen onBack={() => setScreen('home')} userId={userId} />;
  else if (screen === 'analytics') content = <AnalyticsScreen onBack={() => setScreen('profile')} userId={userId} goals={GOALS} />;
  else if (screen === 'friends') content = <FriendsScreen onBack={() => setScreen('profile')} userId={userId} />;
  else if (screen === 'water') content = <WaterScreen onBack={() => setScreen('home')} waterOz={waterOz} waterGoalOz={waterGoalOz} onAdd={addWater} onSetGoal={setWaterGoal} />;
  else if (screen === 'settings') content = <SettingsScreen onBack={() => setScreen('profile')} userId={userId} character={character} cleanMode={cleanMode} onCleanModeToggle={toggleCleanMode} onUpdate={({ name, goalId }) => { setCharacter((prev: any) => ({ ...prev, name, goalId })); setScreen('profile'); }} />;

  const activeTab: 'home' | 'train' | 'coach' | 'nutrition' | 'profile' =
    screen === 'train' || screen === 'coach' || screen === 'nutrition' || screen === 'profile'
      ? screen
      : 'home';

  return (
    <View style={{ flex: 1, backgroundColor: IronLore.colors.bg }}>
      <View style={{ flex: 1 }}>
        {content}
      </View>

      {/* Hidden capture target (full-res) */}
      <View style={{ position: 'absolute', left: -9999, top: 0 }}>
        <ViewShot ref={shareCaptureRef} options={{ format: 'png', quality: 1 }}>
          <ShareableQuestCard {...sharePayload} />
        </ViewShot>
      </View>

      <Modal visible={shareOpen} transparent animationType="fade" onRequestClose={() => setShareOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
            <Text style={s.modalTitle}>Share Quest Card</Text>

            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 270, height: 337, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: IronLore.colors.border }}>
                <View style={{ width: 1080, height: 1350, transform: [{ scale: 0.25 }] }}>
                  <ShareableQuestCard {...sharePayload} />
                </View>
              </View>
              <Text style={{ ...IronLore.type.body, color: IronLore.colors.muted, textAlign: 'center', marginTop: 10 }}>
                Works best for Stories or iMessage.
              </Text>
            </View>

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShareOpen(false)} activeOpacity={0.85}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={shareQuestCard} activeOpacity={0.85}>
                <Text style={s.modalSaveText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={dailyRewardOpen} transparent animationType="fade" onRequestClose={() => setDailyRewardOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
            <Text style={s.modalTitle}>Daily Login Bonus</Text>
            <Text style={{ ...IronLore.type.body, color: IronLore.colors.muted, textAlign: 'center', marginBottom: 14 }}>
              Day {dailyRewardDay} streak reward
            </Text>

            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <View style={{ backgroundColor: 'rgba(201,168,76,0.12)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.20)', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18, minWidth: 220, alignItems: 'center' }}>
                <Text style={{ fontSize: 34, fontWeight: '900', color: IronLore.colors.gold }}>🪙 +{dailyRewardCoins}</Text>
              </View>
            </View>

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setDailyRewardOpen(false)} activeOpacity={0.85}>
                <Text style={s.modalCancelText}>Later</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={claimDailyReward} activeOpacity={0.85}>
                <Text style={s.modalSaveText}>Claim</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={spinOpen} transparent animationType="fade" onRequestClose={() => setSpinOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
            <Text style={s.modalTitle}>Spin Wheel</Text>
            <Text style={{ ...IronLore.type.body, color: IronLore.colors.muted, textAlign: 'center', marginBottom: 14 }}>
              {workoutDoneToday
                ? spunToday
                  ? 'You already spun today. Come back tomorrow.'
                  : 'One spin per day — bonus coins after a workout.'
                : 'Complete a workout to unlock your spin.'}
            </Text>

            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <Animated.View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: 'rgba(201,168,76,0.10)',
                  borderWidth: 1,
                  borderColor: 'rgba(201,168,76,0.20)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{
                    rotate: spinRotation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '1440deg'],
                    }),
                  }],
                }}
              >
                <Text style={{ fontSize: 46 }}>🎡</Text>
              </Animated.View>
              {spinResult && (
                <View style={{ marginTop: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: IronLore.colors.gold }}>🪙 +{spinResult.coins}</Text>
                  <Text style={{ ...IronLore.type.body, color: IronLore.colors.muted, marginTop: 6 }}>{spinResult.label} reward</Text>
                </View>
              )}
            </View>

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setSpinOpen(false)} activeOpacity={0.85}>
                <Text style={s.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSave, (!spinAvailable || !!spinResult) && { opacity: 0.6 }]}
                onPress={doSpinWheel}
                activeOpacity={0.85}
                disabled={!spinAvailable || !!spinResult || spinSpinning}
              >
                <Text style={s.modalSaveText}>{spinResult ? 'Spun' : spinSpinning ? 'Spinning…' : 'Spin'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomTabs activeKey={activeTab} onNavigate={(key) => setScreen(key)} />
    </View>
  );
}

function BottomTabs(props: {
  activeKey: 'home' | 'train' | 'coach' | 'nutrition' | 'profile';
  onNavigate: (key: 'home' | 'train' | 'coach' | 'nutrition' | 'profile') => void;
}) {
  const { activeKey, onNavigate } = props;
  const tabs: { icon: string; label: string; key: 'home' | 'train' | 'coach' | 'nutrition' | 'profile' }[] = [
    { icon: '🏠', label: 'Home', key: 'home' },
    { icon: '⚔️', label: 'Train', key: 'train' },
    { icon: '🤖', label: 'Coach', key: 'coach' },
    { icon: '🥩', label: 'Nutrition', key: 'nutrition' },
    { icon: '👤', label: 'Profile', key: 'profile' },
  ];

  return (
    <View style={s.bottomNav}>
      {tabs.map((tab) => {
        const active = activeKey === tab.key;
        return (
          <TouchableOpacity key={tab.label} style={s.navItem} onPress={() => onNavigate(tab.key)} activeOpacity={0.85}>
            <View style={{ width: 48, height: 32, borderRadius: 16, backgroundColor: active ? 'rgba(201,168,76,0.15)' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>{tab.icon}</Text>
            </View>
            <Text style={[s.navLabel, active && s.navLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ShareableQuestCard(props: {
  playerName: string;
  className: string;
  classIcon: string;
  dateLabel: string;
  stats: { label: string; value: string }[];
  quests: { name: string; detail: string; pct: number; reward: string }[];
}) {
  const { playerName, className, classIcon, dateLabel, stats, quests } = props;
  return (
    <View style={qc.root}>
      <View style={qc.card}>
        <View style={qc.header}>
          <View style={qc.logoWrap}>
            <Text style={{ fontSize: 22 }}>⚔️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={qc.title}>DAILY QUEST LOG</Text>
            <Text style={qc.sub}>{classIcon} {playerName} • {className}</Text>
          </View>
          <Text style={qc.date}>{dateLabel}</Text>
        </View>

        <View style={qc.statsRow}>
          {stats.slice(0, 4).map((st) => (
            <View key={st.label} style={qc.statBox}>
              <Text style={qc.statLabel}>{st.label.toUpperCase()}</Text>
              <Text style={qc.statValue}>{st.value}</Text>
            </View>
          ))}
        </View>

        <Text style={qc.section}>TODAY</Text>
        <View style={{ gap: 12 }}>
          {quests.slice(0, 5).map((q) => {
            const pct = Math.max(0, Math.min(1, q.pct));
            return (
              <View key={q.name} style={qc.questRow}>
                <View style={{ flex: 1 }}>
                  <Text style={qc.questName}>{q.name}</Text>
                  <Text style={qc.questDetail}>{q.detail}</Text>
                  <View style={qc.barBg}>
                    <View style={[qc.barFill, { width: `${pct * 100}%` }]} />
                  </View>
                </View>
                <Text style={qc.reward}>{q.reward}</Text>
              </View>
            );
          })}
        </View>

        <Text style={qc.footer}>IronLore • No ads • No tracking</Text>
      </View>
    </View>
  );
}

function PRShareCard(props: {
  dateLabel: string;
  playerName: string;
  className: string;
  classIcon: string;
  liftName: string;
  prevWeight: number;
  newWeight: number;
  topReps: number;
  durationLabel: string;
  volumeLabel: string;
}) {
  const { dateLabel, playerName, className, classIcon, liftName, prevWeight, newWeight, topReps, durationLabel, volumeLabel } = props;
  const delta = Math.max(0, newWeight - prevWeight);
  return (
    <View style={pc.root}>
      <View style={pc.card}>
        <View style={pc.header}>
          <View style={pc.logoWrap}>
            <Text style={{ fontSize: 22 }}>🔥</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={pc.title}>NEW PERSONAL RECORD</Text>
            <Text style={pc.sub}>{classIcon} {playerName} • {className}</Text>
          </View>
          <Text style={pc.date}>{dateLabel}</Text>
        </View>

        <View style={pc.hero}>
          <Text style={pc.lift}>{liftName}</Text>
          <View style={pc.weightRow}>
            <Text style={pc.weightNew}>{Math.round(newWeight)} lb</Text>
            <Text style={pc.weightMeta}>× {topReps || 1}</Text>
          </View>
          <Text style={pc.delta}>+{Math.round(delta)} lb over previous best</Text>
          <Text style={pc.prev}>Prev: {Math.round(prevWeight)} lb</Text>
        </View>

        <View style={pc.statsRow}>
          {[
            { label: 'Duration', val: durationLabel, icon: '⏱' },
            { label: 'Volume', val: volumeLabel, icon: '📦' },
          ].map(s => (
            <View key={s.label} style={pc.statBox}>
              <Text style={{ fontSize: 18 }}>{s.icon}</Text>
              <Text style={pc.statVal}>{s.val}</Text>
              <Text style={pc.statLabel}>{s.label.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        <Text style={pc.footer}>IronLore • Train. Track. Ascend.</Text>
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  root: { width: 1080, height: 1350, backgroundColor: IronLore.colors.bg, padding: 60 },
  card: { flex: 1, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 34, padding: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 26 },
  logoWrap: { width: 86, height: 86, borderRadius: 18, backgroundColor: IronLore.colors.panel2, borderWidth: 1, borderColor: IronLore.colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: IronLore.colors.gold, letterSpacing: 3 },
  sub: { fontSize: 20, fontWeight: '800', color: IronLore.colors.text, marginTop: 6 },
  date: { fontSize: 16, fontWeight: '800', color: IronLore.colors.muted, letterSpacing: 2 },

  hero: { backgroundColor: IronLore.colors.panel2, borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)', borderRadius: 22, padding: 26, marginBottom: 22 },
  lift: { fontSize: 34, fontWeight: '900', color: IronLore.colors.text, marginBottom: 14 },
  weightRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  weightNew: { fontSize: 58, fontWeight: '900', color: IronLore.colors.gold, letterSpacing: 1 },
  weightMeta: { fontSize: 26, fontWeight: '900', color: IronLore.colors.text, marginBottom: 10 },
  delta: { fontSize: 18, fontWeight: '800', color: IronLore.colors.green, marginTop: 10 },
  prev: { fontSize: 16, fontWeight: '700', color: IronLore.colors.muted, marginTop: 8 },

  statsRow: { flexDirection: 'row', gap: 14 },
  statBox: { flex: 1, backgroundColor: IronLore.colors.panel2, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 16, padding: 18 },
  statVal: { fontSize: 26, fontWeight: '900', color: IronLore.colors.text, marginTop: 10 },
  statLabel: { fontSize: 14, fontWeight: '800', color: IronLore.colors.muted, letterSpacing: 2, marginTop: 8 },

  footer: { position: 'absolute', left: 40, bottom: 26, fontSize: 14, fontWeight: '800', color: IronLore.colors.muted },
});

const qc = StyleSheet.create({
  root: {
    width: 1080,
    height: 1350,
    backgroundColor: IronLore.colors.bg,
    padding: 60,
  },
  card: {
    flex: 1,
    backgroundColor: IronLore.colors.panel,
    borderWidth: 1,
    borderColor: IronLore.colors.border,
    borderRadius: 34,
    padding: 40,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 26 },
  logoWrap: {
    width: 86, height: 86, borderRadius: 18,
    backgroundColor: IronLore.colors.panel2,
    borderWidth: 1, borderColor: IronLore.colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '900', color: IronLore.colors.gold, letterSpacing: 4 },
  sub: { fontSize: 20, fontWeight: '800', color: IronLore.colors.text, marginTop: 6 },
  date: { fontSize: 16, fontWeight: '800', color: IronLore.colors.muted, letterSpacing: 2 },

  statsRow: { flexDirection: 'row', gap: 14, marginBottom: 28 },
  statBox: { flex: 1, backgroundColor: IronLore.colors.panel2, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 16, padding: 18 },
  statLabel: { fontSize: 16, fontWeight: '800', color: IronLore.colors.muted, letterSpacing: 2 },
  statValue: { fontSize: 34, fontWeight: '900', color: IronLore.colors.text, marginTop: 12 },

  section: { fontSize: 16, fontWeight: '900', color: IronLore.colors.muted, letterSpacing: 3, marginBottom: 12 },
  questRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: IronLore.colors.panel2, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 18, padding: 18 },
  questName: { fontSize: 26, fontWeight: '900', color: IronLore.colors.text },
  questDetail: { fontSize: 18, fontWeight: '700', color: IronLore.colors.muted, marginTop: 6 },
  reward: { fontSize: 20, fontWeight: '900', color: IronLore.colors.gold },
  barBg: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 14 },
  barFill: { height: '100%', backgroundColor: IronLore.colors.gold, borderRadius: 5 },
  footer: { position: 'absolute', left: 40, bottom: 26, fontSize: 14, fontWeight: '800', color: IronLore.colors.muted },
});

// ============================================================
// STYLES
// ============================================================

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: IronLore.colors.bg },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 58, paddingBottom: 12 },
  logo: { fontSize: 24, fontWeight: '900', color: IronLore.colors.gold, letterSpacing: 5 },
  screenTitle: { fontSize: 18, fontWeight: '900', color: IronLore.colors.text, letterSpacing: 3 },
  backBtn: { fontSize: 14, color: IronLore.colors.gold, width: 60, fontWeight: '600' },

  // Header badges
  streakBadge: { backgroundColor: 'rgba(201,168,76,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { color: IronLore.colors.gold, fontSize: 13, fontWeight: '700' },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#8b2020', borderWidth: 2.5, borderColor: '#c9a84c', alignItems: 'center', justifyContent: 'center' },
  coinDisplay: { backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  coinDisplayText: { color: IronLore.colors.gold, fontSize: 13, fontWeight: '700' },

  // Wellness
  wellnessCard: { marginHorizontal: 16, marginTop: 4, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  wellnessTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  wellnessTitle: { ...IronLore.type.section, color: IronLore.colors.muted, textTransform: 'uppercase' },
  wellnessScore: { fontSize: 26, fontWeight: '900', color: IronLore.colors.gold, letterSpacing: 1 },
  wellnessBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' },
  wellnessBarFill: { height: '100%', backgroundColor: IronLore.colors.gold, borderRadius: 6 },
  wellnessBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  wellnessChip: { fontSize: 12, fontWeight: '700', color: IronLore.colors.muted, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  waterRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  waterLabel: { fontSize: 12, fontWeight: '900', color: IronLore.colors.text },
  waterValue: { fontSize: 12, fontWeight: '900', color: IronLore.colors.gold },
  waterBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' },
  waterBarFill: { height: '100%', backgroundColor: '#4c7bc9', borderRadius: 6 },

  // Character card
  characterCard: { marginHorizontal: 16, marginTop: 4, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  charAvatar: { width: 68, height: 68, borderRadius: 18, backgroundColor: '#c94c4c', borderWidth: 2.5, borderColor: '#c9a84c', alignItems: 'center', justifyContent: 'center' },
  charName: { fontSize: 18, fontWeight: '800', color: '#f0f0fa', marginBottom: 3 },
  charClass: { fontSize: 11, fontWeight: '700', color: '#c94c4c', letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' },
  levelBadge: { backgroundColor: '#c9a84c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  levelText: { fontSize: 11, fontWeight: '800', color: IronLore.colors.bg, letterSpacing: 0.5 },
  xpBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: '#c9a84c', borderRadius: 3 },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 10, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', color: '#c9a84c', marginBottom: 1 },
  statName: { fontSize: 9, color: '#666677', textTransform: 'uppercase', letterSpacing: 0.8 },

  // Quick action buttons
  quickActionBtn: { flex: 1, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  quickActionText: { fontSize: 11, fontWeight: '700', color: '#666677', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { ...IronLore.type.section, color: IronLore.colors.muted, textTransform: 'uppercase', marginBottom: 12 },

  // Quest cards
  questCard: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  questDone: { borderColor: 'rgba(76,201,122,0.2)', backgroundColor: 'rgba(76,201,122,0.03)' },
  questName: { fontSize: 14, fontWeight: '700', color: IronLore.colors.text, marginBottom: 3 },
  questSub: { fontSize: 12, color: '#555566', marginBottom: 6 },
  questBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  questFill: { height: '100%', borderRadius: 2 },
  questXP: { fontSize: 12, fontWeight: '800', color: '#c9a84c', minWidth: 60, textAlign: 'right' },
  checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#4cc97a', alignItems: 'center', justifyContent: 'center' },

  // Pills (supplement)
  pill: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  pillTaken: { borderColor: 'rgba(76,123,201,0.35)', backgroundColor: 'rgba(76,123,201,0.08)' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#555566' },
  pillTextTaken: { color: '#7ab0e8' },

  // Macro card
  macroCard: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 18, padding: 16, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  macroPct: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  macroName: { fontSize: 9, color: '#555566', textTransform: 'uppercase', letterSpacing: 0.8 },
  logFoodBtn: { backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 4 },
  logFoodText: { fontSize: 14, fontWeight: '700', color: '#c9a84c' },

  // Bottom nav — improved
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: IronLore.colors.panel,
    borderTopWidth: 1,
    borderTopColor: IronLore.colors.border,
    paddingBottom: 28,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
  navLabel: { fontSize: 10, fontWeight: '600', color: IronLore.colors.muted, letterSpacing: 0.3 },
  navLabelActive: { color: IronLore.colors.gold },

  // Tabs
  tabRow: { paddingHorizontal: 16, marginBottom: 14 },
  tab: { paddingHorizontal: 18, paddingVertical: 9, marginRight: 8, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 22 },
  tabActive: { borderColor: 'rgba(201,168,76,0.35)', backgroundColor: 'rgba(201,168,76,0.08)' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#555566' },
  tabTextActive: { color: '#c9a84c' },

  // Achievements
  achievementProgress2: { paddingHorizontal: 16, marginBottom: 10 },
  achievementCard: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: 0.5, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  achievementUnlocked: { opacity: 1, borderColor: 'rgba(201,168,76,0.15)' },
  achievementFeatured: { borderColor: 'rgba(201,168,76,0.2)', backgroundColor: '#15120a' },
  achievementIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#1a1a2a', alignItems: 'center', justifyContent: 'center' },
  achievementIconUnlocked: { backgroundColor: 'rgba(201,168,76,0.12)' },
  achievementIcon: { fontSize: 24 },
  achievementContent: { flex: 1 },
  achievementName: { fontSize: 14, fontWeight: '700', color: IronLore.colors.text, marginBottom: 3 },
  achievementNameLocked: { color: '#444455' },
  achievementDesc: { fontSize: 12, color: '#555566', lineHeight: 16 },
  achievementBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginBottom: 3, marginTop: 6 },
  achievementBarFill: { height: '100%', backgroundColor: '#c9a84c', borderRadius: 2 },
  achievementProgress: { fontSize: 10, color: '#555566' },
  achievementRight: { alignItems: 'center', gap: 8 },
  coinReward: { backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  coinRewardText: { fontSize: 11, fontWeight: '700', color: '#c9a84c' },
  unlockedBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#4cc97a', alignItems: 'center', justifyContent: 'center' },
  unlockedBadgeText: { fontSize: 12, color: '#052e16', fontWeight: '800' },

  // Shop
  shopCard: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  shopCardEquipped: { borderColor: 'rgba(201,168,76,0.25)', backgroundColor: '#15120a' },
  shopIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#1a1a2a', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  shopIcon: { fontSize: 28 },
  equippedDot: { position: 'absolute', top: 3, right: 3, width: 10, height: 10, borderRadius: 5, backgroundColor: '#c9a84c' },
  shopContent: { flex: 1 },
  shopItemName: { fontSize: 14, fontWeight: '700', color: IronLore.colors.text, marginBottom: 2 },
  shopItemDesc: { fontSize: 12, color: '#555566', lineHeight: 16 },
  shopPrice: { fontSize: 13, fontWeight: '700', color: '#c9a84c', marginTop: 6 },
  shopPriceCant: { color: '#ef4444' },
  shopActions: { alignItems: 'center' },
  buyBtn: { backgroundColor: '#c9a84c', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
  buyBtnDisabled: { backgroundColor: IronLore.colors.border },
  buyBtnText: { fontSize: 13, fontWeight: '800', color: IronLore.colors.bg },
  equipBtn: { backgroundColor: 'rgba(201,168,76,0.1)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  equipBtnText: { fontSize: 13, fontWeight: '700', color: '#c9a84c' },
  equippedBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(201,168,76,0.12)', alignItems: 'center', justifyContent: 'center' },
  equippedBtnText: { fontSize: 18, color: '#c9a84c' },
  equippedTag: { backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  equippedTagText: { fontSize: 9, fontWeight: '800', color: '#c9a84c', textTransform: 'uppercase', letterSpacing: 0.8 },

  // Nutrition
  summaryCard: { marginHorizontal: 16, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 22, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  mealTab: { paddingHorizontal: 18, paddingVertical: 10, marginRight: 8, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 14, alignItems: 'center' },
  mealTabActive: { borderColor: 'rgba(201,168,76,0.35)', backgroundColor: 'rgba(201,168,76,0.08)' },
  mealTabText: { fontSize: 13, fontWeight: '600', color: '#555566' },
  mealTabTextActive: { color: '#c9a84c' },
  addFoodBtn: { marginHorizontal: 16, marginBottom: 12, padding: 16, backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', borderRadius: 14, alignItems: 'center' },
  addFoodText: { fontSize: 14, fontWeight: '700', color: '#c9a84c' },
  loggedItem: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 14, paddingHorizontal: 14 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: IronLore.colors.text },
  quickAddLabel: { fontSize: 10, fontWeight: '700', color: '#444455', textTransform: 'uppercase', letterSpacing: 1.5, paddingHorizontal: 16, paddingVertical: 10 },
  foodResult: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: IronLore.colors.border },

  // Train
  quickStartBtn: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', borderRadius: 18, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  quickStartTitle: { fontSize: 17, fontWeight: '800', color: IronLore.colors.text, marginBottom: 3 },
  routineLabel: { fontSize: 11, fontWeight: '700', color: '#555566', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  routineCard: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 16, padding: 18, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  routineName: { fontSize: 15, fontWeight: '700', color: IronLore.colors.text, marginBottom: 4 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 58, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a28' },
  cancelBtn: { fontSize: 14, color: '#555566', fontWeight: '600' },
  sessionTimer: { fontSize: 26, fontWeight: '800', color: IronLore.colors.text },
  xpBadge: { backgroundColor: 'rgba(201,168,76,0.1)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  xpBadgeText: { fontSize: 13, fontWeight: '800', color: '#c9a84c' },
  restBar: { height: 40, backgroundColor: IronLore.colors.panel, borderBottomWidth: 1, borderBottomColor: IronLore.colors.border, justifyContent: 'center', overflow: 'hidden' },
  restFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(59,130,246,0.15)' },
  restLabel: { fontSize: 13, color: '#93c5fd', textAlign: 'center', fontWeight: '700' },
  exerciseCard: { backgroundColor: IronLore.colors.panel, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 18, padding: 18, margin: 16, marginBottom: 0, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  exerciseName: { fontSize: 17, fontWeight: '800', color: IronLore.colors.text, flex: 1 },
  setHeaderText: { fontSize: 9, fontWeight: '700', color: '#333344', textTransform: 'uppercase', letterSpacing: 1 },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  setRowDone: { opacity: 0.55 },
  setNum: { width: 30, fontSize: 13, fontWeight: '700', color: '#555566', textAlign: 'center' },
  setInput: { flex: 1, backgroundColor: IronLore.colors.panel2, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 10, padding: 10, fontSize: 16, fontWeight: '700', color: IronLore.colors.text, textAlign: 'center' },
  setInputDone: { borderColor: 'rgba(76,201,122,0.25)', backgroundColor: 'rgba(76,201,122,0.04)' },
  checkBtn: { width: 46, height: 42, borderRadius: 10, backgroundColor: IronLore.colors.panel2, borderWidth: 1, borderColor: IronLore.colors.border, alignItems: 'center', justifyContent: 'center' },
  checkBtnDone: { backgroundColor: 'rgba(76,201,122,0.12)', borderColor: 'rgba(76,201,122,0.35)' },
  checkBtnText: { fontSize: 18, color: '#4cc97a' },
  addExerciseBtn: { margin: 16, padding: 16, borderWidth: 1.5, borderColor: IronLore.colors.border, borderStyle: 'dashed', borderRadius: 14, alignItems: 'center' },
  addExerciseText: { fontSize: 14, fontWeight: '700', color: '#444455' },
  finishBtn: { marginHorizontal: 16, padding: 18, backgroundColor: '#c9a84c', borderRadius: 16, alignItems: 'center', marginTop: 10 },
  finishText: { fontSize: 16, fontWeight: '900', color: IronLore.colors.bg, letterSpacing: 1 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { backgroundColor: IronLore.colors.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44, borderTopWidth: 1, borderColor: IronLore.colors.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: IronLore.colors.text, marginBottom: 18, textAlign: 'center' },
  modalInput: { backgroundColor: IronLore.colors.panel2, borderWidth: 1, borderColor: IronLore.colors.border, borderRadius: 12, padding: 16, fontSize: 15, color: IronLore.colors.text, marginBottom: 14 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 16, backgroundColor: IronLore.colors.panel2, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: IronLore.colors.border },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: IronLore.colors.muted },
  modalSave: { flex: 1, padding: 16, backgroundColor: IronLore.colors.gold, borderRadius: 12, alignItems: 'center' },
  modalSaveText: { fontSize: 15, fontWeight: '800', color: IronLore.colors.bg },
});