import { useState } from 'react';
import { Loader2, Sparkles, Plus, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { Task, EnergyTag } from '../types/task';
import { TAG_META } from '../types/task';
import { decomposeCapture } from '../lib/claude';

interface Props {
  apiKey: string;
  onAdd: (tasks: Task[]) => void;
  onClose: () => void;
}

interface Draft {
  title: string;
  description: string;
  definitionOfDone: string;
  energyTag: EnergyTag;
  timeboxMinutes: number;
  expanded: boolean;
}

export default function Capture({ apiKey, onAdd, onClose }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [manualTitle, setManualTitle] = useState('');
  const [manualTag, setManualTag] = useState<EnergyTag>('processing');

  const handleAI = async () => {
    if (!text.trim() || !apiKey) return;
    setLoading(true);
    try {
      const result = await decomposeCapture(text, apiKey);
      setDrafts(result.map(d => ({
        title: d.title,
        description: d.description,
        definitionOfDone: d.definitionOfDone,
        energyTag: d.energyTag,
        timeboxMinutes: d.timeboxMinutes,
        expanded: true,
      })));
    } catch {}
    setLoading(false);
  };

  const handleManual = () => {
    if (!manualTitle.trim()) return;
    setDrafts(prev => [...prev, {
      title: manualTitle.trim(),
      description: '',
      definitionOfDone: '',
      energyTag: manualTag,
      timeboxMinutes: 25,
      expanded: true,
    }]);
    setManualTitle('');
  };

  const updateDraft = (i: number, patch: Partial<Draft>) =>
    setDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d));

  const removeDraft = (i: number) =>
    setDrafts(prev => prev.filter((_, idx) => idx !== i));

  const handleConfirm = () => {
    if (drafts.length === 0) return;
    const now = new Date().toISOString();
    const tasks: Task[] = drafts.map(d => ({
      id: crypto.randomUUID(),
      title: d.title,
      description: d.description,
      energyTag: d.energyTag,
      definitionOfDone: d.definitionOfDone,
      status: 'ready',
      timeboxMinutes: d.timeboxMinutes,
      actualMinutes: null,
      shareMessage: null,
      sharedAt: null,
      parentId: null,
      createdAt: now,
      completedAt: null,
      bypassedAt: null,
    }));
    onAdd(tasks);
    onClose();
  };

  const TAGS: EnergyTag[] = ['thinking', 'social', 'processing', 'review'];
  const TIMES = [15, 25, 45, 60, 90, 120];

  return (
    <div className="capture-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="capture-panel">
        <div className="capture-header">
          <span className="capture-title">📥 キャプチャ</span>
          <button className="cap-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* AI decompose */}
        {apiKey && (
          <div className="capture-ai">
            <p className="cap-ai-hint">メール・議事録・メモをそのまま貼り付けてください。AIがタスクに分解します。</p>
            <textarea
              className="cap-textarea"
              rows={5}
              placeholder="例：&#10;件名：ABC社連携仕様の問題について&#10;先ほどの商談で、API仕様の認識齟齬が発覚しました。先方の要件を整理し、社内エンジニアに確認後、週内に回答が必要です。"
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <button className="cap-ai-btn" onClick={handleAI} disabled={loading || !text.trim()}>
              {loading
                ? <><Loader2 size={14} className="spin" /> 分解中…</>
                : <><Sparkles size={14} /> AIでタスクに分解</>}
            </button>
          </div>
        )}

        {/* Manual add */}
        <div className="capture-manual">
          <div className="cap-section-label">手動で追加</div>
          <div className="cap-manual-row">
            <input
              className="cap-input"
              placeholder="タスクを直接追加…"
              value={manualTitle}
              onChange={e => setManualTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleManual()}
            />
            <select className="cap-tag-select" value={manualTag} onChange={e => setManualTag(e.target.value as EnergyTag)}>
              {TAGS.map(t => <option key={t} value={t}>{TAG_META[t].emoji} {TAG_META[t].label}</option>)}
            </select>
            <button className="cap-add-btn" onClick={handleManual} disabled={!manualTitle.trim()}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Draft list */}
        {drafts.length > 0 && (
          <div className="cap-drafts">
            <div className="cap-drafts-title">確認・編集してから追加（{drafts.length}件）</div>
            {drafts.map((d, i) => (
              <div key={i} className="cap-draft-item">
                {/* Header row */}
                <div className="cap-draft-header">
                  <input
                    className="cap-draft-title-input"
                    value={d.title}
                    onChange={e => updateDraft(i, { title: e.target.value })}
                    placeholder="タスク名"
                  />
                  <button className="cap-expand-btn" onClick={() => updateDraft(i, { expanded: !d.expanded })}>
                    {d.expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button className="cap-remove-btn" onClick={() => removeDraft(i)}><X size={13} /></button>
                </div>

                {/* Expanded details */}
                {d.expanded && (
                  <div className="cap-draft-body">
                    <div className="cap-field">
                      <label className="cap-field-label">完了の定義（これができたら終わり）</label>
                      <input
                        className="cap-field-input cap-dod-input"
                        value={d.definitionOfDone}
                        onChange={e => updateDraft(i, { definitionOfDone: e.target.value })}
                        placeholder="例：〇〇さんに返信済み / 方針を1行でまとめた"
                      />
                    </div>
                    {d.description && (
                      <div className="cap-field">
                        <label className="cap-field-label">背景</label>
                        <p className="cap-description">{d.description}</p>
                      </div>
                    )}
                    <div className="cap-draft-meta">
                      <select className="cap-mini-select" value={d.energyTag}
                        onChange={e => updateDraft(i, { energyTag: e.target.value as EnergyTag })}>
                        {TAGS.map(t => <option key={t} value={t}>{TAG_META[t].emoji} {TAG_META[t].label}</option>)}
                      </select>
                      <select className="cap-mini-select" value={d.timeboxMinutes}
                        onChange={e => updateDraft(i, { timeboxMinutes: Number(e.target.value) })}>
                        {TIMES.map(m => <option key={m} value={m}>{m}分</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button className="cap-confirm-btn" onClick={handleConfirm}>
              <Check size={15} /> {drafts.length}件をタスクに追加
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
