import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { callCoachWithProposals, CoachError, type CoachMessage } from '@/src/ai/coachClient';
import type { CoachProposal } from '@/src/ai/coachProposals';
import { DEFAULT_NUTRITION_GOALS } from '@/src/constants/defaultNutritionGoals';
import { appendNutritionItems, loadNutritionDay, totalsFromItems } from '@/src/data/nutritionDayStore';
import { deleteTemplate, listTemplates, upsertTemplate } from '@/src/data/trainingTemplates';
import { CLASSES } from '@/src/domain/gameData';
import {
  FREE_COACH_MESSAGES_PER_DAY,
  freeCoachMessagesRemaining,
  getCoachMessagesUsedToday,
  incrementCoachMessageSuccess,
} from '@/src/purchases/coachUsage';
import { usePremium } from '@/src/purchases/PremiumContext';
import { useIsOnline } from '@/src/system/network';

export type CoachCharacter = { name?: string; classId?: string };

type UserChatMessage = { role: 'user'; content: string };
type AssistantChatMessage = {
  role: 'assistant';
  content: string;
  proposals: CoachProposal[];
  proposalStatuses: ('pending' | 'applied' | 'dismissed')[];
};
type ChatMessage = UserChatMessage | AssistantChatMessage;

function isAssistantMessage(m: ChatMessage): m is AssistantChatMessage {
  return m.role === 'assistant';
}

