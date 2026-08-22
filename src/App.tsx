import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { fetchTodayCheckin, fetchTasks, insertTask, fetchWeeklyCheckins, deleteAllTasks } from './lib/db';
import { loadApiKey, saveApiKey, loadGmailClientId, saveGmailClientId, loadUserProfile, saveUserProfile } from './lib/storage';
import type { UserProfile } from './lib/storage';
import type { Task, CheckIn } from './types/task';
import Auth from './components/Auth';
import FlowCapture from './components/FlowCapture';
import CheckInScreen from './components/CheckIn';
import MainView from './components/MainView';
import TaskDetail from './components/TaskDetail';
import Capture from './components/Capture';
import SummaryView from './components/SummaryView';
import { BarChart2, ListChecks, Settings, X } from 'lucide-react';

type Screen = 'flow-capture' | 'checkin' | 'main' | 'detail' | 'summary';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export default function App() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [checkin, setCheckin] = useState<CheckIn | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [screen, setScreen] = useState<Screen>('flow-capture');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [apiKey, setApiKey] = useState(loadApiKey());
  const [gmailClientId, setGmailClientId] = useState(loadGmailClientId());
  const [profile, setProfile] = useState<UserProfile>(loadUserProfile());
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
      if (c) {
        setCheckin(c);
        // すでにチェックイン済みの場合、フロー完了済みとみなす
        const flowDoneDate = sessionStorage.getItem('stato-flow-done');
        if (flowDoneDate === todayKey()) setScreen('main');
        else setScreen('main');
      } else {
        // フロー未完了なら flow-capture から開始
        const flowDoneDate = sessionStorage.getItem('stato-flow-done');
        setScreen(flowDoneDate === todayKey() ? 'checkin' : 'flow-capture');
      }
    });
    fetchTasks().then(setTasks);
    fetchWeeklyCheckins().then(setCheckins);
  }, [user]);

  const handleFlowCaptureNext = async (newTasks: Task[]) => {
    sessionStorage.setItem('stato-flow-done', todayKey());
    if (newTasks.length > 0) {
      const saved = await Promise.all(newTasks.map(t => insertTask(t)));
      setTasks(prev => [...prev, ...saved]);
    }
    setScreen('checkin');
  };

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

  const handleUpdateTask = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleSaveSettings = (apiK: string, gmailK: string, prof: UserProfile) => {
    saveApiKey(apiK); saveGmailClientId(gmailK); saveUserProfile(prof);
    setApiKey(apiK); setGmailClientId(gmailK); setProfile(prof);
    setShowSettings(false);
  };

  if (loading) return <div className="app-loading">読み込み中…</div>;
  if (!user) return <Auth />;

  const ready = tasks.filter(t => t.status === 'ready' || t.status === 'captured');

  return (
    <div className="app">
      {/* Top nav — flow screens hide nav */}
      {screen !== 'flow-capture' && screen !== 'checkin' && (
        <header className="app-header">
          <div className="app-logo">Stato</div>
          <nav className="app-nav">
            <button className={`app-nav-btn${(screen === 'main' || screen === 'detail') ? ' active' : ''}`}
              onClick={() => setScreen(activeTask ? 'detail' : 'main')}>
              <ListChecks size={16} /><span>タスク</span>
            </button>
            <button className={`app-nav-btn${screen === 'summary' ? ' active' : ''}`}
              onClick={() => setScreen('summary')}>
              <BarChart2 size={16} /><span>サマリー</span>
            </button>
            <button className="app-nav-btn" onClick={() => setShowSettings(true)}>
              <Settings size={16} /><span>設定</span>
            </button>
          </nav>
        </header>
      )}

      <main className="app-main">
        {screen === 'flow-capture' && (
          <FlowCapture
            apiKey={apiKey}
            gmailClientId={gmailClientId}
            profile={profile}
            onNext={handleFlowCaptureNext}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}
        {screen === 'checkin' && (
          <CheckInScreen tasks={tasks} apiKey={apiKey} onDone={handleCheckinDone} />
        )}
        {screen === 'main' && checkin && (
          <MainView
            checkin={checkin}
            tasks={ready}
            onStartTask={handleStartTask}
            onCapture={() => setShowCapture(true)}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
        {screen === 'detail' && activeTask && (
          <TaskDetail task={activeTask} apiKey={apiKey} onDone={handleTaskDone} onBack={() => setScreen('main')} />
        )}
        {screen === 'summary' && (
          <SummaryView tasks={tasks} checkins={checkins} />
        )}
      </main>

      {showCapture && (
        <Capture
          apiKey={apiKey}
          gmailClientId={gmailClientId}
          onAdd={handleAddTasks}
          onClose={() => setShowCapture(false)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {showSettings && (
        <SettingsPanel
          apiKey={apiKey}
          gmailClientId={gmailClientId}
          profile={profile}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
          onSignOut={() => supabase.auth.signOut()}
          onDeleteAllTasks={async () => {
            await deleteAllTasks();
            setTasks([]);
            setCheckin(null);
            sessionStorage.removeItem('stato-flow-done');
            setShowSettings(false);
            setScreen('flow-capture');
          }}
        />
      )}
    </div>
  );
}

function SettingsPanel({ apiKey, gmailClientId, profile, onSave, onClose, onSignOut, onDeleteAllTasks }: {
  apiKey: string; gmailClientId: string; profile: UserProfile;
  onSave: (apiKey: string, gmailClientId: string, profile: UserProfile) => void;
  onClose: () => void; onSignOut: () => void;
  onDeleteAllTasks: () => void;
}) {
  const [key, setKey] = useState(apiKey);
  const [gmailKey, setGmailKey] = useState(gmailClientId);
  const [name, setName] = useState(profile.name);
  const [company, setCompany] = useState(profile.company);
  const [role, setRole] = useState(profile.role);

  return (
    <div className="settings-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel">
        <div className="settings-header">
          <span>設定</span>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="settings-section">
          <label className="settings-label">あなたの情報（AI抽出精度に使用）</label>
          <input className="settings-input" placeholder="名前（例：青山 優子）" value={name} onChange={e => setName(e.target.value)} />
          <input className="settings-input" placeholder="会社名（例：株式会社エスヨン）" value={company} onChange={e => setCompany(e.target.value)} />
          <input className="settings-input" placeholder="役職（例：代表取締役）" value={role} onChange={e => setRole(e.target.value)} />
        </div>
        <div className="settings-section">
          <label className="settings-label">Claude API キー</label>
          <input className="settings-input" type="password" placeholder="sk-ant-..." value={key} onChange={e => setKey(e.target.value)} />
          <p className="settings-hint">AI分解・作戦生成・共有メッセージに使用します。</p>
        </div>
        <div className="settings-section">
          <label className="settings-label">Google OAuth Client ID（Gmail連携）</label>
          <input className="settings-input" type="text" placeholder="xxxx.apps.googleusercontent.com" value={gmailKey} onChange={e => setGmailKey(e.target.value)} />
          <p className="settings-hint">承認済みJavaScriptオリジンに <strong>https://stato-g2s0.onrender.com</strong> を追加してください。</p>
        </div>
        <button className="settings-save-btn" onClick={() => onSave(key, gmailKey, { name, company, role })}>保存</button>
        <div className="settings-section">
          <button className="settings-reset-btn" onClick={onDeleteAllTasks}>
            全タスクを削除して最初からやり直す
          </button>
          <button className="settings-signout-btn" onClick={onSignOut}>ログアウト</button>
        </div>
      </div>
    </div>
  );
}
