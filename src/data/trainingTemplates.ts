import { supabase } from '@/src/data/supabaseClient';

export type ExerciseCatalogItem = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type TemplateSet = {
  reps: number;
  weight?: number;
  rpe?: number;
  note?: string;
};

export type WorkoutTemplateItem = {
  id: string;
  template_id: string;
  exercise_id: string;
  position: number;
  sets: TemplateSet[];
  exercise: Pick<ExerciseCatalogItem, 'id' | 'name'>;
};

export type WorkoutTemplate = {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: WorkoutTemplateItem[];
};

type TemplateInput = {
  id?: string;
  userId: string;
  name: string;
  notes?: string;
  items: {
    position: number;
    exerciseName: string;
    sets: TemplateSet[];
  }[];
};

export async function listTemplates(userId: string): Promise<WorkoutTemplate[]> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select(
      `
      id,user_id,name,notes,created_at,updated_at,
      items:workout_template_items(
        id,template_id,exercise_id,position,sets,
        exercise:exercise_catalog(id,name)
      )
    `,
    )
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .order('position', { ascending: true, foreignTable: 'workout_template_items' });

  if (error) throw error;
  return (data ?? []).map((t: any) => ({
    ...t,
    items: (t.items ?? []).sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)),
  })) as WorkoutTemplate[];
}

export async function getTemplate(templateId: string): Promise<WorkoutTemplate | null> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select(
      `
      id,user_id,name,notes,created_at,updated_at,
      items:workout_template_items(
        id,template_id,exercise_id,position,sets,
        exercise:exercise_catalog(id,name)
      )
    `,
    )
    .eq('id', templateId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    ...(data as any),
    items: (((data as any).items ?? []) as any[]).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  } as WorkoutTemplate;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase.from('workout_templates').delete().eq('id', templateId);
  if (error) throw error;
}

export async function searchExerciseCatalog(userId: string, query: string): Promise<ExerciseCatalogItem[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('exercise_catalog')
    .select('id,user_id,name,created_at')
    .eq('user_id', userId)
    .ilike('name', `%${q}%`)
    .order('name', { ascending: true })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as ExerciseCatalogItem[];
}

export async function createExerciseIfMissing(userId: string, name: string): Promise<ExerciseCatalogItem> {
  const n = name.trim();
  if (!n) throw new Error('Exercise name required');

  // Try to find existing (case-insensitive match).
  const { data: existing, error: existingErr } = await supabase
    .from('exercise_catalog')
    .select('id,user_id,name,created_at')
    .eq('user_id', userId)
    .ilike('name', n)
    .maybeSingle();

  if (existingErr) throw existingErr;
  if (existing) return existing as ExerciseCatalogItem;

  // Insert (unique index prevents duplicates if raced).
  const { data, error } = await supabase
    .from('exercise_catalog')
    .insert({ user_id: userId, name: n })
    .select('id,user_id,name,created_at')
    .single();

  if (error) throw error;
  return data as ExerciseCatalogItem;
}

export async function upsertTemplate(input: TemplateInput): Promise<WorkoutTemplate> {
  const name = input.name.trim();
  if (!name) throw new Error('Template name required');

  // 1) Upsert template
  const { data: template, error: templateErr } = await supabase
    .from('workout_templates')
    .upsert(
      {
        id: input.id,
        user_id: input.userId,
        name,
        notes: input.notes?.trim() ? input.notes.trim() : null,
      },
      { onConflict: 'id' },
    )
    .select('id,user_id,name,notes,created_at,updated_at')
    .single();

  if (templateErr) throw templateErr;

  // 2) Replace items
  const templateId = template.id as string;
  const { error: delErr } = await supabase.from('workout_template_items').delete().eq('template_id', templateId);
  if (delErr) throw delErr;

  const itemsToInsert: any[] = [];
  for (const item of input.items) {
    const ex = await createExerciseIfMissing(input.userId, item.exerciseName);
    itemsToInsert.push({
      template_id: templateId,
      exercise_id: ex.id,
      position: item.position,
      sets: item.sets ?? [],
    });
  }

  if (itemsToInsert.length) {
    const { error: insErr } = await supabase.from('workout_template_items').insert(itemsToInsert);
    if (insErr) throw insErr;
  }

  // 3) Read back in canonical shape
  const updated = await getTemplate(templateId);
  if (!updated) throw new Error('Template not found after save');
  return updated;
}

