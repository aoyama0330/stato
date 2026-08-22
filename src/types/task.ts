export type EnergyLevel = 'high' | 'medium' | 'low' | 'drained';
export type EnergyTag = 'thinking' | 'social' | 'processing' | 'review';
export type TaskStatus = 'captured' | 'ready' | 'active' | 'bypassed' | 'completed' | 'partial';

export interface CheckIn {
  id: string;
  energyLevel: EnergyLevel;
  intention: string | null;
  strategy: string | null;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  energyTag: EnergyTag;
  definitionOfDone: string;
  status: TaskStatus;
  timeboxMinutes: number | null;
  actualMinutes: number | null;
  shareMessage: string | null;
  sharedAt: string | null;
  parentId: string | null;
  createdAt: string;
  completedAt: string | null;
  bypassedAt: string | null;
}

export const ENERGY_META: Record<EnergyLevel, { label: string; sub: string; emoji: string; color: string; bg: string }> = {
  high:    { label: '頭がクリア',    sub: '集中・判断できる',       emoji: '🧠', color: '#2E9E72', bg: '#E8F7F2' },
  medium:  { label: '普通・動ける',  sub: 'いつも通りに動ける',     emoji: '⚡', color: '#3A7FC1', bg: '#E6EFF8' },
  low:     { label: '少し疲れてる',  sub: '手は動くが判断は重い',   emoji: '😮‍💨', color: '#C87830', bg: '#FBF0E3' },
  drained: { label: 'ぼーっとする',  sub: '確認・見るだけならOK',   emoji: '🪫', color: '#8B6DBE', bg: '#F0EBF8' },
};

export const TAG_META: Record<EnergyTag, { label: string; emoji: string; color: string; bg: string; minEnergy: EnergyLevel }> = {
  thinking:   { label: '思考',  emoji: '💭', color: '#5C6BC0', bg: '#EEF0FA', minEnergy: 'high' },
  social:     { label: '対人',  emoji: '🤝', color: '#26A69A', bg: '#E0F5F3', minEnergy: 'medium' },
  processing: { label: '処理',  emoji: '⚙️', color: '#F47C3A', bg: '#FEF0E6', minEnergy: 'low' },
  review:     { label: '確認',  emoji: '👀', color: '#AB47BC', bg: '#F5E9F8', minEnergy: 'drained' },
};

// Which tags are accessible at each energy level
export const ENERGY_COMPATIBLE: Record<EnergyLevel, EnergyTag[]> = {
  high:    ['thinking', 'social', 'processing', 'review'],
  medium:  ['social', 'processing', 'review'],
  low:     ['processing', 'review'],
  drained: ['review'],
};

const LEVEL_ORDER: EnergyLevel[] = ['high', 'medium', 'low', 'drained'];
export const canDoTag = (energy: EnergyLevel, tag: EnergyTag): boolean =>
  ENERGY_COMPATIBLE[energy].includes(tag);

export const energyIndex = (e: EnergyLevel) => LEVEL_ORDER.indexOf(e);
