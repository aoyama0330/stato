import type { Task, CheckIn } from '../types/task';
import { ENERGY_META, TAG_META } from '../types/task';

interface Props {
  tasks: Task[];
  checkins: CheckIn[];
}

export default function SummaryView({ tasks, checkins }: Props) {
  const completed = tasks.filter(t => t.status === 'completed');
  const totalMin = completed.reduce((s, t) => s + (t.actualMinutes ?? 0), 0);

  // Group by day (last 7 days)
  const days: Record<string, { completed: Task[]; partial: Task[] }> = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    days[key] = { completed: [], partial: [] };
  }
  tasks.forEach(t => {
    const dateStr = t.completedAt?.slice(0, 10);
    if (dateStr && days[dateStr]) {
      if (t.status === 'completed') days[dateStr].completed.push(t);
      else if (t.status === 'partial') days[dateStr].partial.push(t);
    }
  });

  // Energy pattern from checkins
  const energyCounts: Record<string, number> = {};
  checkins.forEach(c => {
    energyCounts[c.energyLevel] = (energyCounts[c.energyLevel] ?? 0) + 1;
  });
  const topEnergy = Object.entries(energyCounts).sort((a, b) => b[1] - a[1])[0];

  // Tag breakdown
  const tagCounts: Record<string, number> = {};
  completed.forEach(t => {
    tagCounts[t.energyTag] = (tagCounts[t.energyTag] ?? 0) + 1;
  });

  const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="summary-view">
      <h2 className="sv-title">今週のサマリー</h2>

      {/* Stats */}
      <div className="sv-stats">
        <div className="sv-stat-card">
          <div className="sv-stat-num">{completed.length}</div>
          <div className="sv-stat-label">完了タスク</div>
        </div>
        <div className="sv-stat-card">
          <div className="sv-stat-num">{totalMin}</div>
          <div className="sv-stat-label">作業時間（分）</div>
        </div>
        <div className="sv-stat-card">
          <div className="sv-stat-num">{checkins.length}</div>
          <div className="sv-stat-label">チェックイン</div>
        </div>
      </div>

      {/* Daily bar chart */}
      <div className="sv-section">
        <div className="sv-section-title">日別完了数</div>
        <div className="sv-bars">
          {Object.entries(days).map(([date, data]) => {
            const d = new Date(date + 'T00:00:00');
            const total = data.completed.length + data.partial.length;
            const maxCount = Math.max(...Object.values(days).map(v => v.completed.length + v.partial.length), 1);
            return (
              <div key={date} className="sv-bar-col">
                <div className="sv-bar-wrap">
                  <div className="sv-bar" style={{ height: `${(total / maxCount) * 100}%` }}>
                    {data.partial.length > 0 && (
                      <div className="sv-bar-partial" style={{ height: `${(data.partial.length / total) * 100}%` }} />
                    )}
                  </div>
                </div>
                <div className="sv-bar-label">{DAY_LABELS[d.getDay()]}</div>
                <div className="sv-bar-count">{total > 0 ? total : ''}</div>
              </div>
            );
          })}
        </div>
        <div className="sv-bar-legend">
          <span className="sv-legend-dot completed" />完了
          <span className="sv-legend-dot partial" />途中
        </div>
      </div>

      {/* Energy pattern */}
      {topEnergy && (
        <div className="sv-section">
          <div className="sv-section-title">エネルギーパターン</div>
          <div className="sv-energy-list">
            {Object.entries(energyCounts).sort((a, b) => b[1] - a[1]).map(([level, count]) => {
              const m = ENERGY_META[level as keyof typeof ENERGY_META];
              return (
                <div key={level} className="sv-energy-row">
                  <span className="sv-energy-emoji">{m.emoji}</span>
                  <span className="sv-energy-name">{m.label}</span>
                  <div className="sv-energy-bar-wrap">
                    <div className="sv-energy-bar" style={{
                      width: `${(count / (topEnergy[1])) * 100}%`,
                      background: m.color,
                    }} />
                  </div>
                  <span className="sv-energy-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tag breakdown */}
      {Object.keys(tagCounts).length > 0 && (
        <div className="sv-section">
          <div className="sv-section-title">完了タスクの種類</div>
          <div className="sv-tags">
            {Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => {
              const m = TAG_META[tag as keyof typeof TAG_META];
              return (
                <div key={tag} className="sv-tag-chip" style={{ background: m.bg, color: m.color }}>
                  {m.emoji} {m.label} <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed tasks list */}
      {completed.length > 0 && (
        <div className="sv-section">
          <div className="sv-section-title">完了した仕事 🎉</div>
          <div className="sv-completed-list">
            {completed.map(t => (
              <div key={t.id} className="sv-completed-item">
                <span className="sv-completed-title">{t.title}</span>
                {t.actualMinutes && <span className="sv-completed-time">{t.actualMinutes}分</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
