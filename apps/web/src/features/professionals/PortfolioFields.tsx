import { useI18n } from '../../lib/i18n';
import { FIELD_INPUT } from './fieldStyles';

export type PortfolioDraftItem = {
  externalUrl: string;
  caption?: string;
};

type PortfolioFieldsProps = {
  portfolioUrl: string;
  onPortfolioUrlChange: (value: string) => void;
  portfolioCaption: string;
  onPortfolioCaptionChange: (value: string) => void;
  portfolio: PortfolioDraftItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
};

export function PortfolioFields({
  portfolioUrl,
  onPortfolioUrlChange,
  portfolioCaption,
  onPortfolioCaptionChange,
  portfolio,
  onAdd,
  onRemove,
}: PortfolioFieldsProps) {
  const { t } = useI18n();

  return (
    <>
      <p className="text-body-sm text-ink-500">{t('onboarding.portfolioHelp')}</p>
      <div>
        <label
          htmlFor="portfolio"
          className="mb-1.5 block text-caption text-ink-500"
        >
          {t('onboarding.portfolioUrl')}
        </label>
        <input
          id="portfolio"
          type="url"
          value={portfolioUrl}
          onChange={(e) => onPortfolioUrlChange(e.target.value)}
          placeholder="https://…"
          className={FIELD_INPUT}
        />
      </div>
      <div>
        <label
          htmlFor="portfolioCaption"
          className="mb-1.5 block text-caption text-ink-500"
        >
          {t('onboarding.portfolioCaption')}
        </label>
        <input
          id="portfolioCaption"
          value={portfolioCaption}
          onChange={(e) => onPortfolioCaptionChange(e.target.value)}
          className={FIELD_INPUT}
        />
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="tap-target rounded-md border border-line px-lg text-body-sm transition-colors duration-fast ease-out hover:border-jade-400 focus-visible:shadow-focus"
      >
        {t('onboarding.addPortfolio')}
      </button>
      {portfolio.length > 0 ? (
        <ul className="space-y-sm">
          {portfolio.map((item, i) => (
            <li
              key={`${item.externalUrl}-${i}`}
              className="flex items-center justify-between gap-md rounded-sm border border-line-soft px-md py-sm text-body-sm"
            >
              <span className="truncate text-ink-700">
                {item.caption ?? item.externalUrl}
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="tap-target shrink-0 rounded-md px-md text-ink-400 transition-colors hover:text-danger focus-visible:shadow-focus"
              >
                {t('onboarding.remove')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-caption text-ink-400">{t('onboarding.noIdDocs')}</p>
    </>
  );
}
