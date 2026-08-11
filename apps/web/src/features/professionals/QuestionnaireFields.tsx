import { useI18n } from '../../lib/i18n';
import { FIELD_INPUT, FIELD_TEXTAREA } from './fieldStyles';
import { NoIdWarning } from './NoIdWarning';

type QuestionnaireFieldsProps = {
  headlineMy: string;
  onHeadlineMyChange: (value: string) => void;
  headlineEn: string;
  onHeadlineEnChange: (value: string) => void;
  bioMy: string;
  onBioMyChange: (value: string) => void;
  bioEn: string;
  onBioEnChange: (value: string) => void;
  turnaround: number;
  onTurnaroundChange: (value: number) => void;
  minBudget: number;
  onMinBudgetChange: (value: number) => void;
  acceptingWork: boolean;
  onAcceptingWorkChange: (value: boolean) => void;
  /** Hide the amber strip when the parent already shows one. */
  hideNoIdWarning?: boolean;
};

export function QuestionnaireFields({
  headlineMy,
  onHeadlineMyChange,
  headlineEn,
  onHeadlineEnChange,
  bioMy,
  onBioMyChange,
  bioEn,
  onBioEnChange,
  turnaround,
  onTurnaroundChange,
  minBudget,
  onMinBudgetChange,
  acceptingWork,
  onAcceptingWorkChange,
  hideNoIdWarning = false,
}: QuestionnaireFieldsProps) {
  const { t } = useI18n();

  return (
    <>
      <div>
        <label
          htmlFor="headlineMy"
          className="mb-1.5 block text-[12px] text-ink-400"
        >
          {t('onboarding.headlineMy')}
        </label>
        <input
          id="headlineMy"
          value={headlineMy}
          onChange={(e) => onHeadlineMyChange(e.target.value)}
          className={`font-myanmar ${FIELD_INPUT}`}
        />
      </div>
      <div>
        <label
          htmlFor="headlineEn"
          className="mb-1.5 block text-[12px] text-ink-400"
        >
          {t('onboarding.headlineEn')}
        </label>
        <input
          id="headlineEn"
          value={headlineEn}
          onChange={(e) => onHeadlineEnChange(e.target.value)}
          className={FIELD_INPUT}
        />
      </div>
      <div>
        <label
          htmlFor="bioMy"
          className="mb-1.5 block text-[12px] text-ink-400"
        >
          {t('onboarding.bioMy')}
        </label>
        <textarea
          id="bioMy"
          rows={4}
          value={bioMy}
          onChange={(e) => onBioMyChange(e.target.value)}
          className={`font-myanmar ${FIELD_TEXTAREA}`}
        />
      </div>
      <div>
        <label
          htmlFor="bioEn"
          className="mb-1.5 block text-[12px] text-ink-400"
        >
          {t('onboarding.bioEn')}
        </label>
        <textarea
          id="bioEn"
          rows={4}
          value={bioEn}
          onChange={(e) => onBioEnChange(e.target.value)}
          className={FIELD_TEXTAREA}
        />
      </div>
      <label
        id="acceptingWork"
        className="tap-target flex cursor-pointer items-center justify-between gap-md rounded-2md bg-page px-lg text-body text-ink-700 [overflow-wrap:anywhere] [line-height:1.8]"
      >
        <span>{t('onboarding.acceptingWork')}</span>
        <input
          type="checkbox"
          checked={acceptingWork}
          onChange={(e) => onAcceptingWorkChange(e.target.checked)}
          className="h-4 w-4 rounded border-line accent-jade-600"
        />
      </label>
      <div className="grid gap-lg sm:grid-cols-2">
        <div>
          <label
            htmlFor="turnaround"
            className="mb-1.5 block text-[12px] text-ink-400"
          >
            {t('onboarding.turnaround')}
          </label>
          <input
            id="turnaround"
            type="number"
            min={1}
            max={90}
            value={turnaround}
            onChange={(e) => onTurnaroundChange(Number(e.target.value))}
            className={FIELD_INPUT}
          />
        </div>
        <div>
          <label
            htmlFor="minBudget"
            className="mb-1.5 block text-[12px] text-ink-400"
          >
            {t('onboarding.minBudget')}
          </label>
          <input
            id="minBudget"
            type="number"
            min={10000}
            step={10000}
            value={minBudget}
            onChange={(e) => onMinBudgetChange(Number(e.target.value))}
            className={FIELD_INPUT}
          />
        </div>
      </div>
      {hideNoIdWarning ? null : <NoIdWarning />}
    </>
  );
}
