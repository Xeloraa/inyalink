import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  classifyClarifyReply,
  classifyInputShape,
  signalsDontKnow,
  type ChatMessage,
} from '@inyalink/shared';
import { detectResponseLocale } from '@inyalink/burmese';
import { converseBrief } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  fetchConversationDetail,
  persistConversationSnapshot,
} from '../lib/conversationStore';
import { useDemoFlow } from '../lib/demoFlow';
import { translateIn, useI18n } from '../lib/i18n';
import { ChatBubble, ThinkingBubble } from './ChatBubble';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { useChatUi } from './chatUi';
import { LogoMark } from './Logo';
import { RotatingProgress } from './RotatingProgress';
import { RateLimitNotice } from './Notices';

export { ChatUiProvider, useChatUi } from './chatUi';

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

function ChatFabIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

function HistoryIcon() {
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
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

/**
 * Floating conversation panel — the only AI chat surface.
 * FAB reopens after close; hero / browse bar / profile also open it.
 */
export function FloatingChat() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { open, setOpen } = useChatUi();
  const { session } = useAuth();
  const signedIn = Boolean(session);
  const {
    conversationId,
    goal,
    path,
    messages,
    briefDraft,
    converseStarted,
    converseComplete,
    startFromInput,
    setMessages,
    setBriefDraft,
    setConversationId,
    markConverseStarted,
    markConverseComplete,
    resolveClarifyToQuick,
    resolveClarifyToPlan,
    handoffToRoadmap,
    loadConversation,
    startNewConversation,
  } = useDemoFlow();

  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Guards StrictMode double-invoke for the opening quick turn. */
  const bootKeyRef = useRef<string | null>(null);
  const clarifyBootRef = useRef<string | null>(null);
  const unrelatedBootRef = useRef<string | null>(null);
  const prevConverseStarted = useRef(converseStarted);
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;
  const briefDraftRef = useRef(briefDraft);
  briefDraftRef.current = briefDraft;
  const persistPath =
    path === 'quick' || path === 'clarify' || path === 'unrelated'
      ? path
      : null;

  const clarifying = path === 'clarify';
  const unrelated = path === 'unrelated';
  const active = path === 'quick' || path === 'clarify' || path === 'unrelated';

  const latestUser = [...messages].reverse().find((m) => m.role === 'user');
  const contentLocale = latestUser
    ? detectResponseLocale(latestUser.content)
    : goal
      ? detectResponseLocale(goal)
      : locale;

  // Open panel whenever a chat path is active; close on roadmap handoff.
  useEffect(() => {
    if (path === 'quick' || path === 'clarify' || path === 'unrelated') {
      setOpen(true);
    }
    if (path === 'plan') setOpen(false);
  }, [path, setOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (historyOpen) {
        setHistoryOpen(false);
        return;
      }
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen, historyOpen]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, busy, open]);

  // Focus composer when the panel opens (not while browsing history).
  useEffect(() => {
    if (!open || historyOpen) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 220);
    return () => window.clearTimeout(id);
  }, [open, historyOpen]);

  useEffect(() => {
    setComplete(converseComplete);
  }, [conversationId, converseComplete]);

  // Persist transcript after each turn (DB when signed in, else sessionStorage).
  useEffect(() => {
    if (!persistPath || messages.length === 0) return;
    const timer = window.setTimeout(() => {
      void persistConversationSnapshot({
        conversationId: conversationIdRef.current,
        messages,
        briefDraft: briefDraftRef.current,
        path: persistPath,
        complete,
        signedIn,
      })
        .then((result) => {
          if (!result) return;
          if (result.id !== conversationIdRef.current) {
            setConversationId(result.id);
          }
          setHistoryRefresh((n) => n + 1);
        })
        .catch(() => {
          /* best-effort — chat still works offline / on API blip */
        });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    messages,
    persistPath,
    complete,
    signedIn,
    setConversationId,
  ]);

  // New quick/clarify session (converseStarted flipped false) may reuse the
  // same goal text — clear the boot gate so the opening turn runs again.
  useEffect(() => {
    if (prevConverseStarted.current && !converseStarted) {
      bootKeyRef.current = null;
      clarifyBootRef.current = null;
      unrelatedBootRef.current = null;
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
      if (result.complete) {
        markConverseComplete();
      }
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

  // Unrelated path — §11 warm redirect (no API, never the hire-vs-plan clarify).
  useEffect(() => {
    if (!unrelated || !goal) return;
    if (messages.length !== 1 || messages[0]?.role !== 'user') return;
    const key = `unrelated:${goal}`;
    if (unrelatedBootRef.current === key) return;
    unrelatedBootRef.current = key;
    const redirect = translateIn(contentLocale, 'converse.unrelatedRedirect');
    setMessages([...messages, { role: 'assistant', content: redirect }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unrelated, goal, messages.length]);

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
      // clarify / unrelated: effects inject the local reply
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

    // Persist on unrelated → redirect once more; business-shaped → re-route.
    if (unrelated) {
      setReply('');
      const shape = classifyInputShape(text);
      console.log('[classify] unrelated follow-up', { text, shape });
      if (shape === 'unrelated') {
        const redirect = translateIn(
          detectResponseLocale(text),
          'converse.unrelatedRedirect',
        );
        setMessages([
          ...messages,
          { role: 'user', content: text },
          { role: 'assistant', content: redirect },
        ]);
        return;
      }
      const result = startFromInput(text);
      if (result.destination === 'roadmap') {
        setOpen(false);
        void navigate('/roadmap');
        return;
      }
      if (result.path === 'quick') {
        bootQuickTurn(result.messages, result.goal);
      }
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
    if (unrelated) return;
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

  async function onSelectHistory(id: string) {
    try {
      const detail = await fetchConversationDetail(id, signedIn);
      loadConversation(detail);
      setComplete(detail.complete);
      setHistoryOpen(false);
      setNotice(null);
      bootKeyRef.current = `quick:${detail.id}:loaded`;
      clarifyBootRef.current = `clarify:${detail.id}:loaded`;
      unrelatedBootRef.current = `unrelated:${detail.id}:loaded`;
    } catch {
      setNotice(t('chat.historyError'));
    }
  }

  function onNewConversation() {
    startNewConversation();
    setComplete(false);
    setNotice(null);
    setReply('');
    setHistoryOpen(false);
    bootKeyRef.current = null;
    clarifyBootRef.current = null;
    unrelatedBootRef.current = null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('chat.open')}
        aria-expanded={open}
        aria-controls="floating-chat-panel"
        className={`fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-jade-600 text-white shadow-lg transition-[opacity,transform,background-color] duration-slow ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800 motion-reduce:transition-none ${
          open
            ? 'pointer-events-none scale-90 opacity-0'
            : 'pointer-events-auto scale-100 opacity-100'
        }`}
      >
        <ChatFabIcon />
      </button>

      <div
        id="floating-chat-panel"
        role="dialog"
        aria-label={t('chat.title')}
        aria-hidden={!open}
        className={`fixed bottom-5 right-5 z-50 flex w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-lg transition-[opacity,transform] duration-slow ease-out motion-reduce:transition-none max-sm:right-3 max-sm:bottom-3 ${
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-3 scale-[0.98] opacity-0'
        }`}
        style={{
          height: 'min(680px, calc(100dvh - 5.5rem))',
          maxHeight: 'calc(100dvh - 5.5rem)',
        }}
      >
        <header className="flex shrink-0 items-center gap-sm border-b border-line-soft px-xl py-lg">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-jade-50 text-jade-600">
            <LogoMark size={20} />
          </span>
          <h2 className="min-w-0 flex-1 truncate text-title text-ink-900">
            {t('chat.title')}
          </h2>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            tabIndex={open ? 0 : -1}
            className="tap-target inline-flex items-center justify-center rounded-md text-ink-500 transition-colors duration-fast ease-out hover:bg-jade-50 hover:text-jade-600 focus-visible:shadow-focus"
          >
            <span className="sr-only">{t('chat.history')}</span>
            <HistoryIcon />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
            className="tap-target inline-flex items-center justify-center rounded-md text-ink-500 transition-colors duration-fast ease-out hover:bg-jade-50 hover:text-jade-600 focus-visible:shadow-focus"
          >
            <span className="sr-only">{t('chat.close')}</span>
            <XIcon />
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <ChatHistoryPanel
            open={historyOpen}
            signedIn={signedIn}
            activeId={conversationId}
            refreshKey={historyRefresh}
            onClose={() => setHistoryOpen(false)}
            onSelect={(id) => void onSelectHistory(id)}
            onNew={onNewConversation}
          />

          <div
            ref={listRef}
            className="flex min-h-0 flex-1 flex-col justify-end gap-lg overflow-y-auto px-xl py-xl"
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
            <div className="shrink-0 px-xl pb-lg">
              <RateLimitNotice
                notice={notice}
                onRetry={() => void runTurn(messages)}
              />
            </div>
          ) : null}

          {complete ? (
            <div className="shrink-0 border-t border-line-soft p-lg">
              <button
                type="button"
                tabIndex={open ? 0 : -1}
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
              className="shrink-0 border-t border-line-soft p-lg"
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
                  disabled={busy || !open || historyOpen}
                  tabIndex={open && !historyOpen ? 0 : -1}
                  className="tap-target font-myanmar min-w-0 flex-1 rounded-md border border-line px-md text-body-lg leading-burmese outline-none focus:border-jade-400 focus:shadow-focus disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={busy || !reply.trim() || !open || historyOpen}
                  tabIndex={open && !historyOpen ? 0 : -1}
                  className="tap-target shrink-0 rounded-md bg-jade-600 px-lg text-body-sm font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800 disabled:bg-ink-300"
                >
                  {t('converse.send')}
                </button>
              </div>
              {active && !unrelated ? (
                <div className="mt-md flex justify-end">
                  <button
                    type="button"
                    onClick={() => void onSkip()}
                    disabled={busy || !open || historyOpen}
                    tabIndex={open && !historyOpen ? 0 : -1}
                    className="tap-target text-body-sm text-ink-500 underline-offset-2 hover:text-jade-600 hover:underline disabled:opacity-40"
                  >
                    {t('converse.skip')}
                  </button>
                </div>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </>
  );
}
