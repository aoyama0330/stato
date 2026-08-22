import { useState } from 'react';
import { Plus, Zap, Clock, ArrowRight, Pencil } from 'lucide-react';
import type { Task, EnergyLevel, CheckIn } from '../types/task';
import { TAG_META, ENERGY_META, ENERGY_COMPATIBLE } from '../types/task';
import TaskEditModal from './TaskEditModal';

interface Props {
  checkin: CheckIn;
  tasks: Task[];
  onStartTask: (task: Task) => void;
  onCapture: () => void;
  onUpdateTask: (updated: Task) => void;
  onDeleteTask: (id: string) => void;
}

export default function MainView({ checkin, tasks, onStartTask, onCapture, onUpdateTask, onDeleteTask }: Props) {
  const [showBypassed, setShowBypassed] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const energy: EnergyLevel = checkin.energyLevel;
  const compatible = ENERGY_COMPATIBLE[energy];

  const available = tasks.filter(t =>
    (t.status === 'ready' || t.status === 'captured') && compatible.includes(t.energyTag)
  );
  const bypassed = tasks.filter(t =>
    (t.status === 'ready' || t.status === 'captured') && !compatible.includes(t.energyTag)
  );

  const energyMeta = ENERGY_META[energy];

  return (
    <div className="main-view">
      {/* Check-in summary bar */}
      <div className="mv-checkin-bar" style={{ background: energyMeta.bg, borderColor: energyMeta.color }}>
        <span className="mv-energy-label">
          <span className="mv-emoji">{energyMeta.emoji}</span>
          {energyMeta.label}
        </span>
        {checkin.intention && <span className="mv-intention">「{checkin.intention}」</span>}
        {checkin.strategy && <p className="mv-strategy">{checkin.strategy}</p>}
      </div>

      {/* Available tasks */}
      <div className="mv-section">
        <div className="mv-section-header">
          <span className="mv-section-title">今できること</span>
          <span className="mv-count">{available.length}件</span>
        </div>
        {available.length === 0 ? (
          <div className="mv-empty">
            <p>タスクがありません。<br />右下のボタンから追加しましょう。</p>
          </div>
        ) : (
          <div className="mv-task-list">
            {available.map(task => (
              <TaskCard key={task.id} task={task}
                onStart={() => onStartTask(task)}
                onEdit={() => setEditingTask(task)} />
            ))}
          </div>
        )}
      </div>

      {/* Bypassed tasks */}
      {bypassed.length > 0 && (
        <div className="mv-section mv-bypassed-section">
          <button className="mv-bypass-toggle" onClick={() => setShowBypassed(v => !v)}>
            <Zap size={14} />
            今のエネルギーには重いタスク（{bypassed.length}件）
            <span className={`mv-toggle-arrow${showBypassed ? ' open' : ''}`}>▸</span>
          </button>
          {showBypassed && (
            <div className="mv-task-list mv-dimmed">
              {bypassed.map(task => (
                <TaskCard key={task.id} task={task}
                  onStart={() => onStartTask(task)}
                  onEdit={() => setEditingTask(task)}
                  bypassed />
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button className="mv-fab" onClick={onCapture} aria-label="タスクを追加">
        <Plus size={22} />
      </button>

      {/* Edit modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onSave={updated => { onUpdateTask(updated); setEditingTask(null); }}
          onDelete={id => { onDeleteTask(id); setEditingTask(null); }}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}

interface CardProps {
  task: Task;
  onStart: () => void;
  onEdit: () => void;
  bypassed?: boolean;
}

function TaskCard({ task, onStart, onEdit, bypassed }: CardProps) {
  const tag = TAG_META[task.energyTag];
  return (
    <div className={`mv-task-card${bypassed ? ' bypassed' : ''}`}>
      <div className="mv-card-top">
        <span className="mv-tag-badge" style={{ background: tag.bg, color: tag.color }}>
          {tag.emoji} {tag.label}
        </span>
        {task.timeboxMinutes && (
          <span className="mv-timebox"><Clock size={11} /> {task.timeboxMinutes}分</span>
        )}
        <button className="mv-edit-btn" onClick={onEdit}><Pencil size={13} /></button>
      </div>
      <div className="mv-card-title">{task.title}</div>
      {task.definitionOfDone && <div className="mv-card-dod">✓ {task.definitionOfDone}</div>}
      {task.description && <div className="mv-card-desc">{task.description}</div>}
      <button className="mv-start-btn" onClick={onStart}>
        はじめる <ArrowRight size={13} />
      </button>
    </div>
  );
}
