import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true); setError('');
    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error: e } = await fn;
    if (e) setError(e.message);
    setLoading(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">Stato</div>
        <p className="auth-sub">今の自分に合った仕事を、確実に完了へ。</p>
        <input className="auth-input" type="email" placeholder="メールアドレス"
          value={email} onChange={e => setEmail(e.target.value)} />
        <input className="auth-input" type="password" placeholder="パスワード"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handle()} />
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-btn" onClick={handle} disabled={loading}>
          {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '新規登録'}
        </button>
        <button className="auth-toggle" onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? '新規登録はこちら' : 'ログインはこちら'}
        </button>
      </div>
    </div>
  );
}
