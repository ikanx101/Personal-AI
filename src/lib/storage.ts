export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Memory {
  id: string;
  content: string;
  createdAt: string;
  targetDate?: string;
}

export interface AppState {
  apiKey: string;
  memories: Memory[];
  messages: Message[];
}

const STORAGE_KEY = 'memorybot_state';

export const loadState = (): AppState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Migrate old string memories to object memories
      if (parsed.memories && parsed.memories.length > 0 && typeof parsed.memories[0] === 'string') {
        parsed.memories = parsed.memories.map((m: string, i: number) => ({
          id: Date.now().toString() + i,
          content: m,
          createdAt: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }),
        }));
      }
      return parsed;
    } catch (e) {
      console.error('Failed to parse stored state', e);
    }
  }
  return {
    apiKey: '',
    memories: [],
    messages: [],
  };
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
