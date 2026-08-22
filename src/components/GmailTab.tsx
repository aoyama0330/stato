import { useState, useEffect } from 'react';
import { Loader2, Mail, RefreshCw, LogOut, Sparkles, AlertCircle } from 'lucide-react';
import type { GmailMessage } from '../lib/gmail';
import { getGmailToken, requestGmailToken, fetchImportantEmails, clearGmailToken } from '../lib/gmail';

interface Props {
  clientId: string;
  onAnalyze: (text: string) => void;
  analyzing: boolean;
  onOpenSettings: () => void;
}

export default function GmailTab({ clientId, onAnalyze, analyzing, onOpenSettings }: Props) {
  const [token, setToken] = useState<string | null>(getGmailToken());
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) loadEmails(token);
  }, [token]);

  const handleConnect = async () => {
    if (!clientId) return;
    setError('');
    try {
      const t = await requestGmailToken(clientId);
      setToken(t);
    } catch (e) {
      setError('Googleアカウントへの接続に失敗しました。');
    }
  };

  const loadEmails = async (t: string) => {
    setLoading(true);
    setError('');
    try {
      const msgs = await fetchImportantEmails(t);
      setEmails(msgs);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'UNAUTHORIZED') {
        clearGmailToken();
        setToken(null);
        setEmails([]);
        setError('セッションが切れました。再接続してください。');
      } else {
        setError('メールの取得に失敗しました。');
      }
    }
    setLoading(false);
  };

  const handleDisconnect = () => {
    clearGmailToken();
    setToken(null);
    setEmails([]);
  };

  const toggleSelect = (id: string) =>
    setEmails(prev => prev.map(m => m.id === id ? { ...m, selected: !m.selected } : m));

  const handleAnalyze = () => {
    const selected = emails.filter(m => m.selected);
    if (selected.length === 0) return;
    const text = selected.map(m =>
      `件名：${m.subject}\nFrom：${m.from}\n---\n${m.body}`
    ).join('\n\n===\n\n');
    onAnalyze(text);
  };

  const selectedCount = emails.filter(m => m.selected).length;

  // Client ID未設定
  if (!clientId) {
    return (
      <div className="gmail-setup">
        <Mail size={32} className="gmail-setup-icon" />
        <p className="gmail-setup-text">Gmail連携にはGoogle Client IDが必要です。</p>
        <button className="gmail-setup-btn" onClick={onOpenSettings}>設定で入力する →</button>
      </div>
    );
  }

  // 未接続
  if (!token) {
    return (
      <div className="gmail-connect">
        <Mail size={32} className="gmail-connect-icon" />
        <p className="gmail-connect-text">Googleアカウントに接続すると、重要度の高い未読メールを自動取得します。</p>
        {error && <p className="gmail-error"><AlertCircle size={13} /> {error}</p>}
        <button className="gmail-connect-btn" onClick={handleConnect}>
          <Mail size={15} /> Gmailに接続
        </button>
      </div>
    );
  }

  // 接続済み
  return (
    <div className="gmail-panel">
      <div className="gmail-toolbar">
        <span className="gmail-toolbar-title">重要な未読メール（14日以内）</span>
        <button className="gmail-icon-btn" onClick={() => loadEmails(token)} disabled={loading} title="更新">
          <RefreshCw size={14} />
        </button>
        <button className="gmail-icon-btn" onClick={handleDisconnect} title="切断">
          <LogOut size={14} />
        </button>
      </div>

      {error && <p className="gmail-error"><AlertCircle size={13} /> {error}</p>}

      {loading ? (
        <div className="gmail-loading"><Loader2 size={18} className="spin" /> メールを取得中…</div>
      ) : emails.length === 0 ? (
        <div className="gmail-empty">重要な未読メールはありません</div>
      ) : (
        <>
          <div className="gmail-list">
            {emails.map(m => (
              <label key={m.id} className={`gmail-item${m.selected ? ' selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={m.selected}
                  onChange={() => toggleSelect(m.id)}
                  className="gmail-check"
                />
                <div className="gmail-item-body">
                  <div className="gmail-subject">{m.subject}</div>
                  <div className="gmail-from">{m.from.replace(/<.*>/, '').trim()}</div>
                  <div className="gmail-snippet">{m.body.slice(0, 80)}…</div>
                </div>
              </label>
            ))}
          </div>
          <button
            className="cap-ai-btn"
            onClick={handleAnalyze}
            disabled={analyzing || selectedCount === 0}
          >
            {analyzing
              ? <><Loader2 size={14} className="spin" /> 分解中…</>
              : <><Sparkles size={14} /> 選択した{selectedCount}件をAIで分析</>}
          </button>
        </>
      )}
    </div>
  );
}
