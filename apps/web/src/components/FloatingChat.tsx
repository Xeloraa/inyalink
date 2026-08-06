import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoFlow } from '../lib/demoFlow';
import { useI18n } from '../lib/i18n';
import { ChatBubble } from './ChatBubble';

const OPEN_KEY = 'inyalink.chatOpen';

type ChatUiValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
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

  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  const value = useMemo(
    () => ({ open, setOpen, toggle }),
    [open, setOpen, toggle],
  );

  return (
    <ChatUiContext.Provider value={value}>{children}</ChatUiContext.Provider>
  );
}

function useChatUi(): ChatUiValue {
  const ctx = useContext(ChatUiContext);
  if (!ctx) throw new Error('useChatUi must be used within ChatUiProvider');
  return ctx;
}

function ChatIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 9h8" />
      <path d="M8 13h5" />
      <path d="M4 19.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 3.5z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

const SEED_THREAD = [
  {
    role: 'ai' as const,
    content: 'မင်္ဂလာပါ။ သင့်ရည်မှန်းချက်ကို ပြောပြပါ — မြန်မာ သို့မဟုတ် အင်္ဂလိပ်။',
  },
];

export function FloatingChat() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { open, setOpen, toggle } = useChatUi();
  const { messages, setMessages, startFromInput } = useDemoFlow();
  const [draft, setDraft] = useState('');

  const thread =
    messages.length > 0
      ? messages.map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('ai' as const),
          content: m.content,
        }))
      : SEED_THREAD;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  function onSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (messages.length === 0) {
      const route = startFromInput(text);
      setDraft('');
      setOpen(false);
      void navigate(route);
      return;
    }
    setMessages([...messages, { role: 'user', content: text }]);
    setDraft('');
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="floating-chat-panel"
        className="tap-target fixed bottom-5 right-5 z-40 inline-flex items-center justify-center rounded-full bg-jade-600 text-white shadow-md transition-[background-color,transform] duration-fast ease-out hover:bg-jade-400 hover:shadow-lg focus-visible:shadow-focus active:scale-95 active:bg-jade-800 md:bottom-8 md:right-8"
      >
        <span className="sr-only">{t('chat.open')}</span>
        <ChatIcon />
      </button>

      {open ? (
        <div
          id="floating-chat-panel"
          role="dialog"
          aria-label={t('chat.title')}
          className="fixed inset-0 z-50 flex flex-col bg-white md:inset-auto md:bottom-24 md:right-8 md:h-[min(560px,70vh)] md:w-[380px] md:overflow-hidden md:rounded-xl md:border md:border-line md:shadow-lg"
        >
          <header className="flex items-center justify-between border-b border-line-soft px-lg py-md">
            <div>
              <h2 className="text-title text-ink-900">{t('chat.title')}</h2>
              <p className="text-caption text-ink-400">{t('chat.subhead')}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="tap-target inline-flex items-center justify-center rounded-md text-ink-500 transition-colors duration-fast ease-out hover:bg-jade-50 hover:text-jade-600 focus-visible:shadow-focus"
            >
              <span className="sr-only">{t('chat.close')}</span>
              <XIcon />
            </button>
          </header>

          <div className="flex flex-1 flex-col justify-end gap-md overflow-y-auto px-lg py-lg">
            {thread.map((m, i) => (
              <ChatBubble
                key={`${m.role}-${i}`}
                role={m.role === 'user' ? 'user' : 'assistant'}
              >
                {m.content}
              </ChatBubble>
            ))}
          </div>

          <form
            onSubmit={onSend}
            className="border-t border-line-soft p-md"
          >
            <label className="sr-only" htmlFor="floating-chat-input">
              {t('chat.placeholder')}
            </label>
            <div className="flex gap-sm">
              <input
                id="floating-chat-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('chat.placeholder')}
                className="tap-target font-myanmar min-w-0 flex-1 rounded-md border border-line px-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="tap-target shrink-0 rounded-md bg-jade-600 px-lg text-body-sm font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800 disabled:bg-ink-300"
              >
                {t('chat.send')}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
