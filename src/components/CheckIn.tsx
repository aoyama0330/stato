import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { EnergyLevel, CheckIn, Task } from '../types/task';
import { ENERGY_META } from '../types/task';
import { insertCheckin } from '../lib/db';
import { generateStrategy } from '../lib/claude';

interface Props {
  tasks: Task[];
  apiKey: string;
  onDone: (checkin: CheckIn) => void;
}

const OPTIONS: EnergyLevel[] = ['high', 'medium', 'low', 'drained'];

export default function CheckIn({ tasks, apiKey, onDone }: Props) {
  const [selected, setSelected] = useState<EnergyLevel | null>(null);
  const [intention, setIntention] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!selected) return;
    setLoading(true);
    let strategy = '';
    if (apiKey) {
      try { strategy = await generateStrategy(selected, intention, tasks, apiKey); } catch {}
    }
    const checkin = await insertCheckin({ energyLevel: selected, intention: intention || null, strategy: strategy || null });
    setLoading(false);
    onDone(checkin);
  };

  return (
    <div className="checkin-screen">
      <div className="checkin-inner">
        <h1 className="checkin-title">今の状態は？</h1>
        <p className="checkin-sub">正直に選んでください。判断しません。</p>

        <div className="checkin-options">
          {OPTIONS.map(level => {
            const m = ENERGY_META[level];
            return (
              <button
                key={level}
                className={`checkin-option${selected === level ? ' selected' : ''}`}
                style={selected === level ? { borderColor: m.color, background: m.bg } : {}}
                onClick={() => setSelected(level)}
              >
                <span className="co-emoji">{m.emoji}</span>
                <span className="co-label">{m.label}</span>
                <span className="co-sub">{m.sub}</span>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="checkin-intention">
            <label className="ci-label">今日やりきりたいこと（任意）</label>
            <input
              className="ci-input"
              type="text"
              placeholder="例：ISM改修の方針を決める"
              value={intention}
              onChange={e => setIntention(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleStart()}
            />
          </div>
        )}

        <button
          className="checkin-start-btn"
          disabled={!selected || loading}
          onClick={handleStart}
        >
          {loading
            ? <><Loader2 size={16} className="spin" /> 作戦を立てています…</>
            : '今日をはじめる →'}
        </button>
      </div>
    </div>
  );
}
