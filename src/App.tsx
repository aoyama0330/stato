import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { fetchTodayCheckin, fetchTasks, insertTask, fetchWeeklyCheckins } from './lib/db';
import { loadApiKey, saveApiKey, loadGmailClientId, saveGmailClientId } from './lib/storage';
import type { Task, CheckIn } from './types/task';
import Auth from './components/Auth';
import CheckInScreen from './components/CheckIn';
import MainView from './components/MainView';
import TaskDetail from './components/TaskDetail';
import Capture from './components/Capture';
import SummaryView from './components/SummaryView';
import { BarChart2, ListChecks, Settings, X } from 'lucide-react';

type Screen = 'checkin' | 'main' | 'detail' | 'summary';

export default function App() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [checkin, setCheckin] = useState<CheckIn | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [screen, setScreen] = useState<Screen>('checkin');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [apiKey, setApiKey] = useState(loadApiKey());
  const [gmailClientId, setGmailClientId] = useState(loadGmailClientId());
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id } : null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ? { id: session.user.id } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchTodayCheckin().then(c => {
      if (c) { setCheckin(c); setScreen('main'); }
    });
    fetchTasks().then(setTasks);
    fetchWeeklyCheckins().then(setCheckins);
  }, [user]);

  const handleCheckinDone = (c: CheckIn) => {
    setCheckin(c);
    setScreen('main');
  };

  const handleStartTask = (task: Task) => {
    setActiveTask(task);
    setScreen('detail');
  };

  const handleTaskDone = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setActiveTask(null);
    setScreen('main');
  };

  const handleAddTasks = async (newTasks: Task[]) => {
    const saved = await Promise.all(newTasks.map(t => insertTask(t)));
    setTasks(prev => [...prev, ...saved]);
  };

  const handleSaveSettings = (apiK: string, gmailK: string) => {
    saveApiKey(apiK);
    saveGmailClientId(gmailK);
    setApiKey(apiK);
    setGmailClientId(gmailK);
    setShowSettings(false);
  };

  if (loading) return <div className="app-loading">読み込み中…</div>;
  if (!user) return <Auth />;

  const ready = tasks.filter(t => t.status === 'ready' || t.status === 'captured');

  return (
    <div className="app">
      {/* Top nav */}
      <header className="app-header">
        <div className="app-logo">Stato</div>
        <nav className="app-nav">
          <button
            className={`app-nav-btn${screen === 'main' || screen === 'detail' ? ' active' : ''}`}
            onClick={() => setScreen(activeTask ? 'detail' : 'main')}
          >
            <ListChecks size={16} />
            <span>タスク</span>
          </button>
          <button
            className={`app-nav-btn${screen === 'summary' ? ' active' : ''}`}
            onClick={() => setScreen('summary')}
          >
            <BarChart2 size={16} />
            <span>サマリー</span>
          </button>
          <button className="app-nav-btn" onClick={() => setShowSettings(true)}>
            <Settings size={16} />
            <span>設定</span>
          </button>
        </nav>
      </header>

      {/* Main content */}
      <main className="app-main">
        {screen === 'checkin' && (
          <CheckInScreen tasks={tasks} apiKey={apiKey} onDone={handleCheckinDone} />
        )}
        {(screen === 'main') && checkin && (
          <MainView
            checkin={checkin}
            tasks={ready}
            onStartTask={handleStartTask}
            onCapture={() => setShowCapture(true)}
          />
        )}
        {screen === 'detail' && activeTask && (
          <TaskDetail
            task={activeTask}
            apiKey={apiKey}
            onDone={handleTaskDone}
            onBack={() => setScreen('main')}
          />
        )}
        {screen === 'summary' && (
          <SummaryView tasks={tasks} checkins={checkins} />
        )}
      </main>

      {/* Capture modal */}
      {showCapture && (
        <Capture
          apiKey={apiKey}
          gmailClientId={gmailClientId}
          onAdd={handleAddTasks}
          onClose={() => setShowCapture(false)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel
          apiKey={apiKey}
          gmailClientId={gmailClientId}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
          onSignOut={() => supabase.auth.signOut()}
        />
      )}
    </div>
  );
}

function SettingsPanel({ apiKey, gmailClientId, onSave, onClose, onSignOut }: {
  apiKey: string;
  gmailClientId: string;
  onSave: (apiKey: string, gmailClientId: string) => void;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const [key, setKey] = useState(apiKey);
  const [gmailKey, setGmailKey] = useState(gmailClientId);
  return (
    <div className="settings-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel">
        <div className="settings-header">
          <span>設定</span>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="settings-section">
          <label className="settings-label">Claude API キー</label>
          <input className="settings-input" type="password" placeholder="sk-ant-..."
            value={key} onChange={e => setKey(e.target.value)} />
          <p className="settings-hint">AI分解・作戦生成・共有メッセージに使用します。</p>
        </div>
        <div className="settings-section">
          <label className="settings-label">Google OAuth Client ID（Gmail連携）</label>
          <input className="settings-input" type="text" placeholder="xxxx.apps.googleusercontent.com"
            value={gmailKey} onChange={e => setGmailKey(e.target.value)} />
          <p className="settings-hint">
            Google Cloud ConsoleでGmail APIを有効化し、OAuth 2.0クライアントIDを作成してください。<br />
            承認済みJavaScriptオリジンに <strong>https://stato-g2s0.onrender.com</strong> を追加してください。
          </p>
        </div>
        <button className="settings-save-btn" onClick={() => onSave(key, gmailKey)}>保存</button>
        <div className="settings-section">
          <button className="settings-signout-btn" onClick={onSignOut}>ログアウト</button>
        </div>
      </div>
    </div>
  );
}
