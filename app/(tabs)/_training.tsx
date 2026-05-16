import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';

import { supabase } from '@/src/data/supabaseClient';
import {
  listTemplates,
  searchExerciseCatalog,
  upsertTemplate,
  deleteTemplate,
  type TemplateSet,
  type WorkoutTemplate,
} from '@/src/data/trainingTemplates';
import { usePremium } from '@/src/purchases/PremiumContext';
import { TrainingPaywall } from '@/src/purchases/TrainingPaywall';

type EditorExercise = {
  key: string;
  name: string;
  sets: TemplateSet[];
};

type SessionExercise = {
  name: string;
  lastWeight: string;
  lastReps: string;
  sets: { weight: string; reps: string; done: boolean }[];
  meta?: Record<string, any>;
};

function newSet(): TemplateSet {
  return { reps: 8 };
}

function emptyExercise(name = ''): EditorExercise {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    sets: [newSet(), newSet(), newSet()],
  };
}

function paramOne(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default function TrainingTab() {
  const params = useLocalSearchParams<{ create?: string | string[]; name?: string | string[] }>();
  const premium = usePremium();
  const [paywallBusy, setPaywallBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [mode, setMode] = useState<'list' | 'edit' | 'session' | 'summary'>('list');

  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [templateName, setTemplateName] = useState('');
  const [templateNotes, setTemplateNotes] = useState('');
  const [editorExercises, setEditorExercises] = useState<EditorExercise[]>([emptyExercise()]);

  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState<{ id: string; name: string }[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogForKey, setCatalogForKey] = useState<string | null>(null);
  const catalogDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Session (start from template)
  const [activeTemplate, setActiveTemplate] = useState<WorkoutTemplate | null>(null);
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionTimerActive, setSessionTimerActive] = useState(false);
  const [summary, setSummary] = useState<{ duration: number; totalSets: number; totalVolume: number; totalXp: number } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
      setLoadingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const list = await listTemplates(userId);
      setTemplates(list);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!loadingAuth && userId) refresh();
    if (!loadingAuth && !userId) {
      setTemplates([]);
      setLoading(false);
    }
  }, [loadingAuth, userId, refresh]);

  // Open editor when linked from TRAIN tab: /training?create=1&name=Legs
  useEffect(() => {
    const create = paramOne(params.create);
    if (create !== '1' || !userId || loadingAuth) return;
    if (premium.purchasesConfigured && !premium.isPremium) return;
    resetEditor();
    const nameParam = paramOne(params.name);
    if (nameParam?.trim()) setTemplateName(decodeURIComponent(nameParam.trim()));
    setMode('edit');
    router.setParams({ create: undefined, name: undefined });
  }, [params.create, params.name, userId, loadingAuth, premium.purchasesConfigured, premium.isPremium]);

  function resetEditor() {
    setEditingId(undefined);
    setTemplateName('');
    setTemplateNotes('');
    setEditorExercises([emptyExercise()]);
    setCatalogQuery('');
    setCatalogResults([]);
    setCatalogForKey(null);
  }

  function stopSession() {
    setActiveTemplate(null);
    setSessionExercises([]);
    setSessionSeconds(0);
    setSessionTimerActive(false);
    setSummary(null);
    setMode('list');
  }

  function beginCreate(initialName?: string) {
    resetEditor();
    if (initialName?.trim()) setTemplateName(initialName.trim());
    setMode('edit');
  }

  function beginEdit(t: WorkoutTemplate) {
    setEditingId(t.id);
    setTemplateName(t.name);
    setTemplateNotes(t.notes ?? '');
    setEditorExercises(
      (t.items ?? []).map((it) => ({
        key: it.id,
        name: it.exercise?.name ?? '',
        sets: Array.isArray(it.sets) ? it.sets : [],
      })).length
        ? (t.items ?? []).map((it) => ({
            key: it.id,
            name: it.exercise?.name ?? '',
            sets: Array.isArray(it.sets) && it.sets.length ? it.sets : [newSet(), newSet(), newSet()],
          }))
        : [emptyExercise()],
    );
    setMode('edit');
  }

  async function confirmDelete(t: WorkoutTemplate) {
    Alert.alert('Delete template?', `Delete "${t.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTemplate(t.id);
            await refresh();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to delete');
          }
        },
      },
    ]);
  }

  async function saveTemplate() {
    if (!userId) return;
    const name = templateName.trim();
    if (!name) {
      Alert.alert('Missing name', 'Name your workout (e.g. Legs, Monday).');
      return;
    }
    const items = editorExercises
      .map((ex, idx) => ({
        position: idx,
        exerciseName: ex.name.trim(),
        sets: (ex.sets ?? []).filter((s) => (s?.reps ?? 0) > 0),
      }))
      .filter((it) => it.exerciseName);
    if (!items.length) {
      Alert.alert('Add exercises', 'Add at least one exercise to save.');
      return;
    }

    setLoading(true);
    try {
      await upsertTemplate({
        id: editingId,
        userId,
        name,
        notes: templateNotes,
        items,
      });
      setMode('list');
      resetEditor();
      await refresh();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save workout');
    } finally {
      setLoading(false);
    }
  }

  function updateExerciseName(key: string, next: string) {
    setEditorExercises((prev) => prev.map((ex) => (ex.key === key ? { ...ex, name: next } : ex)));
  }

  function addExerciseRow() {
    setEditorExercises((prev) => [...prev, emptyExercise()]);
  }

  function removeExerciseRow(key: string) {
    setEditorExercises((prev) => (prev.length <= 1 ? prev : prev.filter((ex) => ex.key !== key)));
  }

  function addSetToExercise(key: string) {
    setEditorExercises((prev) =>
      prev.map((ex) => (ex.key === key ? { ...ex, sets: [...ex.sets, newSet()] } : ex)),
    );
  }

  function updateSetField(key: string, setIdx: number, field: 'reps' | 'weight' | 'rpe', raw: string) {
    const num = raw.trim() ? Number(raw) : undefined;
    setEditorExercises((prev) =>
      prev.map((ex) => {
        if (ex.key !== key) return ex;
        const nextSets = [...ex.sets];
        const curr = { ...(nextSets[setIdx] ?? newSet()) } as any;
        curr[field] = typeof num === 'number' && !Number.isNaN(num) ? num : undefined;
        if (field === 'reps' && (curr.reps == null || curr.reps <= 0)) curr.reps = 0;
        nextSets[setIdx] = curr;
        return { ...ex, sets: nextSets };
      }),
    );
  }

  function removeSet(key: string, setIdx: number) {
    setEditorExercises((prev) =>
      prev.map((ex) => {
        if (ex.key !== key) return ex;
        if (ex.sets.length <= 1) return ex;
        const nextSets = ex.sets.filter((_, i) => i !== setIdx);
        return { ...ex, sets: nextSets };
      }),
    );
  }

  function startFromTemplate(t: WorkoutTemplate) {
    const exs: SessionExercise[] = (t.items ?? []).map((it) => {
      const sets = (Array.isArray(it.sets) ? it.sets : []).length ? (it.sets as any[]) : [{ reps: 8 }, { reps: 8 }, { reps: 8 }];
      return {
        name: it.exercise?.name ?? 'Exercise',
        lastWeight: '0',
        lastReps: '0',
        meta: { templateId: t.id, templateTitle: t.name },
        sets: sets.map((s) => ({
          weight: s?.weight == null ? '' : String(s.weight),
          reps: s?.reps == null ? '' : String(s.reps),
          done: false,
        })),
      };
    });
    setActiveTemplate(t);
    setSessionExercises(exs.length ? exs : []);
    setSessionSeconds(0);
    setSessionTimerActive(true);
    setSummary(null);
    setMode('session');
  }

  useEffect(() => {
    if (!sessionTimerActive) return;
    const id = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [sessionTimerActive]);

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function toggleDone(exIdx: number, setIdx: number) {
    setSessionExercises((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], done: !sets[setIdx].done };
      ex.sets = sets;
      next[exIdx] = ex;
      return next;
    });
  }

  function updateSessionSet(exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) {
    setSessionExercises((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      ex.sets = sets;
      next[exIdx] = ex;
      return next;
    });
  }

  async function finishSession() {
    if (!userId) return;
    const totalSets = sessionExercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.done).length, 0);
    const totalVolume = sessionExercises.reduce((acc, ex) => {
      return (
        acc +
        ex.sets
          .filter((s) => s.done)
          .reduce((a, s) => a + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0), 0)
      );
    }, 0);
    const totalXp = Math.max(100, totalSets * 50);
    setSessionTimerActive(false);
    setSummary({ duration: sessionSeconds, totalSets, totalVolume, totalXp });

    // Write workout row in the same shape Home History expects.
    try {
      await supabase.from('workouts').insert({
        user_id: userId,
        duration: sessionSeconds,
        total_xp: totalXp,
        total_volume: totalVolume,
        total_sets: totalSets,
        exercises: sessionExercises.map((ex) => ({
          name: ex.name,
          lastWeight: ex.lastWeight,
          lastReps: ex.lastReps,
          sets: ex.sets,
          meta: ex.meta,
        })),
      });
    } catch (e: any) {
      Alert.alert('Saved locally, but failed to sync', e?.message ?? 'Workout save failed');
    }

    setMode('summary');
  }

  useEffect(() => {
    if (!userId || !catalogForKey) return;
    const q = catalogQuery.trim();
    if (catalogDebounce.current) clearTimeout(catalogDebounce.current);
    if (!q) {
      setCatalogResults([]);
      setCatalogLoading(false);
      return;
    }
    setCatalogLoading(true);
    catalogDebounce.current = setTimeout(async () => {
      try {
        const results = await searchExerciseCatalog(userId, q);
        setCatalogResults(results.map((r) => ({ id: r.id, name: r.name })));
      } catch {
        setCatalogResults([]);
      } finally {
        setCatalogLoading(false);
      }
    }, 250);
    return () => {
      if (catalogDebounce.current) clearTimeout(catalogDebounce.current);
    };
  }, [catalogQuery, catalogForKey, userId]);

  const emptyState = useMemo(() => {
    if (loadingAuth) return 'Checking sign-in…';
    if (!userId) return 'Sign in to save workout templates.';
    return 'No templates yet. Create your first one.';
  }, [loadingAuth, userId]);

  if (premium.purchasesConfigured && premium.loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" />
        <ActivityIndicator color="#c9a84c" size="large" />
      </View>
    );
  }

  if (premium.purchasesConfigured && !premium.isPremium) {
    return (
      <TrainingPaywall
        busy={paywallBusy}
        onSubscribe={async () => {
          setPaywallBusy(true);
          try {
            await premium.purchaseDefault();
          } finally {
            setPaywallBusy(false);
          }
        }}
        onRestore={async () => {
          setPaywallBusy(true);
          try {
            await premium.restore();
          } finally {
            setPaywallBusy(false);
          }
        }}
      />
    );
  }

  if (mode === 'session') {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity onPress={stopSession}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{activeTemplate?.name ?? 'Session'}</Text>
            <Text style={{ color: '#9a9ab0', fontSize: 12, marginTop: 2 }}>{formatTime(sessionSeconds)} elapsed</Text>
          </View>
          <TouchableOpacity onPress={finishSession} style={styles.pillBtn}>
            <Text style={styles.pillText}>Finish</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {sessionExercises.map((ex, exIdx) => (
            <View key={`${ex.name}-${exIdx}`} style={styles.card}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#e9e9ff', marginBottom: 10 }}>{ex.name}</Text>
              {ex.sets.map((s, setIdx) => (
                <View key={`${exIdx}-${setIdx}`} style={styles.setRow}>
                  <TouchableOpacity onPress={() => toggleDone(exIdx, setIdx)}>
                    <Text style={[styles.setChip, s.done && { color: '#c9a84c' }]}>{s.done ? '✓' : String(setIdx + 1)}</Text>
                  </TouchableOpacity>
                  <TextInput
                    value={s.weight}
                    onChangeText={(t) => updateSessionSet(exIdx, setIdx, 'weight', t)}
                    keyboardType="decimal-pad"
                    placeholder="lb"
                    placeholderTextColor="#6b6b7a"
                    style={[styles.smallInput, { flex: 1, opacity: s.done ? 0.6 : 1 }]}
                  />
                  <TextInput
                    value={s.reps}
                    onChangeText={(t) => updateSessionSet(exIdx, setIdx, 'reps', t)}
                    keyboardType="number-pad"
                    placeholder="reps"
                    placeholderTextColor="#6b6b7a"
                    style={[styles.smallInput, { flex: 1, opacity: s.done ? 0.6 : 1 }]}
                  />
                </View>
              ))}
            </View>
          ))}

          <View style={{ height: 28 }} />
        </ScrollView>
      </View>
    );
  }

  if (mode === 'summary') {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity onPress={stopSession}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Workout saved</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          <View style={styles.card}>
            <Text style={{ fontSize: 14, fontWeight: '900', color: '#e9e9ff', marginBottom: 10 }}>Summary</Text>
            <Text style={{ color: '#cfcfe6' }}>Duration: {formatTime(summary?.duration ?? 0)}</Text>
            <Text style={{ color: '#cfcfe6' }}>Sets: {summary?.totalSets ?? 0}</Text>
            <Text style={{ color: '#cfcfe6' }}>Volume: {((summary?.totalVolume ?? 0) / 1000).toFixed(1)}k</Text>
            <Text style={{ color: '#c9a84c', fontWeight: '900', marginTop: 6 }}>+{summary?.totalXp ?? 0} XP</Text>
          </View>

          <TouchableOpacity onPress={stopSession} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Back to templates</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === 'edit') {
    return (
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setMode('list'); resetEditor(); }}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{editingId ? 'Edit workout' : 'Create workout'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>Workout name</Text>
            <TextInput
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="e.g. Legs, Monday, Push day"
              placeholderTextColor="#6b6b7a"
              style={styles.input}
            />
            <Text style={[styles.label, { marginTop: 10 }]}>Notes (optional)</Text>
            <TextInput
              value={templateNotes}
              onChangeText={setTemplateNotes}
              placeholder="Anything you want to remember…"
              placeholderTextColor="#6b6b7a"
              style={[styles.input, { height: 90 }]}
              multiline
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <TouchableOpacity onPress={addExerciseRow} style={styles.pillBtn}>
              <Text style={styles.pillText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {editorExercises.map((ex, idx) => (
            <View key={ex.key} style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={styles.exerciseTitle}>Exercise {idx + 1}</Text>
                <TouchableOpacity onPress={() => removeExerciseRow(ex.key)}>
                  <Text style={styles.danger}>Remove</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={ex.name}
                onChangeText={(t) => updateExerciseName(ex.key, t)}
                onFocus={() => { setCatalogForKey(ex.key); setCatalogQuery(ex.name); }}
                placeholder="Type or search…"
                placeholderTextColor="#6b6b7a"
                style={styles.input}
              />

              {catalogForKey === ex.key && (catalogLoading || catalogResults.length > 0) && (
                <View style={styles.dropdown}>
                  {catalogLoading ? (
                    <View style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator />
                      <Text style={{ color: '#cfcfe6' }}>Searching…</Text>
                    </View>
                  ) : (
                    catalogResults.map((r) => (
                      <Pressable
                        key={r.id}
                        onPress={() => {
                          updateExerciseName(ex.key, r.name);
                          setCatalogForKey(null);
                          setCatalogQuery('');
                          setCatalogResults([]);
                        }}
                        style={styles.dropdownItem}
                      >
                        <Text style={{ color: '#e9e9ff', fontWeight: '700' }}>{r.name}</Text>
                        <Text style={{ color: '#7a7a90', fontSize: 12 }}>from catalog</Text>
                      </Pressable>
                    ))
                  )}
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 }}>
                <Text style={styles.label}>Sets</Text>
                <TouchableOpacity onPress={() => addSetToExercise(ex.key)}>
                  <Text style={styles.link}>+ Add set</Text>
                </TouchableOpacity>
              </View>

              {ex.sets.map((s, setIdx) => (
                <View key={`${ex.key}-set-${setIdx}`} style={styles.setRow}>
                  <Text style={styles.setChip}>#{setIdx + 1}</Text>
                  <TextInput
                    value={s.reps?.toString?.() ?? ''}
                    onChangeText={(t) => updateSetField(ex.key, setIdx, 'reps', t)}
                    keyboardType="number-pad"
                    placeholder="reps"
                    placeholderTextColor="#6b6b7a"
                    style={[styles.smallInput, { flex: 1 }]}
                  />
                  <TextInput
                    value={s.weight == null ? '' : String(s.weight)}
                    onChangeText={(t) => updateSetField(ex.key, setIdx, 'weight', t)}
                    keyboardType="decimal-pad"
                    placeholder="lb"
                    placeholderTextColor="#6b6b7a"
                    style={[styles.smallInput, { flex: 1 }]}
                  />
                  <TextInput
                    value={s.rpe == null ? '' : String(s.rpe)}
                    onChangeText={(t) => updateSetField(ex.key, setIdx, 'rpe', t)}
                    keyboardType="decimal-pad"
                    placeholder="RPE"
                    placeholderTextColor="#6b6b7a"
                    style={[styles.smallInput, { flex: 1 }]}
                  />
                  <TouchableOpacity onPress={() => removeSet(ex.key, setIdx)}>
                    <Text style={styles.danger}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}

          <TouchableOpacity onPress={saveTemplate} style={styles.primaryBtn} disabled={loading}>
            {loading ? <ActivityIndicator color="#0b0b10" /> : <Text style={styles.primaryBtnText}>Save workout template</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const createWorkoutFooter = (
    <View style={{ paddingTop: 12, paddingBottom: 8, gap: 8 }}>
      <TouchableOpacity onPress={() => beginCreate()} style={styles.createWorkoutBtn} disabled={!userId} activeOpacity={0.85}>
        <Text style={styles.createWorkoutBtnText}>Create workout</Text>
        <Text style={styles.createWorkoutSub}>Add exercises, name it (Legs, Monday…), save as a template</Text>
      </TouchableOpacity>
    </View>
  );

  const routinesListHeader = (
    <View style={{ paddingTop: 4, paddingBottom: 10 }}>
      <Text style={styles.label}>Your routines</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Training</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#c9a84c" size="large" />
          </View>
          <View style={{ paddingHorizontal: 16 }}>{createWorkoutFooter}</View>
        </View>
      ) : templates.length === 0 ? (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <Text style={{ fontSize: 42, marginBottom: 14 }}>🏋️</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#e9e9ff', marginBottom: 8 }}>{emptyState}</Text>
            <Text style={{ fontSize: 13, color: '#9a9ab0', textAlign: 'center' }}>
              Tap Create workout to build your plan and reuse it anytime.
            </Text>
          </View>
          <View style={{ paddingHorizontal: 16 }}>{createWorkoutFooter}</View>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(t) => t.id}
          ListHeaderComponent={routinesListHeader}
          ListFooterComponent={createWorkoutFooter}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#e9e9ff' }}>{item.name}</Text>
                  <Text style={{ fontSize: 12, color: '#9a9ab0', marginTop: 2 }}>
                    {(item.items?.length ?? 0)} exercises{item.notes ? ' · notes' : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => startFromTemplate(item)} style={[styles.smallBtn, { borderColor: '#2b3a2b' }]}>
                    <Text style={[styles.smallBtnText, { color: '#b8f7c2' }]}>Start</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => beginEdit(item)} style={styles.smallBtn}>
                    <Text style={styles.smallBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(item)} style={[styles.smallBtn, { borderColor: '#46202a' }]}>
                    <Text style={[styles.smallBtnText, { color: '#ff97a5' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ marginTop: 10, gap: 6 }}>
                {(item.items ?? []).slice(0, 4).map((it) => (
                  <Text key={it.id} style={{ color: '#cfcfe6', fontSize: 13 }}>
                    • {it.exercise?.name ?? 'Exercise'}
                  </Text>
                ))}
                {(item.items?.length ?? 0) > 4 && (
                  <Text style={{ color: '#7a7a90', fontSize: 12 }}>+ {(item.items.length - 4)} more…</Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0b10' },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '900', color: '#e9e9ff' },
  back: { fontSize: 22, color: '#e9e9ff', width: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#e9e9ff' },
  card: { backgroundColor: '#11111a', borderWidth: 1, borderColor: '#1a1a2a', borderRadius: 14, padding: 14 },
  label: { fontSize: 12, fontWeight: '800', color: '#9a9ab0', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.7 },
  input: { backgroundColor: '#0f0f16', borderWidth: 1, borderColor: '#1f1f33', borderRadius: 12, padding: 12, color: '#e9e9ff' },
  pillBtn: { backgroundColor: '#c9a84c', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  pillText: { color: '#0b0b10', fontWeight: '900' },
  createWorkoutBtn: {
    backgroundColor: '#c9a84c',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  createWorkoutBtnText: { color: '#0b0b10', fontWeight: '900', fontSize: 17 },
  createWorkoutSub: { color: '#3d3518', fontSize: 12, textAlign: 'center', marginTop: 6, fontWeight: '600' },
  primaryBtn: { backgroundColor: '#c9a84c', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 28 },
  primaryBtnText: { color: '#0b0b10', fontWeight: '900', fontSize: 16 },
  smallBtn: { borderWidth: 1, borderColor: '#2a2a42', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnText: { color: '#e9e9ff', fontWeight: '800', fontSize: 12 },
  danger: { color: '#ff97a5', fontWeight: '900' },
  link: { color: '#c9a84c', fontWeight: '900' },
  exerciseTitle: { color: '#e9e9ff', fontWeight: '900' },
  setRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  setChip: { width: 30, textAlign: 'center', color: '#9a9ab0', fontWeight: '900' },
  smallInput: { backgroundColor: '#0f0f16', borderWidth: 1, borderColor: '#1f1f33', borderRadius: 10, padding: 10, color: '#e9e9ff' },
  dropdown: { marginTop: 8, borderWidth: 1, borderColor: '#1f1f33', borderRadius: 12, overflow: 'hidden' },
  dropdownItem: { padding: 10, backgroundColor: '#0f0f16', borderBottomWidth: 1, borderBottomColor: '#16162a' },
});

