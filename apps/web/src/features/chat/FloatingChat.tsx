import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  classifyClarifyReply,
  classifyInputShape,
  matchRoadmapStep,
  signalsDontKnow,
  type ChatMessage,
} from '@inyalink/shared';
import { detectResponseLocale } from '@inyalink/burmese';
import {
  converseBrief,
  createBrief,
  generateRoadmap,
  getMatchCandidates,
  submitBrief,
  updateBrief,
} from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { useAuth } from '../lib/auth';
import {
  fetchConversationDetail,
  persistConversationSnapshot,
} from '../lib/conversationStore';
import { useDemoFlow } from '../lib/demoFlow';
import { translateIn, useI18n } from '../lib/i18n';
import { BriefSummaryCard } from '../features/chat/BriefSummaryCard';
import { MatchAvatarRow, MatchAvatarRowSkeleton } from '../features/chat/MatchAvatarRow';
import { RoadmapCards } from '../features/chat/RoadmapCards';
import { ChatBubble, ThinkingBubble } from './ChatBubble';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { CHAT_COMPOSER, CHAT_PANEL, useChatUi } from './chatUi';
import { LogoMark } from './Logo';
import { RotatingProgress } from './RotatingProgress';
import { RateLimitNotice } from './Notices';

export { ChatUiProvider, useChatUi } from './chatUi';

