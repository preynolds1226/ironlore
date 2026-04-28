import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Modal, Animated, Vibration
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Sample routines
const ROUTINES = {
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

const REST_SECONDS = 60;

function epley1RM(weight: number, reps: number) {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export default function TrainScreen() {
  const [screen, setScreen] = useState<'start' | 'routine' | 'session'>('start');
  const [exercises, setExercises] = useState<any[]>([]);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [xpPops, setXpPops] = useState<{ id: number; x: number; y: number }[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [addExerciseModal, setAddExerciseModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const sessionRef = useRef<any>(null);
  const restRef = useRef<any>(null);

  // Session timer
  useEffect(() => {
    if (screen === 'session') {
      sessionRef.current = setInterval(() => setSessionTimer(t => t + 1), 1000);
    }
    return () => clearInterval(sessionRef.current);
  }, [screen]);

  // Rest timer
  useEffect(() => {
    if (restActive && restTimer > 0) {
      restRef.current = setTimeout(() => setRestTimer(t => t - 1), 1000);
    } else if (restTimer === 0 && restActive) {
      setRestActive(false);
      Vibration.vibrate([0, 200, 100, 200]);
    }
    return () => clearTimeout(restRef.current);
  }, [restActive, restTimer]);

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function startRoutine(name: string) {
    const routine = ROUTINES[name as keyof typeof ROUTINES];
    setExercises(routine.map(ex => ({
      ...ex,
      sets: Array(3).fill(null).map(() => ({ weight: ex.lastWeight, reps: ex.lastReps, done: false })),
    })));
    setScreen('session');
  }

  function startQuick() {
    setExercises([]);
    setScreen('session');
  }

  function checkSet(exIdx: number, setIdx: number) {
    const updated = [...exercises];
    updated[exIdx].sets[setIdx].done = true;
    setExercises(updated);
    setRestTimer(REST_SECONDS);
    setRestActive(true);
    const xp = 50;
    setTotalXP(t => t + xp);
    const id = Date.now();
    setXpPops(p => [...p, { id, x: 200, y: 300 }]);
    setTimeout(() => setXpPops(p => p.filter(x => x.id !== id)), 1500);
  }

  function updateSet(exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) {
    const updated = [...exercises];
    updated[exIdx].sets[setIdx][field] = value;
    setExercises(updated);
  }

  function addExercise() {
    if (!newExerciseName.trim()) return;
    setExercises(prev => [...prev, {
      name: newExerciseName.trim(),
      lastWeight: '0',
      lastReps: '0',
      sets: Array(3).fill(null).map(() => ({ weight: '', reps: '', done: false })),
    }]);
    setNewExerciseName('');
    setAddExerciseModal(false);
  }

  // Start Screen
  if (screen === 'start') {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.startHeader}>
          <Text style={styles.startTitle}>TRAIN</Text>
          <Text style={styles.startSub}>What's today's battle?</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }}>
          {/* Quick Start */}
          <TouchableOpacity style={styles.quickStartBtn} onPress={startQuick}>
            <Text style={styles.quickStartIcon}>⚡</Text>
            <View>
              <Text style={styles.quickStartTitle}>Quick Start</Text>
              <Text style={styles.quickStartSub}>Blank session — add exercises as you go</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.routineLabel}>YOUR ROUTINES</Text>

          {Object.keys(ROUTINES).map(name => (
            <TouchableOpacity key={name} style={styles.routineCard} onPress={() => startRoutine(name)}>
              <View>
                <Text style={styles.routineName}>{name}</Text>
                <Text style={styles.routineMeta}>{ROUTINES[name as keyof typeof ROUTINES].length} exercises · 3 sets each</Text>
              </View>
              <Text style={styles.routineArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Session Screen
  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Session Header */}
      <View style={styles.sessionHeader}>
        <TouchableOpacity onPress={() => setScreen('start')}>
          <Text style={styles.cancelBtn}>✕ Cancel</Text>
        </TouchableOpacity>
        <View style={styles.sessionTimerWrap}>
          <Text style={styles.sessionTimer}>{formatTime(sessionTimer)}</Text>
        </View>
        <View style={styles.xpBadge}>
          <Text style={styles.xpBadgeText}>+{totalXP} XP</Text>
        </View>
      </View>

      {/* Rest Timer Bar */}
      {restActive && (
        <View style={styles.restBar}>
          <View style={[styles.restFill, { width: `${(restTimer / REST_SECONDS) * 100}%` }]} />
          <Text style={styles.restLabel}>Rest — {restTimer}s remaining</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {exercises.map((ex, exIdx) => {
          const completedSets = ex.sets.filter((s: any) => s.done).length;
          const bestSet = ex.sets.reduce((best: any, s: any) => {
            if (!s.done) return best;
            const w = parseFloat(s.weight) || 0;
            const r = parseInt(s.reps) || 0;
            return epley1RM(w, r) > epley1RM(parseFloat(best?.weight || '0'), parseInt(best?.reps || '0')) ? s : best;
          }, null);
          const est1RM = bestSet ? epley1RM(parseFloat(bestSet.weight) || 0, parseInt(bestSet.reps) || 0) : null;

          return (
            <View key={exIdx} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <View style={styles.exerciseRight}>
                  {est1RM && <Text style={styles.est1rm}>~{est1RM}lb 1RM</Text>}
                  <Text style={styles.setsProgress}>{completedSets}/{ex.sets.length}</Text>
                </View>
              </View>
              <Text style={styles.lastSession}>Last: {ex.lastWeight}lb × {ex.lastReps}</Text>

              {/* Set rows */}
              <View style={styles.setHeader}>
                <Text style={[styles.setHeaderText, { width: 30 }]}>SET</Text>
                <Text style={[styles.setHeaderText, { flex: 1 }]}>WEIGHT (lb)</Text>
                <Text style={[styles.setHeaderText, { flex: 1 }]}>REPS</Text>
                <Text style={[styles.setHeaderText, { width: 44 }]}>DONE</Text>
              </View>

              {ex.sets.map((set: any, setIdx: number) => (
                <View key={setIdx} style={[styles.setRow, set.done && styles.setRowDone]}>
                  <Text style={[styles.setNum, set.done && styles.setNumDone]}>{setIdx + 1}</Text>
                  <TextInput
                    style={[styles.setInput, set.done && styles.setInputDone]}
                    value={set.weight}
                    onChangeText={v => updateSet(exIdx, setIdx, 'weight', v)}
                    keyboardType="numeric"
                    placeholder={ex.lastWeight}
                    placeholderTextColor="#444"
                    editable={!set.done}
                  />
                  <TextInput
                    style={[styles.setInput, set.done && styles.setInputDone]}
                    value={set.reps}
                    onChangeText={v => updateSet(exIdx, setIdx, 'reps', v)}
                    keyboardType="numeric"
                    placeholder={ex.lastReps}
                    placeholderTextColor="#444"
                    editable={!set.done}
                  />
                  <TouchableOpacity
                    style={[styles.checkBtn, set.done && styles.checkBtnDone]}
                    onPress={() => !set.done && checkSet(exIdx, setIdx)}
                  >
                    <Text style={styles.checkBtnText}>{set.done ? '✓' : '○'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}

        {/* Add Exercise */}
        <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setAddExerciseModal(true)}>
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
        </TouchableOpacity>

        {exercises.length > 0 && (
          <TouchableOpacity style={styles.finishBtn} onPress={() => setScreen('start')}>
            <Text style={styles.finishText}>⚔ Finish Workout</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* XP Pop animations */}
      {xpPops.map(pop => (
        <View key={pop.id} style={[styles.xpPop, { left: pop.x, top: pop.y }]}>
          <Text style={styles.xpPopText}>+50 XP</Text>
        </View>
      ))}

      {/* Add Exercise Modal */}
      <Modal visible={addExerciseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <TextInput
              style={styles.modalInput}
              value={newExerciseName}
              onChangeText={setNewExerciseName}
              placeholder="Exercise name..."
              placeholderTextColor="#444"
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAddExerciseModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={addExercise}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0f' },
  scroll: { flex: 1 },

  // Start screen
  startHeader: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  startTitle: { fontSize: 28, fontWeight: '900', color: '#c9a84c', letterSpacing: 4 },
  startSub: { fontSize: 13, color: '#888899', marginTop: 4 },

  quickStartBtn: {
    backgroundColor: '#1a1a26', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
    borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24,
  },
  quickStartIcon: { fontSize: 28 },
  quickStartTitle: { fontSize: 16, fontWeight: '700', color: '#e8e8f0', marginBottom: 2 },
  quickStartSub: { fontSize: 12, color: '#888899' },

  routineLabel: { fontSize: 11, fontWeight: '600', color: '#888899', letterSpacing: 1, marginBottom: 10 },
  routineCard: {
    backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a',
    borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  routineName: { fontSize: 15, fontWeight: '600', color: '#e8e8f0', marginBottom: 3 },
  routineMeta: { fontSize: 12, color: '#888899' },
  routineArrow: { fontSize: 22, color: '#888899' },

  // Session header
  sessionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#2a2a3a',
  },
  cancelBtn: { fontSize: 13, color: '#888899' },
  sessionTimerWrap: { alignItems: 'center' },
  sessionTimer: { fontSize: 22, fontWeight: '700', color: '#e8e8f0', fontVariant: ['tabular-nums'] },
  xpBadge: { backgroundColor: 'rgba(201,168,76,0.12)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  xpBadgeText: { fontSize: 12, fontWeight: '700', color: '#c9a84c' },

  // Rest bar
  restBar: {
    height: 36, backgroundColor: '#1a1a1a', borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a', justifyContent: 'center', overflow: 'hidden',
  },
  restFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(59,130,246,0.2)' },
  restLabel: { fontSize: 12, color: '#93c5fd', textAlign: 'center', fontWeight: '600' },

  // Exercise card
  exerciseCard: {
    backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a',
    borderRadius: 16, padding: 16, margin: 16, marginBottom: 0,
  },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  exerciseName: { fontSize: 16, fontWeight: '700', color: '#e8e8f0', flex: 1 },
  exerciseRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  est1rm: { fontSize: 11, color: '#c9a84c', fontWeight: '600' },
  setsProgress: { fontSize: 12, color: '#888899' },
  lastSession: { fontSize: 11, color: '#444', marginBottom: 12, fontStyle: 'italic' },

  setHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  setHeaderText: { fontSize: 9, fontWeight: '600', color: '#444', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  setRowDone: { opacity: 0.6 },
  setNum: { width: 30, fontSize: 13, fontWeight: '600', color: '#888899', textAlign: 'center' },
  setNumDone: { color: '#4cc97a' },
  setInput: {
    flex: 1, backgroundColor: '#1c1c2a', borderWidth: 1, borderColor: '#2a2a3a',
    borderRadius: 8, padding: 8, fontSize: 15, fontWeight: '600', color: '#e8e8f0', textAlign: 'center',
  },
  setInputDone: { borderColor: 'rgba(76,201,122,0.3)', backgroundColor: 'rgba(76,201,122,0.05)' },
  checkBtn: { width: 44, height: 40, borderRadius: 8, backgroundColor: '#1c1c2a', borderWidth: 1, borderColor: '#2a2a3a', alignItems: 'center', justifyContent: 'center' },
  checkBtnDone: { backgroundColor: 'rgba(76,201,122,0.15)', borderColor: 'rgba(76,201,122,0.4)' },
  checkBtnText: { fontSize: 16, color: '#4cc97a' },

  // Add exercise
  addExerciseBtn: {
    margin: 16, padding: 14, borderWidth: 1.5, borderColor: '#2a2a3a',
    borderStyle: 'dashed', borderRadius: 12, alignItems: 'center',
  },
  addExerciseText: { fontSize: 14, fontWeight: '600', color: '#888899' },

  finishBtn: {
    marginHorizontal: 16, padding: 16, backgroundColor: '#c9a84c',
    borderRadius: 14, alignItems: 'center', marginTop: 8,
  },
  finishText: { fontSize: 16, fontWeight: '700', color: '#0a0a0f' },

  // XP Pop
  xpPop: { position: 'absolute', backgroundColor: 'rgba(201,168,76,0.9)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  xpPopText: { fontSize: 14, fontWeight: '800', color: '#0a0a0f' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1a1a26', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#e8e8f0', marginBottom: 16 },
  modalInput: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 10, padding: 14, fontSize: 15, color: '#e8e8f0', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 14, backgroundColor: '#12121a', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3a' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#888899' },
  modalSave: { flex: 1, padding: 14, backgroundColor: '#c9a84c', borderRadius: 10, alignItems: 'center' },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: '#0a0a0f' },
});