import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatMmk } from '@inyalink/shared';
import { generateRoadmap } from '../lib/api';
import { useDemoFlow } from '../lib/demoFlow';
import { useI18n } from '../lib/i18n';
import { ProgressNotice, RateLimitNotice } from '../components/Notices';

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
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold leading-[1.8]">{t('roadmap.title')}</h1>
        <Link to="/" className="text-sm text-jade hover:underline">
          {t('common.back')}
        </Link>
      </div>

      {goal ? (
        <p className="rounded-md border border-line bg-paper px-4 py-3 leading-[1.8]">
          {goal}
        </p>
      ) : null}

      {busy ? <ProgressNotice messageKey="progress.roadmap" /> : null}
      {notice ? <RateLimitNotice notice={notice} onRetry={() => void load()} /> : null}

      <ol className="space-y-4">
        {roadmapSteps
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((step) => (
            <li
              key={step.order}
              className="rounded-lg border border-line bg-paper p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-jade">
                {step.order}. {step.category_slug}
              </p>
              <h2 className="mt-1 text-lg font-semibold leading-[1.8]">
                {step.title}
              </h2>
              <p className="mt-2 leading-[1.8] text-ink/80">{step.why}</p>
              <p className="mt-3 text-sm text-ink/60">
                {t('roadmap.budget')}:{' '}
                {formatMmk(step.est_min_mmk, moneyLocale)} –{' '}
                {formatMmk(step.est_max_mmk, moneyLocale)}
              </p>
            </li>
          ))}
      </ol>

      {roadmapDisclaimer ? (
        <aside className="border-t border-line pt-4 text-sm leading-[1.8] text-ink/65">
          <p className="font-semibold text-ink/80">{t('roadmap.disclaimer')}</p>
          <p className="mt-1">{roadmapDisclaimer}</p>
        </aside>
      ) : null}
    </section>
  );
}
