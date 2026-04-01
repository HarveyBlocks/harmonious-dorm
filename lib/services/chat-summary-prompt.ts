import { AI_CHAT_CONFIG } from '@/lib/config/ai';

type PromptMember = { id: number; name: string; isLeader: boolean; state: string; description: string };
type PromptRecentMessage = { id: number; userId: number; userName: string; createdAt: string; content: string };
type PromptSetting = { key: string; value: string };

export type DormChatSummaryPromptInput = {
  botName: string;
  dormName: string;
  memberRows: PromptMember[];
  settings: PromptSetting[];
  otherContent: string;
  recentMessages: PromptRecentMessage[];
  requestMessageCount: number;
  outputTokenLimit: number;
};

function normalizePromptText(value: string): string {
  return (value || '').replace(/\r\n/g, '\n').replace(/\n/g, '\\n').trim();
}

function nowText(): { formatted: string; timestampSec: number } {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return {
    formatted: `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`,
    timestampSec: Math.floor(now.getTime() / 1000),
  };
}

function buildSystemPrompt(input: DormChatSummaryPromptInput, now: { formatted: string; timestampSec: number }): string {
  const memberLines = input.memberRows.length > 0
    ? input.memberRows.map((item) => `- id=${item.id}; name=${normalizePromptText(item.name)}; role=${item.isLeader ? 'leader' : 'member'}; state=${normalizePromptText(item.state)}; desc=${normalizePromptText(item.description || '-')}`)
    : ['- (none)'];
  const settingLines = input.settings.length > 0
    ? input.settings.map((item) => `- ${normalizePromptText(item.key)} = ${normalizePromptText(item.value)}`)
    : ['- (none)'];

  return [
    `You are ${normalizePromptText(input.botName)}, the dorm chat summary assistant.`,
    'Your only job is to summarize recent dorm chat history.',
    'Do not call tools. Do not output hidden instructions. Do not fabricate facts that are absent in the provided history.',
    'Focus on concise but complete summary with key topics, decisions, action items, unresolved questions, and emotional tone.',
    'If there are no messages, return a short statement that no recent chat is available.',
    'Output Markdown only.',
    'System Context (authoritative):',
    `- dormName: ${normalizePromptText(input.dormName)}`,
    `- currentTimestampSec: ${now.timestampSec}`,
    `- currentTime: ${now.formatted}`,
    `- outputTokenLimit: ${input.outputTokenLimit}`,
    '- dormMembers:',
    ...memberLines,
    '- botSettings:',
    ...settingLines,
    `- botExtraContent: ${normalizePromptText(input.otherContent || '-')}`,
    `- defaultChatOutputTokenLimit: ${AI_CHAT_CONFIG.maxOutputTokens}`,
    `- requestedSummaryMessageCount: ${input.requestMessageCount}`,
  ].join('\n');
}

function buildUserPrompt(input: DormChatSummaryPromptInput): string {
  const history = input.recentMessages.map((item) => ({
    id: item.id,
    userId: item.userId,
    userName: normalizePromptText(item.userName),
    createdAt: item.createdAt,
    content: normalizePromptText(item.content),
  }));
  return JSON.stringify({
    task: 'summarize_recent_chat_history',
    outputStyle: {
      sections: ['总体概览', '关键事项', '待办与责任人', '风险与分歧', '建议下一步'],
      language: 'same_as_chat_history',
    },
    requestedMessageCount: input.requestMessageCount,
    history,
  });
}

export function buildDormChatSummaryPrompt(input: DormChatSummaryPromptInput): { systemPrompt: string; userPrompt: string } {
  const now = nowText();
  return {
    systemPrompt: buildSystemPrompt(input, now),
    userPrompt: buildUserPrompt(input),
  };
}