/** Client-side backoff before surfacing a rate-limit notice (server also retries). */
const CLIENT_RATE_LIMIT_ATTEMPTS = 3;
const CLIENT_RATE_LIMIT_BASE_MS = 1_500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withClientRateLimitRetries<T extends { retryable?: boolean }>(
  run: () => Promise<T>,
): Promise<T> {
  let last: T | undefined;
  for (let attempt = 0; attempt < CLIENT_RATE_LIMIT_ATTEMPTS; attempt += 1) {
    last = await run();
    if (!last.retryable) return last;
    if (attempt < CLIENT_RATE_LIMIT_ATTEMPTS - 1) {
      await sleep(CLIENT_RATE_LIMIT_BASE_MS * 2 ** attempt);
    }
  }
  return last as T;
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
 * Floating conversation panel — the only AI output surface.
 * Clarifying questions, roadmap, brief, and matches all render here.
 */
export function FloatingChat() {
  const { t, locale } = useI18n();
  const { open, setOpen } = useChatUi();
  const { session } = useAuth();
  const signedIn = Boolean(session);
  const {
    conversationId,
    goal,
    path,
    messages,
    briefDraft,
    briefId,
    roadmapSteps,
    roadmapDisclaimer,
    matches,
    converseStarted,
    converseComplete,
    startFromInput,
    setMessages,
    setBriefDraft,
    setBriefId,
    setConversationId,
    markConverseStarted,
    markConverseComplete,
    setMatches,
    setRoadmap,
    resolveClarifyToQuick,
    resolveClarifyToPlan,
    handoffToRoadmap,
    beginStepHire,
    continueAsPlan,
    continueAsQuick,
    loadConversation,
    startNewConversation,
  } = useDemoFlow();

  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [matchBusy, setMatchBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bootKeyRef = useRef<string | null>(null);
  const clarifyBootRef = useRef<string | null>(null);
  const unrelatedBootRef = useRef<string | null>(null);
  const roadmapBootRef = useRef<string | null>(null);
  const prevConverseStarted = useRef(converseStarted);
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;
  const briefDraftRef = useRef(briefDraft);
  briefDraftRef.current = briefDraft;
  const briefIdRef = useRef(briefId);
  briefIdRef.current = briefId;

  const persistPath =
    path === 'quick' ||
    path === 'plan' ||
    path === 'clarify' ||
    path === 'unrelated'
      ? path
      : null;

  const clarifying = path === 'clarify';
  const unrelated = path === 'unrelated';
  const planning = path === 'plan';
  const active =
    path === 'quick' ||
    path === 'plan' ||
    path === 'clarify' ||
    path === 'unrelated';

  const latestUser = [...messages].reverse().find((m) => m.role === 'user');
  const contentLocale = latestUser
    ? detectResponseLocale(latestUser.content)
    : goal
      ? detectResponseLocale(goal)
      : locale;

  const showBriefCard = complete && path === 'quick';
  /** Only lock while a network action is in flight — never after roadmap/brief. */
  const composerLocked = busy || briefBusy || matchBusy;

  useEffect(() => {
    if (
      path === 'quick' ||
      path === 'plan' ||
      path === 'clarify' ||
      path === 'unrelated'
    ) {
      setOpen(true);
    }
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, busy, open, roadmapSteps, matches, complete, matchBusy]);

  useEffect(() => {
    if (!open || historyOpen || composerLocked) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 220);
    return () => window.clearTimeout(id);
  }, [open, historyOpen, composerLocked, roadmapSteps.length, complete]);

  useEffect(() => {
    setComplete(converseComplete);
  }, [conversationId, converseComplete]);

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
          /* best-effort */
        });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [messages, persistPath, complete, signedIn, setConversationId]);

  useEffect(() => {
    if (prevConverseStarted.current && !converseStarted) {
      bootKeyRef.current = null;
      clarifyBootRef.current = null;
      unrelatedBootRef.current = null;
      roadmapBootRef.current = null;
    }
    prevConverseStarted.current = converseStarted;
  }, [converseStarted]);

  function goRoadmap() {
    handoffToRoadmap();
  }

  async function loadRoadmap(seedGoal: string) {
    const key = `plan:${seedGoal}`;
    if (roadmapBootRef.current === key) return;
    roadmapBootRef.current = key;
    setBusy(true);
    setNotice(null);
    try {
      const result = await withClientRateLimitRetries(() =>
        generateRoadmap(seedGoal, locale),
      );
      if (result.retryable) {
        roadmapBootRef.current = null;
        // Server + client already retried — wait notice only, no manual retry.
        setNotice(result.notice ?? t('rateLimit.body'));
        return;
      }
      if (!result.id || !result.steps || !result.disclaimer) {
        roadmapBootRef.current = null;
        setNotice(t('rateLimit.body'));
        return;
      }
      setRoadmap({
        id: result.id,
        steps: result.steps,
        disclaimer: result.disclaimer,
      });
    } catch {
      roadmapBootRef.current = null;
      setNotice(t('rateLimit.body'));
    } finally {
      setBusy(false);
    }
  }

  async function runTurn(nextMessages: ChatMessage[]) {
    setBusy(true);
    setNotice(null);
    const replyLocale = detectResponseLocale(
      [...nextMessages].reverse().find((m) => m.role === 'user')?.content ??
        goal,
    );
    try {
      const result = await withClientRateLimitRetries(() =>
        converseBrief({
          messages: nextMessages,
          briefDraft: briefDraftRef.current,
          locale: replyLocale,
        }),
      );
      if (result.redirectTo === 'roadmap') {
        console.log('[classify] API redirect → roadmap');
        goRoadmap();
        return;
      }
      setBriefDraft(result.briefDraft);
      if (result.retryable) {
        // Server + client already retried — wait notice only, no manual retry.
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
        setMatches(null);
      }
    } catch {
      setNotice(t('rateLimit.body'));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function bootQuickTurn(seedMessages: ChatMessage[], seedGoal: string) {
    const key = `quick:${seedGoal}`;
    if (bootKeyRef.current === key) return;
    bootKeyRef.current = key;
    markConverseStarted();
    void runTurn(seedMessages);
  }

  useEffect(() => {
    if (path !== 'quick' || converseStarted || !goal) return;
    if (messages.length === 0) return;
    if (messages[messages.length - 1]?.role !== 'user') return;
    bootQuickTurn(messages, `${goal}#${messages.length}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, goal, converseStarted, messages]);

  useEffect(() => {
    if (!planning || !goal) return;
    if (roadmapSteps.length > 0) return;
    void loadRoadmap(goal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planning, goal, roadmapSteps.length]);

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

  async function onFindMatches(urgent: boolean) {
    setBriefBusy(true);
    setBriefError(null);
    setMatchBusy(true);
    try {
      const draft = briefDraftRef.current;
      const body = {
        source: 'ai_chat' as const,
        raw_input: goal || undefined,
        draft,
      };
      const saved = briefIdRef.current
        ? await updateBrief(briefIdRef.current, { draft })
        : await createBrief(body);
      setBriefId(saved.id);
      await submitBrief(saved.id, { urgent });
      const result = await getMatchCandidates(saved.id);
      setMatches(result.candidates);
    } catch (err) {
      setBriefError(
        err instanceof ApiError ? err.message : t('matches.loadError'),
      );
      setMatches(null);
    } finally {
      setBriefBusy(false);
      setMatchBusy(false);
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const text = reply.trim();
    if (!text || busy || briefBusy || matchBusy) return;

    if (!active) {
      setReply('');
      const result = startFromInput(text);
      if (result.path === 'quick') {
        bootQuickTurn(result.messages, result.goal);
      }
      return;
    }

    if (clarifying) {
      setReply('');
      const shape = classifyClarifyReply(text);
      console.log('[classify] clarify reply', { text, shape });
      if (shape === 'goal') {
        resolveClarifyToPlan();
        return;
      }
      resolveClarifyToQuick();
      return;
    }

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
      if (result.path === 'quick') {
        bootQuickTurn(result.messages, result.goal);
      }
      return;
    }

    // After roadmap (most recent AI output): bare numbers / titles → hire brief.
    if (planning && roadmapSteps.length > 0) {
      setReply('');
      const step = matchRoadmapStep(text, roadmapSteps);
      console.log('[classify] plan follow-up', {
        text,
        step: step?.order ?? null,
      });
      if (step) {
        beginStepHire(step);
        return;
      }
      const shape = classifyInputShape(text);
      if (shape === 'goal') {
        continueAsPlan(text, text);
        return;
      }
      if (shape === 'service') {
        continueAsQuick(text, text);
        return;
      }
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
      // Don't echo the reply as a stray bubble — prompt already sits under the cards.
      return;
    }

    // After brief/matches: never lock — re-route a new goal or hire.
    if (complete) {
      setReply('');
      const step =
        roadmapSteps.length > 0
          ? matchRoadmapStep(text, roadmapSteps)
          : null;
      if (step) {
        beginStepHire(step);
        return;
      }
      const shape = classifyInputShape(text);
      console.log('[classify] post-brief follow-up', { text, shape });
      if (shape === 'goal') {
        continueAsPlan(text, text);
        return;
      }
      if (shape === 'service') {
        continueAsQuick(text, text);
        return;
      }
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
      continueAsQuick(text, text);
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
    if (busy || complete || planning) return;
    if (unrelated) return;
    if (clarifying) {
      resolveClarifyToPlan();
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
      setBriefError(null);
      bootKeyRef.current = `quick:${detail.id}:loaded`;
      clarifyBootRef.current = `clarify:${detail.id}:loaded`;
      unrelatedBootRef.current = `unrelated:${detail.id}:loaded`;
      roadmapBootRef.current = `plan:${detail.id}:loaded`;
    } catch {
      setNotice(t('chat.historyError'));
    }
  }

  function onNewConversation() {
    startNewConversation();
    setComplete(false);
    setNotice(null);
    setBriefError(null);
    setReply('');
    setHistoryOpen(false);
    bootKeyRef.current = null;
    clarifyBootRef.current = null;
    unrelatedBootRef.current = null;
    roadmapBootRef.current = null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('chat.open')}
        aria-expanded={open}
        aria-controls="floating-chat-panel"
        className={`fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-jade-600 text-white shadow-cta transition-[opacity,transform,background-color] duration-slow ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800 motion-reduce:transition-none ${
          open
            ? 'pointer-events-none scale-90 opacity-0'
            : 'pointer-events-auto scale-100 opacity-100'
        }`}
      >
        <ChatFabIcon />
      </button>

      {open ? (
        <button
          type="button"
          aria-label={t('chat.close')}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 hidden bg-scrim sm:block"
        />
      ) : null}

      <div
        id="floating-chat-panel"
        role="dialog"
        aria-label={t('chat.title')}
        aria-hidden={!open}
        className={`fixed z-50 flex flex-col overflow-hidden transition-[opacity,transform] duration-slow ease-out motion-reduce:transition-none max-sm:inset-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:border-0 sm:bottom-5 sm:right-5 sm:h-[min(680px,calc(100dvh-5.5rem))] sm:max-h-[calc(100dvh-5.5rem)] sm:w-[min(400px,calc(100vw-1.5rem))] ${CHAT_PANEL} ${
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-3 scale-[0.98] opacity-0'
        }`}
      >
        <header className="flex shrink-0 items-center gap-sm border-b border-line-soft bg-paper px-xl py-lg pt-[max(0.75rem,env(safe-area-inset-top))]">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2md bg-jade-50 text-jade-600">
            <LogoMark size={20} />
          </span>
          <h2 className="min-w-0 flex-1 truncate font-display text-title text-ink-900">
            {t('chat.title')}
          </h2>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            tabIndex={open ? 0 : -1}
            className="tap-target inline-flex items-center justify-center rounded-2md text-ink-500 transition-colors duration-fast ease-out hover:bg-jade-50 hover:text-jade-600 focus-visible:shadow-focus"
          >
            <span className="sr-only">{t('chat.history')}</span>
            <HistoryIcon />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
            className="tap-target inline-flex items-center justify-center rounded-2md text-ink-500 transition-colors duration-fast ease-out hover:bg-jade-50 hover:text-jade-600 focus-visible:shadow-focus"
          >
            <span className="sr-only">{t('chat.close')}</span>
            <XIcon />
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
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
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-xl py-xl"
            aria-live="polite"
          >
            <div className="flex min-h-full flex-col justify-end gap-lg">
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
              {roadmapSteps.length > 0 ? (
                <RoadmapCards
                  steps={roadmapSteps}
                  disclaimer={roadmapDisclaimer}
                  showPrompt={planning}
                />
              ) : null}
              {showBriefCard ? (
                <BriefSummaryCard
                  draft={briefDraft}
                  goal={goal}
                  busy={briefBusy || matchBusy}
                  error={briefError}
                  onChange={setBriefDraft}
                  onFindMatches={(urgent) => void onFindMatches(urgent)}
                />
              ) : null}
              {matchBusy && !matches ? (
                <>
                  <MatchAvatarRowSkeleton />
                  <RotatingProgress active />
                </>
              ) : null}
              {matches && matches.length > 0 ? (
                <MatchAvatarRow matches={matches} />
              ) : null}
              {matches && matches.length === 0 && !matchBusy ? (
                <ChatBubble role="assistant">
                  {t('matches.waitingBody')}
                </ChatBubble>
              ) : null}
            </div>
          </div>

          {notice ? (
            <div className="shrink-0 px-xl pb-lg">
              {/* No Try again — transient limits already auto-retried. */}
              <RateLimitNotice notice={notice} />
            </div>
          ) : null}

          <form
            onSubmit={(e) => void onSend(e)}
            className="shrink-0 border-t border-line-soft bg-white p-lg pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
              <label className="sr-only" htmlFor="floating-chat-input">
                {t('converse.placeholder')}
              </label>
              <div className={`flex flex-wrap items-stretch gap-sm p-sm ${CHAT_COMPOSER}`}>
                <input
                  ref={inputRef}
                  id="floating-chat-input"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={t('converse.placeholder')}
                  disabled={composerLocked || !open || historyOpen}
                  tabIndex={open && !historyOpen ? 0 : -1}
                  className="tap-target font-myanmar min-w-0 flex-1 bg-transparent px-md text-body-lg leading-burmese outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={
                    composerLocked ||
                    !reply.trim() ||
                    !open ||
                    historyOpen
                  }
                  tabIndex={open && !historyOpen ? 0 : -1}
                  className="tap-target shrink-0 rounded-md bg-jade-600 px-lg text-body-sm font-medium text-white shadow-cta transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800 disabled:bg-ink-300 disabled:shadow-none"
                >
                  {t('converse.send')}
                </button>
                {active && !unrelated && !planning && !complete ? (
                  <button
                    type="button"
                    onClick={() => void onSkip()}
                    disabled={busy || !open || historyOpen}
                    tabIndex={open && !historyOpen ? 0 : -1}
                    className="tap-target shrink-0 rounded-md border border-line bg-white px-md text-body-sm font-medium text-ink-700 transition-colors duration-fast ease-out hover:border-jade-400 hover:bg-jade-50 hover:text-jade-800 focus-visible:shadow-focus disabled:opacity-40"
                  >
                    {t('converse.skip')}
                  </button>
                ) : null}
              </div>
          </form>
        </div>
      </div>
    </>
  );
}
