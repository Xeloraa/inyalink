import { useI18n } from '../../lib/i18n';

function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.2v.1" />
    </svg>
  );
}

export function NoIdWarning() {
  const { t } = useI18n();

  return (
    <div
      className="mt-md flex gap-2.5 rounded-2md bg-amber-100 px-lg py-md"
      role="note"
    >
      <span className="flex shrink-0 text-amber-800">
        <InfoIcon />
      </span>
      <p className="m-0 text-[12.5px] leading-[1.8] text-amber-800 [overflow-wrap:anywhere]">
        {t('onboarding.noIdDocs')}
      </p>
    </div>
  );
}
