import { useI18n } from '../lib/i18n';

export function ProgressNotice({
  messageKey,
}: {
  messageKey:
    | 'progress.thinking'
    | 'progress.structuring'
    | 'progress.matching'
    | 'progress.explaining'
    | 'progress.roadmap';
}) {
  const { t } = useI18n();
  return (
    <p
      className="rounded-md border border-line bg-paper px-3 py-2 text-sm leading-[1.8] text-jade"
      role="status"
      aria-live="polite"
    >
      {t(messageKey)}
    </p>
  );
}

export function RateLimitNotice({
  notice,
  onRetry,
}: {
  notice?: string;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="rounded-md border border-lacquer/30 bg-paper px-3 py-3 leading-[1.8]"
      role="alert"
    >
      <p className="font-semibold text-lacquer">{t('rateLimit.title')}</p>
      <p className="mt-1 text-sm text-ink/80">
        {notice ?? t('rateLimit.body')}
      </p>
      {onRetry ? (
        <button
          type="button"
          className="mt-3 rounded bg-lacquer px-3 py-1.5 text-sm text-paper"
          onClick={onRetry}
        >
          {t('common.retry')}
        </button>
      ) : null}
    </div>
  );
}
