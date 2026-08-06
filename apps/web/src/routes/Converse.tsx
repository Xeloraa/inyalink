import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { classifyClarifyReply, type ChatMessage } from '@inyalink/shared';
import { detectResponseLocale } from '@inyalink/burmese';
import { converseBrief } from '../lib/api';
import { useDemoFlow } from '../lib/demoFlow';
import { translateIn, useI18n } from '../lib/i18n';
import { ChatBubble, ThinkingBubble } from '../components/ChatBubble';
import { RotatingProgress } from '../components/RotatingProgress';
import { RateLimitNotice } from '../components/Notices';

function countAssistantQuestions(messages: ChatMessage[]): number {
  return messages.filter((m) => m.role === 'assistant').length;
}

export default function Converse() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const {
    goal,
    path,
    messages,
    briefDraft,
    converseStarted,
    setMessages,
    setBriefDraft,
    markConverseStarted,
    resolveClarifyToQuick,
    resolveClarifyToPlan,
  } = useDemoFlow();
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clarifying = path === 'clarify';
  const asked = countAssistantQuestions(messages);
  const maxQuestions = 4;
  const progressLabel = clarifying
    ? t('converse.progressClarify')
    : t('converse.progress')
        .replace('{asked}', String(Math.min(asked, maxQuestions)))
        .replace('{max}', String(maxQuestions));

  const contentLocale = goal ? detectResponseLocale(goal) : locale;

  useEffect(() => {
    if (!goal) {
      void navigate('/');
      return;
    }
    if (clarifying) {
      if (messages.length === 1 && messages[0]?.role === 'user') {
        const question = translateIn(
          contentLocale,
          'converse.clarifyQuestion',
        );
        setMessages([
          ...messages,
          { role: 'assistant', content: question },
        ]);
      }
      return;
    }
    if (converseStarted) return;
    markConverseStarted();
    void runTurn(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once per flow
  }, [clarifying, path]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, busy]);

  async function runTurn(nextMessages: ChatMessage[]) {
    setBusy(true);
    setNotice(null);
    try {
      const result = await converseBrief({
        messages: nextMessages,
        briefDraft,
        locale,
      });
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
        void navigate('/brief');
      }
    } catch {
      setNotice(t('rateLimit.body'));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const text = reply.trim();
    if (!text || busy) return;

    if (clarifying) {
      setReply('');
      const shape = classifyClarifyReply(text);
      if (shape === 'goal') {
        resolveClarifyToPlan();
        void navigate('/roadmap');
        return;
      }
      resolveClarifyToQuick();
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
      // Skip clarify → hire path (safer default).
      resolveClarifyToQuick();
      return;
    }
    const skipText = translateIn(contentLocale, 'converse.skipReply');
    const next = [...messages, { role: 'user' as const, content: skipText }];
    setMessages(next);
    await runTurn(next);
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-5.5rem)] max-w-conversation flex-col md:min-h-[calc(100vh-6rem)]">
      <header className="flex shrink-0 items-center justify-between gap-md pb-md">
        <div className="min-w-0">
          <Link
            to="/"
            className="text-body-sm text-ink-500 underline-offset-2 hover:text-jade-600 hover:underline"
          >
            {t('common.back')}
          </Link>
          <h1 className="mt-xs font-display text-title text-ink-900 leading-burmese">
            {t('converse.title')}
          </h1>
        </div>
        <p
          className="shrink-0 text-caption text-ink-400"
          aria-live="polite"
        >
          {progressLabel}
        </p>
      </header>

      <div
        ref={listRef}
        className="flex flex-1 flex-col justify-end gap-md overflow-y-auto py-md"
        aria-live="polite"
      >
        {messages.map((m, i) => (
          <ChatBubble key={`${m.role}-${i}`} role={m.role}>
            {m.content}
          </ChatBubble>
        ))}
        {busy ? <ThinkingBubble /> : null}
        {busy ? <RotatingProgress active /> : null}
      </div>

      {notice ? (
        <div className="shrink-0 pb-md">
          <RateLimitNotice
            notice={notice}
            onRetry={() => void runTurn(messages)}
          />
        </div>
      ) : null}

      {complete ? (
        <button
          type="button"
          className="tap-target w-full rounded-md bg-jade-600 px-lg py-md text-body font-medium text-white hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800"
          onClick={() => void navigate('/brief')}
        >
          {t('converse.done')}
        </button>
      ) : (
        <form
          onSubmit={(e) => void onSend(e)}
          className="shrink-0 border-t border-line-soft pt-md pb-sm"
        >
          <label className="sr-only" htmlFor="converse-input">
            {t('converse.placeholder')}
          </label>
          <div className="flex gap-sm">
            <input
              ref={inputRef}
              id="converse-input"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={t('converse.placeholder')}
              disabled={busy}
              className="tap-target font-myanmar min-w-0 flex-1 rounded-md border border-line bg-white px-md text-body-lg leading-burmese outline-none focus:border-jade-400 focus:shadow-focus disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || !reply.trim()}
              className="tap-target shrink-0 rounded-md bg-jade-600 px-lg text-body font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800 disabled:bg-ink-300"
            >
              {t('converse.send')}
            </button>
          </div>
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
        </form>
      )}
    </section>
  );
}
