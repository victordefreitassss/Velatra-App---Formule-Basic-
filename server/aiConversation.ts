export interface StoredAIMessage {
  role: 'user' | 'model';
  text: string;
}

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 3500;

export function parseAIConversation(value: unknown): StoredAIMessage[] | null {
  if (!Array.isArray(value) || value.length > MAX_MESSAGES) return null;
  const messages: StoredAIMessage[] = [];

  for (const messageValue of value) {
    if (!messageValue || typeof messageValue !== 'object') return null;
    const item = messageValue as Record<string, unknown>;
    if (item.role !== 'user' && item.role !== 'model') return null;
    if (typeof item.text !== 'string') return null;
    const text = item.text.replace(/\u0000/g, '').trim();
    if (!text || text.length > MAX_MESSAGE_LENGTH) return null;
    messages.push({ role: item.role, text });
  }
  return messages;
}
