import { useState, useRef } from 'react';
import { Loader2, Sparkles, Plus, Check, X, ChevronDown, ChevronUp, Mail, FileText, PenLine } from 'lucide-react';
import type { Task, EnergyTag } from '../types/task';
import { TAG_META } from '../types/task';
import { decomposeCapture } from '../lib/claude';
import GmailTab from './GmailTab';

interface Props {
  apiKey: string;
  gmailClientId: string;
  onAdd: (tasks: Task[]) => void;
  onClose: () => void;
  onOpenSettings: () => void;
}

interface Draft {
  title: string;
  description: string;
  definitionOfDone: string;
  energyTag: EnergyTag;
  timeboxMinutes: number;
  expanded: boolean;
}

type TabId = 'gmail' | 'file' | 'memo';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'gmail', label: 'Gmail', icon: <Mail size={15} /> },
  { id: 'file',  label: 'ファイル', icon: <FileText size={15} /> },
  { id: 'memo',  label: 'メモ', icon: <PenLine size={15} /> },
];

export default function Capture({ apiKey, gmailClientId, onAdd, onClose, onOpenSettings }: Props) {
  const [tab, setTab] = useState<TabId>('gmail');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [manualTitle, setManualTitle] = useState('');
  const [manualTag, setManualTag] = useState<EnergyTag>('processing');
  const fileRef = useRef<HTMLInputElement>(null);

  const runAI = async (inputText: string) => {
    if (!inputText.trim() || !apiKey) return;
    setLoading(true);
    try {
      const result = await decomposeCapture(inputText, apiKey);
      setDrafts(prev => [
        ...prev,
        ...result.map(d => ({
          title: d.title,
          description: d.description,
          definitionOfDone: d.definitionOfDone,
          energyTag: d.energyTag,
          timeboxMinutes: d.timeboxMinutes,
          expanded: true,
        })),
      ]);
      setText('');
      setFileName('');
    } catch {}
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setText(ev.target?.result as string ?? '');
    reader.readAsText(file, 'UTF-8');
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

  const tabConfig = {
    file: { hint: 'テキストファイル（.txt / .md / .csv）を読み込んでタスクを抽出します。' },
    memo: { hint: '議事録・打ち合わせメモ・アイデアメモをそのまま貼り付けてください。' },
  };

  return (
    <div className="capture-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="capture-panel">
        <div className="capture-header">
          <span className="capture-title">📥 キャプチャ</span>
          <button className="cap-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="cap-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`cap-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => { setTab(t.id); setText(''); setFileName(''); }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="cap-tab-body">
          {tab === 'gmail' && (
            <GmailTab
              clientId={gmailClientId}
              onAnalyze={runAI}
              analyzing={loading}
              onOpenSettings={() => { onClose(); onOpenSettings(); }}
            />
          )}

          {tab === 'file' && (
            <>
              <p className="cap-ai-hint">{tabConfig.file.hint}</p>
              <div className="cap-file-area" onClick={() => fileRef.current?.click()}>
                <input
                  ref={fileRef} type="file" accept=".txt,.md,.csv,.text"
                  style={{ display: 'none' }} onChange={handleFileChange}
                />
                {fileName ? (
                  <div className="cap-file-selected">
                    <FileText size={20} /><span>{fileName}</span>
                    <button onClick={e => { e.stopPropagation(); setText(''); setFileName(''); }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="cap-file-placeholder">
                    <FileText size={28} />
                    <span>クリックしてファイルを選択</span>
                    <span className="cap-file-types">.txt / .md / .csv</span>
                  </div>
                )}
              </div>
              {apiKey && (
                <button className="cap-ai-btn" onClick={() => runAI(text)} disabled={loading || !text.trim()}>
                  {loading ? <><Loader2 size={14} className="spin" /> 分解中…</> : <><Sparkles size={14} /> AIでタスクに分解</>}
                </button>
              )}
            </>
          )}

          {tab === 'memo' && (
            <>
              <p className="cap-ai-hint">{tabConfig.memo.hint}</p>
              <textarea
                className="cap-textarea" rows={6}
                placeholder={'例：\n【ABC社打合せメモ 8/22】\n・連携仕様の認識齟齬が発覚\n・要件整理が必要、エンジニアに確認\n・来週月曜までに回答'}
                value={text}
                onChange={e => setText(e.target.value)}
              />
              {apiKey && (
                <button className="cap-ai-btn" onClick={() => runAI(text)} disabled={loading || !text.trim()}>
                  {loading ? <><Loader2 size={14} className="spin" /> 分解中…</> : <><Sparkles size={14} /> AIでタスクに分解</>}
                </button>
              )}
            </>
          )}
        </div>

        {/* Manual add */}
        <div className="cap-manual-section">
          <div className="cap-section-label">手動で追加</div>
          <div className="cap-manual-row">
            <input
              className="cap-input" placeholder="タスクを直接追加…"
              value={manualTitle} onChange={e => setManualTitle(e.target.value)}
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
                <div className="cap-draft-header">
                  <input className="cap-draft-title-input" value={d.title}
                    onChange={e => updateDraft(i, { title: e.target.value })} placeholder="タスク名" />
                  <button className="cap-expand-btn" onClick={() => updateDraft(i, { expanded: !d.expanded })}>
                    {d.expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button className="cap-remove-btn" onClick={() => removeDraft(i)}><X size={13} /></button>
                </div>
                {d.expanded && (
                  <div className="cap-draft-body">
                    <div className="cap-field">
                      <label className="cap-field-label">完了の定義（これができたら終わり）</label>
                      <input className="cap-field-input cap-dod-input" value={d.definitionOfDone}
                        onChange={e => updateDraft(i, { definitionOfDone: e.target.value })}
                        placeholder="例：〇〇さんに返信済み / 方針を1行でまとめた" />
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
