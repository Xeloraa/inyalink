import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatMmk } from '@inyalink/shared';
import { generateRoadmap } from '../lib/api';
import { useDemoFlow } from '../lib/demoFlow';
import { useI18n } from '../lib/i18n';
import { ThinkingBubble } from '../components/ChatBubble';
import { RotatingProgress } from '../components/RotatingProgress';
import { RateLimitNotice } from '../components/Notices';

export default function Roadmap() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { goal, roadmapSteps, roadmapDisclaimer, setRoadmap } = useDemoFlow();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const started = useRef(false);

  async function load() {
    if (!goal) {
      void navigate('/');
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await generateRoadmap(goal, locale);
      if (result.retryable) {
        setNotice(result.notice ?? t('rateLimit.body'));
        return;
      }
      if (!result.id || !result.steps || !result.disclaimer) {
        setNotice(t('rateLimit.body'));
        return;
      }
      setRoadmap({
        id: result.id,
        steps: result.steps,
        disclaimer: result.disclaimer,
      });
    } catch {
      setNotice(t('rateLimit.body'));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    if (roadmapSteps.length > 0) return;
    started.current = true;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moneyLocale = locale === 'en' ? 'en' : 'my';

  return (
    <section className="mx-auto max-w-brief space-y-xl">
      <div className="flex items-center justify-between gap-md">
        <h1 className="font-display text-display-sm text-ink-900 leading-burmese">
          {t('roadmap.title')}
        </h1>
        <Link
          to="/"
          className="text-body-sm text-ink-500 underline-offset-2 hover:text-jade-600 hover:underline"
        >
          {t('common.back')}
        </Link>
      </div>

      {goal ? (
        <p className="font-myanmar rounded-md border border-line bg-white px-lg py-md text-body-lg leading-burmese text-ink-900 [overflow-wrap:anywhere]">
          {goal}
        </p>
      ) : null}

      {busy ? (
        <div className="space-y-md">
          <ThinkingBubble />
          <RotatingProgress active />
        </div>
      ) : null}
      {notice ? <RateLimitNotice notice={notice} onRetry={() => void load()} /> : null}

      <ol className="space-y-lg">
        {roadmapSteps
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((step) => (
            <li
              key={step.order}
              className="rounded-lg border border-line bg-white p-lg"
            >
              <p className="text-caption font-medium text-jade-600">
                {step.order}. {step.category_slug}
              </p>
              <h2 className="mt-xs text-title font-medium leading-burmese text-ink-900">
                {step.title}
              </h2>
              <p className="mt-sm text-body-sm leading-burmese text-ink-500">
                {step.why}
              </p>
              <p className="mt-md text-caption text-ink-400">
                {t('roadmap.budget')}:{' '}
                {formatMmk(step.est_min_mmk, moneyLocale)} –{' '}
                {formatMmk(step.est_max_mmk, moneyLocale)}
              </p>
            </li>
          ))}
      </ol>

      {roadmapDisclaimer ? (
        <aside className="border-t border-line-soft pt-lg text-caption leading-burmese text-ink-400">
          <p className="font-medium text-ink-500">{t('roadmap.disclaimer')}</p>
          <p className="mt-xs">{roadmapDisclaimer}</p>
        </aside>
      ) : null}
    </section>
  );
}