function toCoachMessages(msgs: ChatMessage[]): CoachMessage[] {
  return msgs.map((m) => ({ role: m.role, content: m.content }));
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

export function CoachScreen(props: {
  onBack: () => void;
  userId: string | null;
  character: CoachCharacter | null;
}) {
  const { onBack, character, userId } = props;

  const chosenClass = CLASSES.find((c) => c.id === character?.classId);
  const initialGreeting =
    chosenClass?.name === 'Warrior' ? `${character?.name}. You're here. Good. The forge waits for no one. What do you need?` :
      chosenClass?.name === 'Ranger' ? `Welcome back, ${character?.name}. Ready to analyze your progress and plan your next move?` :
      chosenClass?.name === 'Monk' ? `${character?.name}. The mind is still. The body is ready. How can I guide you today?` :
      `${character?.name}! YOU'RE HERE! The iron is HOT and we're about to go BEAST MODE. What are we destroying today?!`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { role: 'assistant', content: initialGreeting, proposals: [], proposalStatuses: [] },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastFailed, setLastFailed] = useState<{
    input: string;
    systemPrompt: string;
    messages: ChatMessage[];
  } | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isOnline = useIsOnline();
  const insets = useSafeAreaInsets();
  const { isPremium, purchaseDefault, restore, purchasesConfigured } = usePremium();
  const [coachFreeRemaining, setCoachFreeRemaining] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isPremium) {
        if (!cancelled) setCoachFreeRemaining(null);
        return;
      }
      const used = await getCoachMessagesUsedToday();
      if (!cancelled) setCoachFreeRemaining(freeCoachMessagesRemaining(used));
    })();
    return () => {
      cancelled = true;
    };
  }, [isPremium]);

  const systemPrompt = `You are the AI coach for IronLore, a LitRPG fitness app. The user's warrior class is ${chosenClass?.name || 'Warrior'}. 

Your personality: ${chosenClass?.coach || '"No excuses. Add weight."'}

You are ${chosenClass?.name === 'Warrior' ? 'gruff, direct, and battle-hardened. You speak in short, punchy sentences. No fluff.' :
    chosenClass?.name === 'Ranger' ? 'calm, technical, and precise. You focus on consistency and data.' :
    chosenClass?.name === 'Monk' ? 'philosophical and balanced. You speak with wisdom and calm.' :
    'intense, aggressive, and hype. You motivate with fire and energy.'}

The user's name is ${character?.name || 'Warrior'}. Always stay in character. Keep responses concise — 2-4 sentences max unless asked for detail. Reference their fitness journey, class, and goals. Never break immersion.`;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function errorToCoachText(err: unknown): string | null {
    if ((err as any)?.name === 'AbortError') return null;

    if (err instanceof CoachError) {
      if (err.code === 'offline') return 'No signal. The realm is dark. Reconnect and try again.';
      if (err.code === 'unauthenticated') {
        return 'Sign in required. Open the home screen and log in so the Coach can reach the forge (Supabase session).';
      }
      if (err.code === 'config') {
        const hint = err.message?.trim() ? err.message.trim().slice(0, 200) : '';
        return hint
          ? `This build is missing server configuration. ${hint}`
          : 'This build is missing Supabase configuration. Rebuild with EXPO_PUBLIC_* env or app.json extra.';
      }
      if (err.code === 'rate_limited') {
        const wait = typeof err.retryAfterSeconds === 'number' ? Math.max(0, Math.ceil(err.retryAfterSeconds)) : null;
        return wait !== null ? `Easy. You’re swinging too fast. Wait ${wait}s, then try again.` : 'Easy. You’re swinging too fast. Give it a moment.';
      }
      if (err.code === 'server') {
        const hint = err.message?.trim() ? err.message.trim().slice(0, 180) : null;
        return hint ? `The forge is roaring. ${hint}` : 'The forge is roaring. Give it a moment, then try again.';
      }
      if (err.code === 'bad_request') return 'Your request was malformed. Shorten it and try again.';
    }

    return 'The connection to the Iron Realm was lost. Try again.';
  }

  async function sendMessage(override?: string) {
    const raw = (override ?? input).trim();
    if (!raw || loading) return;
    if (!userId) {
      Alert.alert(
        'Sign in to use the Coach',
        'The AI Coach needs an active account session. Go back, sign in from the home screen, then return here.',
        [{ text: 'OK' }, { text: 'Go back', onPress: onBack }],
      );
      return;
    }
    if (!isOnline) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'No signal. The realm is dark. Reconnect and try again.', proposals: [], proposalStatuses: [] },
      ]);
      return;
    }

    if (!isPremium) {
      const used = await getCoachMessagesUsedToday();
      if (used >= FREE_COACH_MESSAGES_PER_DAY) {
        Alert.alert(
          'Daily coach limit',
          `Free plan includes ${FREE_COACH_MESSAGES_PER_DAY} coach messages per day (resets at midnight). IronLore+ includes unlimited coaching.`,
          [
            { text: 'Not now', style: 'cancel' },
            ...(purchasesConfigured
              ? [
                  { text: 'Restore', onPress: () => void restore() },
                  { text: 'Subscribe', onPress: () => void purchaseDefault() },
                ]
              : []),
          ],
        );
        return;
      }
    }

    const content = raw.slice(0, 4000);
    const userMsg: UserChatMessage = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLastFailed(null);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      let workoutTemplates: { id: string; name: string }[] | undefined;
      if (userId && isPremium) {
        try {
          const tpl = await listTemplates(userId);
          workoutTemplates = tpl.map((t) => ({ id: t.id, name: t.name }));
        } catch {
          workoutTemplates = [];
        }
      } else {
        workoutTemplates = [];
      }
      let nutritionToday: { calories: number; protein: number; carbs: number; fat: number } | undefined;
      try {
        const items = await loadNutritionDay(todayKey());
        nutritionToday = totalsFromItems(items);
      } catch {
        nutritionToday = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      }

      const { text, proposals } = await callCoachWithProposals({
        systemPrompt,
        messages: toCoachMessages(newMessages),
        context: {
          userId: userId ?? undefined,
          workoutTemplates,
          nutritionToday,
        },
        signal: abortRef.current.signal,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: text,
          proposals,
          proposalStatuses: proposals.map(() => 'pending'),
        },
      ]);
      if (!isPremium) {
        await incrementCoachMessageSuccess();
        const used = await getCoachMessagesUsedToday();
        setCoachFreeRemaining(freeCoachMessagesRemaining(used));
      }
    } catch (err: any) {
      const text = errorToCoachText(err);
      if (text) {
        setMessages((prev) => [...prev, { role: 'assistant', content: text, proposals: [], proposalStatuses: [] }]);
        setLastFailed({ input: content, systemPrompt, messages: newMessages });
      }
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function applyProposal(msgIdx: number, proposalIdx: number) {
    const msg = messages[msgIdx];
    if (!isAssistantMessage(msg)) return;
    const p = msg.proposals[proposalIdx];
    if (!p || msg.proposalStatuses[proposalIdx] !== 'pending') return;

    try {
      if (p.type === 'workout_template_upsert') {
        if (!isPremium) {
          Alert.alert(
            'IronLore+',
            'Saving cloud workout templates is part of IronLore+. Subscribe from the Training tab, or log food from here without templates.',
            purchasesConfigured
              ? [
                  { text: 'OK' },
                  { text: 'Subscribe', onPress: () => void purchaseDefault() },
                ]
              : [{ text: 'OK' }],
          );
          return;
        }
        if (!userId) {
          Alert.alert('Sign in', 'Log in to save workout templates.');
          return;
        }
        await upsertTemplate({
          id: p.templateId,
          userId,
          name: p.name,
          notes: p.notes,
          items: p.items.map((it, idx) => ({
            position: idx,
            exerciseName: it.exerciseName,
            sets: it.sets.map((s) => ({
              reps: s.reps ?? 8,
              weight: s.weight,
              rpe: s.rpe,
              note: s.note,
            })),
          })),
        });
        Alert.alert('Saved', 'Workout template updated. Open Training to start it.', [
          { text: 'OK' },
          { text: 'Training', onPress: () => router.push('/(tabs)/training') },
        ]);
      } else if (p.type === 'workout_template_delete') {
        if (!isPremium) {
          Alert.alert(
            'IronLore+',
            'Cloud template sync is part of IronLore+.',
            purchasesConfigured
              ? [
                  { text: 'OK' },
                  { text: 'Subscribe', onPress: () => void purchaseDefault() },
                ]
              : [{ text: 'OK' }],
          );
          return;
        }
        if (!userId) {
          Alert.alert('Sign in', 'Log in to delete templates.');
          return;
        }
        await deleteTemplate(p.templateId);
        Alert.alert('Deleted', 'Workout template removed.');
      } else if (p.type === 'food_log_append') {
        await appendNutritionItems(
          todayKey(),
          p.meal || 'Lunch',
          p.items.map((it) => ({
            name: it.name,
            calories: it.calories,
            protein: it.protein,
            carbs: it.carbs,
            fat: it.fat,
            qty: it.qty,
            serving: it.serving,
          })),
          DEFAULT_NUTRITION_GOALS,
        );
        Alert.alert('Logged', 'Food added to today’s log. Check Nutrition.');
      }

      setMessages((prev) =>
        prev.map((m, i) => {
          if (i !== msgIdx || !isAssistantMessage(m)) return m;
          const next = [...m.proposalStatuses];
          next[proposalIdx] = 'applied';
          return { ...m, proposalStatuses: next };
        }),
      );
    } catch (e: any) {
      Alert.alert('Could not apply', e?.message ?? 'Something went wrong.');
    }
  }

  function dismissProposal(msgIdx: number, proposalIdx: number) {
    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== msgIdx || !isAssistantMessage(m)) return m;
        const next = [...m.proposalStatuses];
        next[proposalIdx] = 'dismissed';
        return { ...m, proposalStatuses: next };
      }),
    );
  }

  function proposalSummary(p: CoachProposal): string {
    if (p.type === 'workout_template_upsert') {
      return `Workout: ${p.name} — ${p.items.length} exercise(s)`;
    }
    if (p.type === 'workout_template_delete') {
      return `Delete template ${p.templateId.slice(0, 8)}…`;
    }
    return `Food: ${p.items.map((i) => i.name).join(', ')}`;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={styles.screenTitle}>COACH</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={co.coachHeader}>
        <View style={[co.coachAvatar, { backgroundColor: `${chosenClass?.color}30` }]}>
          <Text style={{ fontSize: 28 }}>{chosenClass?.icon || '⚔️'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[co.coachName, { color: chosenClass?.color || '#c9a84c' }]}>
            {chosenClass?.name || 'Warrior'} Coach
          </Text>
          <Text style={co.coachTagline}>{chosenClass?.tagline || 'Forge your body in iron and fire'}</Text>
          <Text style={co.aiDisclosure}>Coach replies are generated by AI; verify important training or nutrition decisions.</Text>
        </View>
        <View style={co.onlineDot} />
      </View>

      {!isOnline && (
        <View style={co.offlineBanner}>
          <Text style={co.offlineText}>Offline — reconnect to speak with your Coach.</Text>
        </View>
      )}

      {!userId && (
        <View style={co.authBanner}>
          <Text style={co.authBannerText}>
            Sign in from the home screen to use the AI Coach. Templates and food suggestions also need an account when saving.
          </Text>
          <TouchableOpacity style={co.authBannerBtn} onPress={onBack}>
            <Text style={co.authBannerBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={(r) => { scrollRef.current = r; }}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
        {messages.map((msg, i) => (
          <View key={i}>
            <View style={[co.bubble, msg.role === 'user' ? co.userBubble : co.assistantBubble]}>
              {msg.role === 'assistant' && (
                <Text style={{ fontSize: 16, marginBottom: 4 }}>{chosenClass?.icon || '⚔️'}</Text>
              )}
              <Text style={[co.bubbleText, msg.role === 'user' && co.userBubbleText]}>{msg.content}</Text>
            </View>
            {isAssistantMessage(msg) &&
              msg.proposals.map((p, pi) => {
                const st = msg.proposalStatuses[pi];
                if (!st || st === 'dismissed') return null;
                return (
                  <View key={`${i}-p-${pi}`} style={co.proposalCard}>
                    <Text style={co.proposalTitle}>Suggested action</Text>
                    <Text style={co.proposalBody}>{proposalSummary(p)}</Text>
                    {st === 'pending' && (
                      <View style={co.proposalRow}>
                        <TouchableOpacity style={co.applyBtn} onPress={() => applyProposal(i, pi)}>
                          <Text style={co.applyBtnText}>Apply</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={co.dismissBtn} onPress={() => dismissProposal(i, pi)}>
                          <Text style={co.dismissBtnText}>Dismiss</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {st === 'applied' && <Text style={co.appliedLabel}>Applied</Text>}
                  </View>
                );
              })}
          </View>
        ))}
        {loading && (
          <View style={co.assistantBubble}>
            <ActivityIndicator color="#c9a84c" size="small" />
          </View>
        )}
        {!loading && lastFailed && (
          <View style={{ alignSelf: 'center', marginTop: 6 }}>
            <TouchableOpacity style={co.retryBtn} onPress={() => sendMessage(lastFailed.input)} disabled={!isOnline}>
              <Text style={co.retryBtnText}>{isOnline ? 'Retry' : 'Retry (offline)'}</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 20 }} />
        </ScrollView>

        <View style={[co.inputRow, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          {!isPremium && coachFreeRemaining !== null && purchasesConfigured && (
            <Text style={{ fontSize: 11, color: '#6b6b7a', marginBottom: 6, paddingHorizontal: 4 }}>
              Free: {coachFreeRemaining} coach message{coachFreeRemaining === 1 ? '' : 's'} left today · IronLore+ unlimited
            </Text>
          )}
          <TextInput
            style={co.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach..."
            placeholderTextColor="#444"
            multiline
            onSubmitEditing={() => sendMessage()}
            editable={!loading && !!userId}
            onFocus={() => {
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
            }}
          />
          <TouchableOpacity
            style={[
              co.sendBtn,
              {
                backgroundColor:
                  input.trim() && !loading && isOnline && userId ? '#c9a84c' : '#2a2a3a',
              },
            ]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading || !isOnline || !userId}
          >
            <Text style={{ fontSize: 18 }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#2a2a3a',
  },
  backBtn: { fontSize: 13, color: '#888899' },
  screenTitle: { fontSize: 14, fontWeight: '900', color: '#c9a84c', letterSpacing: 3 },
});

const co = StyleSheet.create({
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a2a' },
  coachAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  coachName: { fontSize: 15, fontWeight: '700' },
  coachTagline: { fontSize: 11, color: '#888899', fontStyle: 'italic' },
  aiDisclosure: { fontSize: 10, color: '#666677', marginTop: 6, lineHeight: 14 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4cc97a' },
  offlineBanner: { marginHorizontal: 16, marginTop: 10, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  offlineText: { fontSize: 12, color: '#fecaca', fontWeight: '700', textAlign: 'center' },
  authBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.35)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  authBannerText: { fontSize: 12, color: '#e8e8f0', fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  authBannerBtn: { alignSelf: 'center', backgroundColor: 'rgba(201,168,76,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  authBannerBtnText: { fontSize: 12, fontWeight: '800', color: '#c9a84c' },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 14 },
  assistantBubble: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: '#c9a84c', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: '#e8e8f0', lineHeight: 20 },
  userBubbleText: { color: '#0a0a0f', fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: '#1a1a2a' },
  input: { flex: 1, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 14, padding: 12, fontSize: 14, color: '#e8e8f0', maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  retryBtn: { backgroundColor: 'rgba(201,168,76,0.12)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.35)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  retryBtnText: { fontSize: 12, fontWeight: '800', color: '#c9a84c', letterSpacing: 0.6 },
  proposalCard: {
    marginLeft: 8,
    marginTop: 8,
    marginBottom: 4,
    maxWidth: '92%',
    backgroundColor: '#0f0f14',
    borderWidth: 1,
    borderColor: '#c9a84c55',
    borderRadius: 14,
    padding: 12,
  },
  proposalTitle: { fontSize: 10, fontWeight: '900', color: '#c9a84c', letterSpacing: 1, marginBottom: 6 },
  proposalBody: { fontSize: 13, color: '#cfcfe6', lineHeight: 18 },
  proposalRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  applyBtn: { flex: 1, backgroundColor: '#c9a84c', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  applyBtnText: { fontSize: 13, fontWeight: '900', color: '#0a0a0f' },
  dismissBtn: { flex: 1, backgroundColor: '#1a1a24', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  dismissBtnText: { fontSize: 13, fontWeight: '800', color: '#888899' },
  appliedLabel: { marginTop: 10, fontSize: 12, fontWeight: '800', color: '#4cc97a' },
});

