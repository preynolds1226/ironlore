import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { callCoach, CoachError } from '@/src/ai/coachClient';
import { CLASSES } from '@/src/domain/gameData';
import { useIsOnline } from '@/src/system/network';

export type CoachCharacter = { name?: string; classId?: string };

export function CoachScreen(props: {
  onBack: () => void;
  userId: string;
  character: CoachCharacter | null;
}) {
  const { onBack, character } = props;

  const chosenClass = CLASSES.find((c) => c.id === character?.classId);
  const initialGreeting =
    chosenClass?.name === 'Warrior' ? `${character?.name}. You're here. Good. The forge waits for no one. What do you need?` :
      chosenClass?.name === 'Ranger' ? `Welcome back, ${character?.name}. Ready to analyze your progress and plan your next move?` :
      chosenClass?.name === 'Monk' ? `${character?.name}. The mind is still. The body is ready. How can I guide you today?` :
      `${character?.name}! YOU'RE HERE! The iron is HOT and we're about to go BEAST MODE. What are we destroying today?!`;

  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>(() => [
    { role: 'assistant', content: initialGreeting },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastFailed, setLastFailed] = useState<{ input: string; systemPrompt: string; messages: { role: 'user' | 'assistant'; content: string }[] } | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isOnline = useIsOnline();

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
      if (err.code === 'unauthenticated') return 'Your oath is unbound. Log in again.';
      if (err.code === 'rate_limited') {
        const wait = typeof err.retryAfterSeconds === 'number' ? Math.max(0, Math.ceil(err.retryAfterSeconds)) : null;
        return wait !== null ? `Easy. You’re swinging too fast. Wait ${wait}s, then try again.` : 'Easy. You’re swinging too fast. Give it a moment.';
      }
      if (err.code === 'server') return 'The forge is roaring. Give it a moment, then try again.';
      if (err.code === 'bad_request') return 'Your request was malformed. Shorten it and try again.';
    }

    return 'The connection to the Iron Realm was lost. Try again.';
  }

  async function sendMessage(override?: string) {
    const raw = (override ?? input).trim();
    if (!raw || loading) return;
    if (!isOnline) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'No signal. The realm is dark. Reconnect and try again.' }]);
      return;
    }

    const content = raw.slice(0, 4000);
    const userMsg = { role: 'user' as const, content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLastFailed(null);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const reply = await callCoach({
        systemPrompt,
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        signal: abortRef.current.signal,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      const text = errorToCoachText(err);
      if (text) {
        setMessages((prev) => [...prev, { role: 'assistant', content: text }]);
        setLastFailed({ input: content, systemPrompt, messages: newMessages });
      }
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
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
        </View>
        <View style={co.onlineDot} />
      </View>

      {!isOnline && (
        <View style={co.offlineBanner}>
          <Text style={co.offlineText}>Offline — reconnect to speak with your Coach.</Text>
        </View>
      )}

      <ScrollView
        ref={(r) => { scrollRef.current = r; }}
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
        {!loading && lastFailed && (
          <View style={{ alignSelf: 'center', marginTop: 6 }}>
            <TouchableOpacity style={co.retryBtn} onPress={() => sendMessage(lastFailed.input)} disabled={!isOnline}>
              <Text style={co.retryBtnText}>{isOnline ? 'Retry' : 'Retry (offline)'}</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={co.inputRow}>
        <TextInput
          style={co.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask your coach..."
          placeholderTextColor="#444"
          multiline
          onSubmitEditing={() => sendMessage()}
          editable={!loading}
        />
        <TouchableOpacity
          style={[co.sendBtn, { backgroundColor: input.trim() && !loading && isOnline ? '#c9a84c' : '#2a2a3a' }]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading || !isOnline}
        >
          <Text style={{ fontSize: 18 }}>↑</Text>
        </TouchableOpacity>
      </View>
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
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4cc97a' },
  offlineBanner: { marginHorizontal: 16, marginTop: 10, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  offlineText: { fontSize: 12, color: '#fecaca', fontWeight: '700', textAlign: 'center' },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 14 },
  assistantBubble: { backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: '#c9a84c', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: '#e8e8f0', lineHeight: 20 },
  userBubbleText: { color: '#0a0a0f', fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 32, gap: 10, borderTopWidth: 1, borderTopColor: '#1a1a2a' },
  input: { flex: 1, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 14, padding: 12, fontSize: 14, color: '#e8e8f0', maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  retryBtn: { backgroundColor: 'rgba(201,168,76,0.12)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.35)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  retryBtnText: { fontSize: 12, fontWeight: '800', color: '#c9a84c', letterSpacing: 0.6 },
});

