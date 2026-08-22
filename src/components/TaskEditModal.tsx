import { useState } from 'react';
import { X, Trash2, Save } from 'lucide-react';
import type { Task, EnergyTag } from '../types/task';
import { TAG_META } from '../types/task';
import { updateTask, deleteTask } from '../lib/db';

interface Props {
  task: Task;
  onSave: (updated: Task) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const TAGS: EnergyTag[] = ['thinking', 'social', 'processing', 'review'];
const TIMES = [15, 25, 45, 60, 90, 120];

export default function TaskEditModal({ task, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(task.title);
  const [dod, setDod] = useState(task.definitionOfDone || '');
  const [description, setDescription] = useState(task.description || '');
  const [energyTag, setEnergyTag] = useState<EnergyTag>(task.energyTag);
  const [timebox, setTimebox] = useState(task.timeboxMinutes ?? 25);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const updated = await updateTask(task.id, {
      title: title.trim(),
      definitionOfDone: dod,
      description,
      energyTag,
      timeboxMinutes: timebox,
    });
    setSaving(false);
    onSave(updated);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deleteTask(task.id);
    onDelete(task.id);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="task-edit-panel">
        <div className="te-header">
          <span className="te-title">タスクを編集</span>
          <button className="te-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="te-body">
          <div className="te-field">
            <label className="te-label">タスク名</label>
            <input className="te-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="タスク名" />
          </div>

          <div className="te-field">
            <label className="te-label">完了の定義</label>
            <input className="te-input" value={dod} onChange={e => setDod(e.target.value)}
              placeholder="例：〇〇さんに返信済み / 方針を1行でまとめた" />
          </div>

          <div className="te-field">
            <label className="te-label">背景・メモ</label>
            <textarea className="te-textarea" rows={2} value={description}
              onChange={e => setDescription(e.target.value)} placeholder="任意" />
          </div>

          <div className="te-row">
            <div className="te-field">
              <label className="te-label">種類</label>
              <select className="te-select" value={energyTag} onChange={e => setEnergyTag(e.target.value as EnergyTag)}>
                {TAGS.map(t => <option key={t} value={t}>{TAG_META[t].emoji} {TAG_META[t].label}</option>)}
              </select>
            </div>
            <div className="te-field">
              <label className="te-label">目安時間</label>
              <select className="te-select" value={timebox} onChange={e => setTimebox(Number(e.target.value))}>
                {TIMES.map(m => <option key={m} value={m}>{m}分</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="te-actions">
          <button className="te-save-btn" onClick={handleSave} disabled={saving || !title.trim()}>
            <Save size={15} /> {saving ? '保存中…' : '保存'}
          </button>
          <button
            className={`te-delete-btn${confirmDelete ? ' confirm' : ''}`}
            onClick={handleDelete}
          >
            <Trash2 size={14} />
            {confirmDelete ? 'もう一度押すと削除' : '削除'}
          </button>
        </div>
      </div>
    </div>
  );
}
