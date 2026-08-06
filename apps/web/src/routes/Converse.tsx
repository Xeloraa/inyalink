import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { converseBrief } from '../lib/api';
import { useDemoFlow } from '../lib/demoFlow';
import { useI18n } from '../lib/i18n';
import { ProgressNotice, RateLimitNotice } from '../components/Notices';

export default function Converse() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const {
    goal,
    messages,
    briefDraft,
    converseStarted,
    setMessages,
    setBriefDraft,
    markConverseStarted,
  } = useDemoFlow();
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!goal) {
      void navigate('/');
      return;
    }
    if (converseStarted) return;
    markConverseStarted();
    void runTurn(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once per flow
  }, []);

  async function runTurn(nextMessages: typeof messages) {
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
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const text = reply.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setReply('');
    await runTurn(next);
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold leading-[1.8]">{t('converse.title')}</h1>
        <Link to="/" className="text-sm text-jade underline-offset-2 hover:underline">
          {t('common.back')}
        </Link>
      </div>

      <ul className="space-y-3">
        {messages.map((m, i) => (
          <li
            key={`${m.role}-${i}`}
            className={`rounded-md px-4 py-3 leading-[1.8] ${
              m.role === 'user'
                ? 'ml-6 bg-jade text-paper'
                : 'mr-6 border border-line bg-paper text-ink'
            }`}
          >
            {m.content}
          </li>
        ))}
      </ul>

      {busy ? <ProgressNotice messageKey="progress.structuring" /> : null}
      {notice ? (
        <RateLimitNotice
          notice={notice}
          onRetry={() => void runTurn(messages)}
        />
      ) : null}

      {complete ? (
        <button
          type="button"
          className="rounded-md bg-lacquer px-4 py-3 text-paper"
          onClick={() => void navigate('/brief')}
        >
          {t('converse.done')}
        </button>
      ) : (
        <form onSubmit={(e) => void onSend(e)} className="flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={t('converse.placeholder')}
            disabled={busy}
            className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-3 leading-[1.8] outline-none focus:border-jade"
          />
          <button
            type="submit"
            disabled={busy || !reply.trim()}
            className="rounded-md bg-lacquer px-4 py-3 text-paper disabled:opacity-40"
          >
            {t('converse.send')}
          </button>
        </form>
      )}
    </section>
  );
}
