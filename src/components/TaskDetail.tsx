import { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, CheckCircle, Share2, Loader2, RotateCcw, SkipForward } from 'lucide-react';
import type { Task } from '../types/task';
import { TAG_META } from '../types/task';
import { updateTask } from '../lib/db';
import { generateShareMessage } from '../lib/claude';

interface Props {
  task: Task;
  apiKey: string;
  onDone: (updated: Task) => void;
  onBack: () => void;
}

export default function TaskDetail({ task, apiKey, onDone, onBack }: Props) {
  const [dod, setDod] = useState(task.definitionOfDone || '');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [partial, setPartial] = useState(false);
  const [shareMsg, setShareMsg] = useState(task.shareMessage || '');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tag = TAG_META[task.energyTag];
  const timebox = (task.timeboxMinutes ?? 25) * 60;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const progress = Math.min(elapsed / timebox, 1);
  const overTime = elapsed > timebox;

  const handleGenerateShare = async () => {
    if (!apiKey) return;
    setGenerating(true);
    try {
      const updated = { ...task, definitionOfDone: dod, actualMinutes: Math.round(elapsed / 60) };
      const msg = await generateShareMessage(updated, apiKey);
      setShareMsg(msg);
    } catch {}
    setGenerating(false);
  };

  const handleComplete = async (status: 'completed' | 'partial') => {
    setSaving(true);
    const now = new Date().toISOString();
    const updated = await updateTask(task.id, {
      definitionOfDone: dod,
      status,
      actualMinutes: Math.round(elapsed / 60),
      shareMessage: shareMsg || null,
      sharedAt: shareMsg ? now : null,
      completedAt: now,
    });
    setSaving(false);
    if (status === 'completed') setDone(true);
    else setPartial(true);
    onDone(updated);
  };

  const handleBypass = async () => {
    setSaving(true);
    const updated = await updateTask(task.id, {
      status: 'bypassed',
      bypassedAt: new Date().toISOString(),
    });
    setSaving(false);
    onDone(updated);
  };

  if (done || partial) {
    return (
      <div className="td-screen">
        <div className="td-done-card">
          <div className="td-done-emoji">{done ? '🎉' : '💪'}</div>
          <div className="td-done-title">{done ? '完了！' : '今日はここまで'}</div>
          <div className="td-done-task">{task.title}</div>
          {elapsed > 0 && <div className="td-done-time">{Math.round(elapsed / 60)}分で作業</div>}
          <button className="td-back-btn" onClick={onBack}>タスク一覧に戻る</button>
        </div>
      </div>
    );
  }

  return (
    <div className="td-screen">
      <div className="td-inner">
        {/* Header */}
        <div className="td-header">
          <button className="td-back-icon" onClick={onBack}><X size={18} /></button>
          <span className="td-tag" style={{ background: tag.bg, color: tag.color }}>
            {tag.emoji} {tag.label}
          </span>
        </div>

        <h2 className="td-title">{task.title}</h2>
        {task.description && <p className="td-desc">{task.description}</p>}

        {/* Definition of Done */}
        <div className="td-section">
          <label className="td-label">完了の定義（DoD）</label>
          <input
            className="td-dod-input"
            placeholder="何ができたら「終わり」ですか？"
            value={dod}
            onChange={e => setDod(e.target.value)}
          />
        </div>

        {/* Timer */}
        <div className="td-timer-section">
          <div className={`td-timer-ring${overTime ? ' overtime' : ''}`}>
            <svg viewBox="0 0 100 100" className="td-ring-svg">
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke={overTime ? '#E05050' : 'var(--accent)'}
                strokeWidth="8"
                strokeDasharray={`${276 * progress} 276`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dasharray 1s linear' }}
              />
            </svg>
            <div className="td-timer-inner">
              <div className={`td-time-display${overTime ? ' overtime' : ''}`}>{fmt(elapsed)}</div>
              <div className="td-timebox-label">/ {task.timeboxMinutes ?? 25}分</div>
            </div>
          </div>
          {overTime && <div className="td-overtime-note">タイムボックス超過。今の進捗で「完了」にするのもOKです。</div>}
          <div className="td-timer-controls">
            <button className="td-ctrl-btn" onClick={() => setRunning(r => !r)}>
              {running ? <><Pause size={16} /> 一時停止</> : <><Play size={16} /> {elapsed === 0 ? 'スタート' : '再開'}</>}
            </button>
            <button className="td-ctrl-btn secondary" onClick={() => { setRunning(false); setElapsed(0); }}>
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Share */}
        {apiKey && (
          <div className="td-section">
            <div className="td-label-row">
              <label className="td-label">チーム共有メッセージ（任意）</label>
              <button className="td-gen-btn" onClick={handleGenerateShare} disabled={generating}>
                {generating ? <Loader2 size={13} className="spin" /> : <Share2 size={13} />}
                生成
              </button>
            </div>
            <textarea
              className="td-share-input"
              rows={3}
              placeholder="AIが完了報告メッセージを作成します"
              value={shareMsg}
              onChange={e => setShareMsg(e.target.value)}
            />
          </div>
        )}

        {/* Actions */}
        <div className="td-actions">
          <button className="td-complete-btn" onClick={() => handleComplete('completed')} disabled={saving}>
            {saving ? <Loader2 size={15} className="spin" /> : <CheckCircle size={15} />}
            完了にする
          </button>
          <button className="td-partial-btn" onClick={() => handleComplete('partial')} disabled={saving}>
            今日はここまで
          </button>
          <button className="td-bypass-btn" onClick={handleBypass} disabled={saving}>
            <SkipForward size={13} /> 後回し
          </button>
        </div>
      </div>
    </div>
  );
}
