import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  classifyClarifyReply,
  signalsDontKnow,
  type ChatMessage,
} from '@inyalink/shared';
import { detectResponseLocale } from '@inyalink/burmese';
import { converseBrief } from '../lib/api';
import { useDemoFlow } from '../lib/demoFlow';
import { translateIn, useI18n } from '../lib/i18n';
import { ChatBubble, ThinkingBubble } from './ChatBubble';
import { RotatingProgress } from './RotatingProgress';
import { RateLimitNotice } from './Notices';

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

function countAssistantQuestions(messages: ChatMessage[]): number {
  return messages.filter((m) => m.role === 'assistant').length;
}

/**
 * Floating conversation panel — the only AI chat surface.
 * Opens from the hero / browse bar / profile. No FAB, no /converse page.
 */
export function FloatingChat() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { open, setOpen } = useChatUi();
  const {
    goal,
    path,
    messages,
    briefDraft,
    converseStarted,
    startFromInput,
    setMessages,
    setBriefDraft,
    markConverseStarted,
    resolveClarifyToQuick,
    resolveClarifyToPlan,
    handoffToRoadmap,
  } = useDemoFlow();

  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Guards StrictMode double-invoke for the opening quick turn. */
  const bootKeyRef = useRef<string | null>(null);
  const clarifyBootRef = useRef<string | null>(null);
  const prevConverseStarted = useRef(converseStarted);
  const briefDraftRef = useRef(briefDraft);
  briefDraftRef.current = briefDraft;

  const clarifying = path === 'clarify';
  const active = path === 'quick' || path === 'clarify';
  const asked = countAssistantQuestions(messages);
  const maxQuestions = 4;
  const progressLabel = clarifying
    ? t('converse.progressClarify')
    : t('converse.progress')
        .replace('{asked}', String(Math.min(asked, maxQuestions)))
        .replace('{max}', String(maxQuestions));

  const latestUser = [...messages].reverse().find((m) => m.role === 'user');
  const contentLocale = latestUser
    ? detectResponseLocale(latestUser.content)
    : goal
      ? detectResponseLocale(goal)
      : locale;

  // Open panel whenever a chat path is active; close on roadmap handoff.
  useEffect(() => {
    if (path === 'quick' || path === 'clarify') setOpen(true);
    if (path === 'plan') setOpen(false);
  }, [path, setOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, busy, open]);

  // New quick/clarify session (converseStarted flipped false) may reuse the
  // same goal text — clear the boot gate so the opening turn runs again.
  useEffect(() => {
    if (prevConverseStarted.current && !converseStarted) {
      bootKeyRef.current = null;
      clarifyBootRef.current = null;
    }
    prevConverseStarted.current = converseStarted;
  }, [converseStarted]);

  function goRoadmap() {
    handoffToRoadmap();
    setOpen(false);
    void navigate('/roadmap');
  }

  async function runTurn(nextMessages: ChatMessage[]) {
    setBusy(true);
    setNotice(null);
    try {
      const result = await converseBrief({
        messages: nextMessages,
        briefDraft: briefDraftRef.current,
        locale,
      });
      if (result.redirectTo === 'roadmap') {
        console.log('[classify] API redirect → roadmap');
        goRoadmap();
        return;
      }
      setBriefDraft(result.briefDraft);
      if (result.retryable) {
        setNotice(result.notice ?? t('rateLimit.body'));
        return;
      }
      if (result.nextQuestion) {
        setMessages([
          ...nextMessages,
          { role: 'assistant', content: result.nextQuestion },
        ]);
      }
      setComplete(result.complete);
      if (result.complete && !result.nextQuestion) {
        setOpen(false);
        void navigate('/brief');
      }
    } catch {
      setNotice(t('rateLimit.body'));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  /**
   * First AI turn for a quick-hire session. Called from the boot effect
   * (hero submit) and from onSend (empty panel). Uses bootKeyRef so
   * StrictMode / re-renders cannot drop or double the opening turn.
   */
  function bootQuickTurn(seedMessages: ChatMessage[], seedGoal: string) {
    const key = `quick:${seedGoal}`;
    if (bootKeyRef.current === key) return;
    bootKeyRef.current = key;
    markConverseStarted();
    void runTurn(seedMessages);
  }

  // Hero (and any external startQuick) — first turn must not wait for a
  // second user message. Depends on messages so the seeded user turn is fresh.
  useEffect(() => {
    if (path !== 'quick' || converseStarted || !goal) return;
    if (messages.length !== 1 || messages[0]?.role !== 'user') return;
    bootQuickTurn(messages, goal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, goal, converseStarted, messages]);

  // Clarify path — inject the one local question (no API).
  useEffect(() => {
    if (!clarifying || !goal) return;
    if (messages.length !== 1 || messages[0]?.role !== 'user') return;
    const key = `clarify:${goal}`;
    if (clarifyBootRef.current === key) return;
    clarifyBootRef.current = key;
    const question = translateIn(contentLocale, 'converse.clarifyQuestion');
    setMessages([...messages, { role: 'assistant', content: question }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clarifying, goal, messages.length]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const text = reply.trim();
    if (!text || busy) return;

    // Panel opened empty (e.g. browse bar) — classify the first message.
    if (!active) {
      setReply('');
      const result = startFromInput(text);
      if (result.destination === 'roadmap') {
        setOpen(false);
        void navigate('/roadmap');
        return;
      }
      if (result.path === 'quick') {
        bootQuickTurn(result.messages, result.goal);
      }
      // clarify: the clarify effect injects the local question
      return;
    }

    if (clarifying) {
      setReply('');
      const shape = classifyClarifyReply(text);
      console.log('[classify] clarify reply', { text, shape });
      if (shape === 'goal') {
        resolveClarifyToPlan();
        setOpen(false);
        void navigate('/roadmap');
        return;
      }
      resolveClarifyToQuick();
      return;
    }

    if (signalsDontKnow(text)) {
      console.log('[classify] dont-know → roadmap', { text });
      const next = [...messages, { role: 'user' as const, content: text }];
      setMessages(next);
      setReply('');
      goRoadmap();
      return;
    }

    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setReply('');
    await runTurn(next);
  }

  async function onSkip() {
    if (busy || complete) return;
    if (clarifying) {
      resolveClarifyToPlan();
      setOpen(false);
      void navigate('/roadmap');
      return;
    }
    const skipText = translateIn(contentLocale, 'converse.skipReply');
    const next = [...messages, { role: 'user' as const, content: skipText }];
    setMessages(next);
    await runTurn(next);
  }

  if (!open) return null;

  return (
    <div
      id="floating-chat-panel"
      role="dialog"
      aria-label={t('chat.title')}
      className="fixed bottom-4 right-4 z-50 flex h-[min(560px,calc(100dvh-6rem))] w-[min(420px,calc(100vw-2rem))] flex-col rounded-xl border border-line bg-white shadow-lg"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-line-soft px-lg py-md">
        <div className="min-w-0">
          <h2 className="text-title text-ink-900">{t('chat.title')}</h2>
          <p className="text-caption text-ink-400" aria-live="polite">
            {active ? progressLabel : t('chat.subhead')}
          </p>
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

      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col justify-end gap-md overflow-y-auto px-lg py-lg"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <ChatBubble role="assistant">{t('chat.seed')}</ChatBubble>
        ) : null}
        {messages.map((m, i) => (
          <ChatBubble key={`${m.role}-${i}`} role={m.role}>
            {m.content}
          </ChatBubble>
        ))}
        {busy ? <ThinkingBubble /> : null}
        {busy ? <RotatingProgress active /> : null}
      </div>

      {notice ? (
        <div className="shrink-0 px-lg pb-md">
          <RateLimitNotice
            notice={notice}
            onRetry={() => void runTurn(messages)}
          />
        </div>
      ) : null}

      {complete ? (
        <div className="shrink-0 border-t border-line-soft p-md">
          <button
            type="button"
            className="tap-target w-full rounded-md bg-jade-600 px-lg py-md text-body font-medium text-white hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800"
            onClick={() => {
              setOpen(false);
              void navigate('/brief');
            }}
          >
            {t('converse.done')}
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => void onSend(e)}
          className="shrink-0 border-t border-line-soft p-md"
        >
          <label className="sr-only" htmlFor="floating-chat-input">
            {t('converse.placeholder')}
          </label>
          <div className="flex gap-sm">
            <input
              ref={inputRef}
              id="floating-chat-input"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={t('converse.placeholder')}
              disabled={busy}
              className="tap-target font-myanmar min-w-0 flex-1 rounded-md border border-line px-md text-body-lg leading-burmese outline-none focus:border-jade-400 focus:shadow-focus disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || !reply.trim()}
              className="tap-target shrink-0 rounded-md bg-jade-600 px-lg text-body-sm font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800 disabled:bg-ink-300"
            >
              {t('converse.send')}
            </button>
          </div>
          {active ? (
            <div className="mt-sm flex justify-end">
              <button
                type="button"
                onClick={() => void onSkip()}
                disabled={busy}
                className="tap-target text-body-sm text-ink-500 underline-offset-2 hover:text-jade-600 hover:underline disabled:opacity-40"
              >
                {t('converse.skip')}
              </button>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
