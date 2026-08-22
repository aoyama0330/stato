import Anthropic from '@anthropic-ai/sdk';
import type { EnergyLevel, EnergyTag, Task } from '../types/task';

const client = (apiKey: string) =>
  new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ── Capture → Task decomposition ─────────────────────────────

export interface DecomposedTask {
  title: string;
  description: string;
  definitionOfDone: string;
  energyTag: EnergyTag;
  timeboxMinutes: number;
}

export async function decomposeCapture(
  text: string,
  apiKey: string,
  profile?: { name: string; company: string; role: string },
): Promise<DecomposedTask[]> {
  const who = profile?.name
    ? `対象ユーザー：${profile.name}（${profile.company}${profile.role ? '・' + profile.role : ''}）\nこのユーザーが自分で対応すべきタスクのみを抽出してください。`
    : '';
  const res = await client(apiKey).messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `あなたはタスク分解アシスタントです。メール・議事録・メモなどの入力テキストから、具体的なアクションタスクを抽出し、JSON配列で返してください。

今日: ${localDate()}
${who}

各タスクのフィールド:
- title: 短いタイトル（30文字以内）
- description: 背景・目的の一言説明
- definitionOfDone: 「これができたら完了」という具体的な完了条件（例：「〇〇さんに返信済み」「資料をSlackに投稿した」「方針を1行でまとめた」）
- energyTag: "thinking"（企画・判断・文章作成）/ "social"（MTG・調整・交渉）/ "processing"（メール返信・書類・登録）/ "review"（確認・チェック・閲覧）
- timeboxMinutes: 想定作業時間（分）：15 / 25 / 45 / 60 / 90 / 120

注意：
- 「検討する」「確認する」など曖昧なタスクは、definitionOfDoneで具体的にゴールを明示してください
- 1つの大きな作業は複数タスクに分解してください
- 他の人への転送・CC情報など、このユーザーが実際に動く必要のないものは除外してください

JSONのみ返してください。`,
    messages: [{ role: 'user', content: text }],
  });
  const raw = res.content[0].type === 'text' ? res.content[0].text : '';
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  return JSON.parse(match[0]) as DecomposedTask[];
}

// ── Strategy generation ───────────────────────────────────────

export async function generateStrategy(
  energy: EnergyLevel,
  intention: string,
  tasks: Task[],
  apiKey: string,
): Promise<string> {
  const ENERGY_JP: Record<EnergyLevel, string> = {
    high: '頭がクリアで集中できる状態',
    medium: '普通・いつも通り動ける状態',
    low: '少し疲れているが手は動く状態',
    drained: 'ぼーっとして判断が難しい状態',
  };
  const taskList = tasks
    .filter(t => t.status === 'ready' || t.status === 'bypassed')
    .slice(0, 10)
    .map(t => `・${t.title}（${t.energyTag}、${t.timeboxMinutes ?? '?'}分）`)
    .join('\n');

  const res = await client(apiKey).messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `現在の状態：${ENERGY_JP[energy]}
今日やりたいこと：${intention || 'なし'}
タスク一覧：\n${taskList || 'なし'}

この状態に合った今日の作戦を、やさしく・前向きに・2〜3文で教えてください。`,
    }],
  });
  return res.content[0].type === 'text' ? res.content[0].text : '';
}

// ── Share message generation ──────────────────────────────────

export async function generateShareMessage(task: Task, apiKey: string): Promise<string> {
  const res = await client(apiKey).messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `タスク名：${task.title}
完了の定義：${task.definitionOfDone}
実際の作業時間：${task.actualMinutes ?? '不明'}分

このタスクの完了をチームに共有するための一言メッセージを作ってください。
形式：「【完了】タスク名：状況説明」
ビジネスメッセージとして自然な日本語で、2〜3文程度。`,
    }],
  });
  return res.content[0].type === 'text' ? res.content[0].text : '';
}
