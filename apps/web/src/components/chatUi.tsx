import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const OPEN_KEY = 'inyalink.chatOpen';

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
