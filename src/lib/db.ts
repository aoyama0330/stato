import { supabase } from './supabase';
import type { CheckIn, Task, EnergyLevel, EnergyTag, TaskStatus } from '../types/task';

// ── CheckIn ──────────────────────────────────────────────────

function toCheckin(row: Record<string, unknown>): CheckIn {
  return {
    id: row.id as string,
    energyLevel: row.energy_level as EnergyLevel,
    intention: (row.intention as string) ?? null,
    strategy: (row.strategy as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function fetchTodayCheckin(): Promise<CheckIn | null> {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const { data } = await supabase
    .from('stato_checkins')
    .select('*')
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false })
    .limit(1);
  return data && data.length > 0 ? toCheckin(data[0]) : null;
}

export async function insertCheckin(c: Omit<CheckIn, 'id' | 'createdAt'>): Promise<CheckIn> {
  const { data, error } = await supabase
    .from('stato_checkins')
    .insert({ energy_level: c.energyLevel, intention: c.intention, strategy: c.strategy })
    .select()
    .single();
  if (error) throw error;
  return toCheckin(data);
}

// ── Tasks ─────────────────────────────────────────────────────

function toTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? '',
    energyTag: row.energy_tag as EnergyTag,
    definitionOfDone: (row.definition_of_done as string) ?? '',
    status: row.status as TaskStatus,
    timeboxMinutes: (row.timebox_minutes as number) ?? null,
    actualMinutes: (row.actual_minutes as number) ?? null,
    shareMessage: (row.share_message as string) ?? null,
    sharedAt: (row.shared_at as string) ?? null,
    parentId: (row.parent_id as string) ?? null,
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string) ?? null,
    bypassedAt: (row.bypassed_at as string) ?? null,
  };
}

function toRow(t: Task) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    energy_tag: t.energyTag,
    definition_of_done: t.definitionOfDone,
    status: t.status,
    timebox_minutes: t.timeboxMinutes,
    actual_minutes: t.actualMinutes,
    share_message: t.shareMessage,
    shared_at: t.sharedAt,
    parent_id: t.parentId,
    completed_at: t.completedAt,
    bypassed_at: t.bypassedAt,
  };
}

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('stato_tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toTask);
}

export async function insertTask(t: Task): Promise<Task> {
  const { data, error } = await supabase.from('stato_tasks').insert(toRow(t)).select().single();
  if (error) throw error;
  return toTask(data);
}

export async function updateTask(id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<Task> {
  const patchRow: Record<string, unknown> = {};
  if (patch.title !== undefined) patchRow.title = patch.title;
  if (patch.description !== undefined) patchRow.description = patch.description;
  if (patch.energyTag !== undefined) patchRow.energy_tag = patch.energyTag;
  if (patch.definitionOfDone !== undefined) patchRow.definition_of_done = patch.definitionOfDone;
  if (patch.status !== undefined) patchRow.status = patch.status;
  if (patch.timeboxMinutes !== undefined) patchRow.timebox_minutes = patch.timeboxMinutes;
  if (patch.actualMinutes !== undefined) patchRow.actual_minutes = patch.actualMinutes;
  if (patch.shareMessage !== undefined) patchRow.share_message = patch.shareMessage;
  if (patch.sharedAt !== undefined) patchRow.shared_at = patch.sharedAt;
  if (patch.parentId !== undefined) patchRow.parent_id = patch.parentId;
  if (patch.completedAt !== undefined) patchRow.completed_at = patch.completedAt;
  if (patch.bypassedAt !== undefined) patchRow.bypassed_at = patch.bypassedAt;
  const { data, error } = await supabase.from('stato_tasks').update(patchRow).eq('id', id).select().single();
  if (error) throw error;
  return toTask(data);
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('stato_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteAllTasks(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('stato_tasks').delete().eq('user_id', user.id);
  if (error) throw error;
}

// ── Weekly summary ─────────────────────────────────────────────
export async function fetchWeeklyCheckins(): Promise<CheckIn[]> {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const { data } = await supabase
    .from('stato_checkins')
    .select('*')
    .gte('created_at', d.toISOString())
    .order('created_at', { ascending: true });
  return (data ?? []).map(toCheckin);
}
