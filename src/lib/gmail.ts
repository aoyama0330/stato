declare const google: {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (resp: { access_token?: string; error?: string }) => void;
      }) => { requestAccessToken: () => void };
      revoke: (token: string, cb: () => void) => void;
    };
  };
};

const TOKEN_KEY = 'stato-gmail-token';
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

export function getGmailToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearGmailToken() {
  const token = getGmailToken();
  if (token && typeof google !== 'undefined') {
    google.accounts.oauth2.revoke(token, () => {});
  }
  sessionStorage.removeItem(TOKEN_KEY);
}

export function requestGmailToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof google === 'undefined') {
      reject(new Error('Google Identity Services が読み込まれていません'));
      return;
    }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: resp => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error ?? '認証失敗'));
          return;
        }
        sessionStorage.setItem(TOKEN_KEY, resp.access_token);
        resolve(resp.access_token);
      },
    });
    client.requestAccessToken();
  });
}

export interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  body: string;
  selected: boolean;
}

function decodeBase64Utf8(data: string): string {
  const binary = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function extractBody(payload: Record<string, unknown>): string {
  if (payload.mimeType === 'text/plain') {
    const data = (payload.body as Record<string, string>)?.data;
    if (data) return decodeBase64Utf8(data);
  }
  const parts = payload.parts as Record<string, unknown>[] | undefined;
  if (parts) {
    for (const part of parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }
  return (payload.snippet as string) ?? '';
}

export async function fetchImportantEmails(token: string, maxResults = 15): Promise<GmailMessage[]> {
  const query = 'is:unread is:important newer_than:14d';
  const listRes = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok) {
    if (listRes.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error('Gmail API エラー');
  }
  const listData = await listRes.json() as { messages?: { id: string }[] };
  if (!listData.messages || listData.messages.length === 0) return [];

  const messages = await Promise.all(
    listData.messages.map(async msg => {
      const res = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json() as {
        payload: Record<string, unknown>;
        snippet: string;
      };
      const headers = (data.payload?.headers as { name: string; value: string }[]) ?? [];
      const get = (name: string) => headers.find(h => h.name === name)?.value ?? '';
      const body = extractBody(data.payload) || data.snippet;
      return {
        id: msg.id,
        subject: get('Subject') || '(件名なし)',
        from: get('From'),
        date: get('Date'),
        body: body.slice(0, 3000),
        selected: true,
      } satisfies GmailMessage;
    })
  );
  return messages;
}
