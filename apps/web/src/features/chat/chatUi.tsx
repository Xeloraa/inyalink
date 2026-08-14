import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const OPEN_KEY = 'inyalink.chatOpen';

/** Shared bubble chrome — messaging + floating AI chat. */
export const CHAT_BUBBLE_OWN =
  'rounded-[18px_18px_6px_18px] bg-jade-600 text-white';
export const CHAT_BUBBLE_OTHER =
  'rounded-[18px_18px_18px_6px] bg-jade-50 text-ink-900';
export const CHAT_PANEL =
  'border border-line bg-white shadow-lg max-sm:rounded-none sm:rounded-xl2';
export const CHAT_COMPOSER =
  'rounded-xl2 border border-line bg-paper focus-within:border-jade-400 focus-within:shadow-focus';

type ChatUiValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const ChatUiContext = createContext<ChatUiValue | null>(null);

function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function ChatUiProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(readOpen);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    try {
      localStorage.setItem(OPEN_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ open, setOpen }), [open, setOpen]);

  return (
    <ChatUiContext.Provider value={value}>{children}</ChatUiContext.Provider>
  );
}

export function useChatUi(): ChatUiValue {
  const ctx = useContext(ChatUiContext);
  if (!ctx) throw new Error('useChatUi must be used within ChatUiProvider');
  return ctx;
}
