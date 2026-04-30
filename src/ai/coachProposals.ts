export type CoachProposal =
  | {
      type: 'workout_template_upsert';
      templateId?: string;
      name: string;
      notes?: string;
      items: {
        exerciseName: string;
        sets: { reps?: number; weight?: number; rpe?: number; note?: string }[];
      }[];
    }
  | {
      type: 'workout_template_delete';
      templateId: string;
    }
  | {
      type: 'food_log_append';
      meal?: string;
      items: {
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        qty?: number;
        serving?: string;
      }[];
    };

export type CoachContextPayload = {
  userId?: string;
  workoutTemplates?: { id: string; name: string }[];
  nutritionToday?: { calories: number; protein: number; carbs: number; fat: number };
};

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export function parseCoachProposals(raw: unknown): CoachProposal[] {
  if (!Array.isArray(raw)) return [];
  const out: CoachProposal[] = [];
  for (const p of raw.slice(0, 10)) {
    if (!p || typeof p !== 'object') continue;
    const t = (p as any).type;
    if (t === 'workout_template_delete') {
      const id = String((p as any).templateId || '');
      if (!isUuid(id)) continue;
      out.push({ type: 'workout_template_delete', templateId: id });
      continue;
    }
    if (t === 'workout_template_upsert') {
      const name = String((p as any).name || '').trim().slice(0, 120);
      if (!name) continue;
      const tid = (p as any).templateId;
      const templateId =
        tid != null && String(tid) && isUuid(String(tid)) ? String(tid) : undefined;
      const notes =
        typeof (p as any).notes === 'string' ? String((p as any).notes).trim().slice(0, 2000) : undefined;
      const rawItems = Array.isArray((p as any).items) ? (p as any).items : [];
      const items: {
        exerciseName: string;
        sets: { reps?: number; weight?: number; rpe?: number; note?: string }[];
      }[] = [];
      for (const it of rawItems.slice(0, 40)) {
        const exerciseName = String(it?.exerciseName || '').trim().slice(0, 120);
        if (!exerciseName) continue;
        const rawSets = Array.isArray(it?.sets) ? it.sets : [];
        const sets: { reps?: number; weight?: number; rpe?: number; note?: string }[] = [];
        for (const s of rawSets.slice(0, 50)) {
          const set: { reps?: number; weight?: number; rpe?: number; note?: string } = {};
          if (s?.reps != null && Number.isFinite(Number(s.reps))) set.reps = Math.max(0, Math.min(999, Math.round(Number(s.reps))));
          if (s?.weight != null && Number.isFinite(Number(s.weight))) set.weight = Math.max(0, Math.min(2000, Number(s.weight)));
          if (s?.rpe != null && Number.isFinite(Number(s.rpe))) set.rpe = Math.max(0, Math.min(10, Number(s.rpe)));
          if (typeof s?.note === 'string') set.note = String(s.note).slice(0, 200);
          sets.push(set);
        }
        if (sets.length === 0) sets.push({ reps: 8 });
        items.push({ exerciseName, sets });
      }
      if (items.length === 0) continue;
      out.push({ type: 'workout_template_upsert', templateId, name, notes, items });
      continue;
    }
    if (t === 'food_log_append') {
      const meal =
        typeof (p as any).meal === 'string' ? String((p as any).meal).trim().slice(0, 40) : undefined;
      const rawItems = Array.isArray((p as any).items) ? (p as any).items : [];
      const items: {
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        qty?: number;
        serving?: string;
      }[] = [];
      for (const it of rawItems.slice(0, 30)) {
        const name = String(it?.name || '').trim().slice(0, 200);
        if (!name) continue;
        items.push({
          name,
          calories: Math.max(0, Math.min(20000, Math.round(Number(it?.calories) || 0))),
          protein: Math.max(0, Math.min(2000, Math.round(Number(it?.protein) || 0))),
          carbs: Math.max(0, Math.min(2000, Math.round(Number(it?.carbs) || 0))),
          fat: Math.max(0, Math.min(2000, Math.round(Number(it?.fat) || 0))),
          qty:
            it?.qty != null && Number.isFinite(Number(it.qty))
              ? Math.max(0.25, Math.min(99, Number(it.qty)))
              : undefined,
          serving: typeof it?.serving === 'string' ? String(it.serving).slice(0, 80) : undefined,
        });
      }
      if (items.length === 0) continue;
      out.push({ type: 'food_log_append', meal, items });
    }
  }
  return out;
}
