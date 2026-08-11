import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  Category,
  CategorySlug,
  ProfessionalApplyInput,
  ProfessionalApplyResponse,
} from '@inyalink/shared';
import { applyAsProfessional, getCategories } from '../../lib/api';
import { ApiError } from '../../lib/apiClient';
import { useI18n } from '../../lib/i18n';
import { CategoryFields } from './CategoryFields';
import { NoIdWarning } from './NoIdWarning';
import { PortfolioFields, type PortfolioDraftItem } from './PortfolioFields';
import { QuestionnaireFields } from './QuestionnaireFields';
import { SkillsFields } from './SkillsFields';

type Step = 0 | 1 | 2 | 3;

type JoinWizardProps = {
  onApplied?: (result: ProfessionalApplyResponse) => void;
};

function PendingDot({ done }: { done: boolean }) {
  return (
    <span
      className={`mt-[5px] block h-3.5 w-3.5 shrink-0 rounded-full ${
        done ? 'bg-jade-600' : 'bg-jade-100'
      }`}
      aria-hidden
    />
  );
}

export function JoinWizard({ onApplied }: JoinWizardProps) {
  const { t } = useI18n();

  const [step, setStep] = useState<Step>(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<ProfessionalApplyResponse | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [categorySlug, setCategorySlug] = useState<CategorySlug | ''>('');
  const [categoryOtherText, setCategoryOtherText] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [portfolioCaption, setPortfolioCaption] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioDraftItem[]>([]);
  const [headlineMy, setHeadlineMy] = useState('');
  const [headlineEn, setHeadlineEn] = useState('');
  const [bioMy, setBioMy] = useState('');
  const [bioEn, setBioEn] = useState('');
  const [turnaround, setTurnaround] = useState(5);
  const [minBudget, setMinBudget] = useState(100_000);
  const [acceptingWork, setAcceptingWork] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getCategories()
      .then((res) => {
        if (!cancelled) setCategories(res.categories);
      })
      .catch(() => {
        if (!cancelled) setError(t('onboarding.categoriesError'));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : prev.length >= 12
          ? prev
          : [...prev, skill],
    );
  }

  function addSkillDraft() {
    const next = skillDraft.trim();
    if (!next) return;
    toggleSkill(next);
    setSkillDraft('');
  }

  function addPortfolioItem() {
    const url = portfolioUrl.trim();
    if (!url) return;
    setPortfolio((prev) => [
      ...prev,
      { externalUrl: url, caption: portfolioCaption.trim() || undefined },
    ]);
    setPortfolioUrl('');
    setPortfolioCaption('');
  }

  /** Only category (and Other free-text) block the wizard. */
  function submissionBlockers(): string[] {
    const blockers: string[] = [];
    if (!categorySlug) blockers.push(t('onboarding.category'));
    if (categorySlug === 'other' && categoryOtherText.trim().length < 2) {
      blockers.push(t('onboarding.categoryOther'));
    }
    return blockers;
  }

  const blockers = submissionBlockers();
  const canSubmit = blockers.length === 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!categorySlug || !canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const body: ProfessionalApplyInput = {
        categorySlug,
        ...(displayName.trim().length >= 2
          ? { displayName: displayName.trim() }
          : {}),
        ...(categorySlug === 'other'
          ? { categoryOtherText: categoryOtherText.trim() }
          : {}),
        skills,
        ...(headlineMy.trim() ? { headlineMy: headlineMy.trim() } : {}),
        ...(headlineEn.trim() ? { headlineEn: headlineEn.trim() } : {}),
        ...(bioMy.trim() ? { bioMy: bioMy.trim() } : {}),
        ...(bioEn.trim() ? { bioEn: bioEn.trim() } : {}),
        typicalTurnaroundDays: turnaround,
        minBudgetMmk: minBudget,
        acceptingWork,
        portfolio,
      };
      const result = await applyAsProfessional(body);
      setDone(result);
      onApplied?.(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.message
            ? `${err.code}: ${err.message}`
            : t('onboarding.submitError'),
        );
      } else {
        setError(t('onboarding.submitError'));
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    const approved = done.status === 'approved';
    if (approved) {
      return (
        <section className="mx-auto max-w-[620px] py-3xl">
          <div className="rounded-[22px] bg-white p-[28px] text-center shadow-md">
            <h1 className="font-display text-display-sm font-semibold text-ink-900">
              {t('onboarding.doneTitleApproved')}
            </h1>
            <p className="mt-sm text-body leading-[1.8] text-ink-500">
              {t('onboarding.doneBodyApproved')}
            </p>
            <div className="mt-2xl flex flex-col items-center gap-sm sm:flex-row sm:justify-center">
              <Link
                to="/professionals/me/edit"
                className="tap-target inline-flex h-12 items-center justify-center rounded-full bg-jade-600 px-xl text-[14.5px] font-semibold text-white shadow-cta transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus"
              >
                {t('onboarding.editProfile')}
              </Link>
              <Link
                to="/app/briefs"
                className="tap-target inline-flex h-12 items-center justify-center rounded-full bg-line-soft px-xl text-[14px] font-semibold text-ink-700 transition-colors duration-fast ease-out hover:bg-hover focus-visible:shadow-focus"
              >
                {t('onboarding.doneCtaFeed')}
              </Link>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="mx-auto max-w-[620px] py-[44px]">
        <div className="rounded-[22px] bg-white p-[28px] shadow-md">
          <span className="inline-flex items-center gap-sm rounded-full bg-amber-100 px-[13px] py-1.5 text-[11.5px] font-bold leading-[1.6] text-amber-800">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
              aria-hidden
            />
            {t('edit.statusPending')}
          </span>
          <h1 className="mt-lg font-display text-[clamp(22px,2.8vw,28px)] font-semibold leading-[1.7] text-ink-900 [overflow-wrap:anywhere]">
            {t('onboarding.doneTitle')}
          </h1>
          <p className="mt-sm text-[14px] leading-[1.8] text-ink-500">
            {t('onboarding.doneBody')}
          </p>

          <ol className="mt-2xl flex flex-col gap-0.5" aria-hidden>
            <li className="flex gap-lg">
              <div className="flex w-[26px] shrink-0 flex-col items-center">
                <PendingDot done />
                <span className="mt-0.5 w-0.5 flex-1 min-h-[20px] bg-jade-100" />
              </div>
              <div className="min-w-0 flex-1 pb-lg">
                <div className="font-myanmar text-[14.5px] font-semibold leading-[1.7] text-ink-900">
                  {t('onboarding.doneTitle')}
                </div>
              </div>
            </li>
            <li className="flex gap-lg">
              <div className="flex w-[26px] shrink-0 flex-col items-center">
                <PendingDot done />
                <span className="mt-0.5 w-0.5 flex-1 min-h-[20px] bg-jade-100" />
              </div>
              <div className="min-w-0 flex-1 pb-lg">
                <div className="font-myanmar text-[14.5px] font-semibold leading-[1.7] text-ink-900">
                  {t('edit.statusPending')}
                </div>
              </div>
            </li>
            <li className="flex gap-lg">
              <div className="flex w-[26px] shrink-0 flex-col items-center">
                <PendingDot done={false} />
              </div>
              <div className="min-w-0 flex-1 pb-lg">
                <div className="font-myanmar text-[14.5px] font-semibold leading-[1.7] text-ink-400">
                  {t('edit.statusApproved')}
                </div>
              </div>
            </li>
          </ol>

          <div className="mt-sm flex flex-wrap gap-2.5">
            <Link
              to="/"
              className="tap-target inline-flex h-12 items-center justify-center rounded-full bg-line-soft px-[22px] text-[14px] font-semibold text-ink-700 transition-colors duration-fast ease-out hover:bg-hover focus-visible:shadow-focus"
            >
              {t('onboarding.doneCta')}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const stepLabels = [
    t('onboarding.stepCategory'),
    t('onboarding.stepSkills'),
    t('onboarding.stepPortfolio'),
    t('onboarding.stepQuestionnaire'),
  ];

  const stepHelps = [
    t('onboarding.subhead'),
    t('onboarding.skillsHelp'),
    t('onboarding.portfolioHelp'),
    t('onboarding.subhead'),
  ];

  return (
    <section className="mx-auto max-w-[620px] py-2xl md:py-[34px]">
      <h1 className="font-display text-[clamp(24px,3vw,30px)] font-semibold leading-[1.7] text-ink-900 [overflow-wrap:anywhere]">
        {t('onboarding.title')}
      </h1>
      <p className="mt-xs text-[14px] leading-[1.8] text-ink-500">
        {t('onboarding.subhead')}
      </p>

      <div className="mt-2xl flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="min-w-0 flex-1">
            <div
              className={`h-1 rounded-full ${
                i <= step ? 'bg-jade-600' : 'bg-jade-100'
              }`}
            />
            <div
              className={`mt-[7px] text-[11px] leading-[1.6] [overflow-wrap:anywhere] ${
                i === step
                  ? 'font-bold text-jade-600'
                  : 'font-normal text-ink-400'
              }`}
            >
              {stepLabels[i]}
            </div>
          </div>
        ))}
      </div>

      <form
        className="mt-lg rounded-xl2 bg-white p-xl shadow-md"
        onSubmit={(e) => {
          if (step < 3) {
            e.preventDefault();
            // Steps after category are optional — always allow Continue.
            // Step 0 still needs a category before leaving.
            if (step === 0 && !canSubmit) return;
            setStep((s) => (s + 1) as Step);
            return;
          }
          void onSubmit(e);
        }}
      >
        <h2 className="text-[17px] font-semibold leading-[1.7] text-ink-900">
          {stepLabels[step]}
        </h2>
        <p className="mt-xs text-[13px] leading-[1.8] text-ink-500">
          {stepHelps[step]}
        </p>

        <div className="mt-lg space-y-lg">
          {step === 0 ? (
            <CategoryFields
              displayName={displayName}
              onDisplayNameChange={setDisplayName}
              categorySlug={categorySlug}
              onCategoryChange={(slug) => {
                setCategorySlug(slug);
                if (slug !== 'other') setCategoryOtherText('');
              }}
              categoryOtherText={categoryOtherText}
              onCategoryOtherTextChange={setCategoryOtherText}
              categories={categories}
            />
          ) : null}

          {step === 1 ? (
            <SkillsFields
              categorySlug={categorySlug}
              skills={skills}
              skillDraft={skillDraft}
              onSkillDraftChange={setSkillDraft}
              onToggleSkill={toggleSkill}
              onAddDraft={addSkillDraft}
            />
          ) : null}

          {step === 2 ? (
            <PortfolioFields
              portfolioUrl={portfolioUrl}
              onPortfolioUrlChange={setPortfolioUrl}
              portfolioCaption={portfolioCaption}
              onPortfolioCaptionChange={setPortfolioCaption}
              portfolio={portfolio}
              onAdd={addPortfolioItem}
              onRemove={(i) =>
                setPortfolio((prev) => prev.filter((_, j) => j !== i))
              }
              hideNoIdWarning
            />
          ) : null}

          {step === 3 ? (
            <QuestionnaireFields
              headlineMy={headlineMy}
              onHeadlineMyChange={setHeadlineMy}
              headlineEn={headlineEn}
              onHeadlineEnChange={setHeadlineEn}
              bioMy={bioMy}
              onBioMyChange={setBioMy}
              bioEn={bioEn}
              onBioEnChange={setBioEn}
              turnaround={turnaround}
              onTurnaroundChange={setTurnaround}
              minBudget={minBudget}
              onMinBudgetChange={setMinBudget}
              acceptingWork={acceptingWork}
              onAcceptingWorkChange={setAcceptingWork}
              hideNoIdWarning
            />
          ) : null}
        </div>

        <NoIdWarning />

        {error ? (
          <p className="mt-md text-body-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {step === 3 && blockers.length > 0 ? (
          <div
            className="mt-md rounded-2md border border-danger/30 bg-[rgba(192,69,60,0.06)] px-md py-md"
            role="status"
          >
            <p className="text-body-sm font-medium text-danger">
              {t('onboarding.blockersTitle')}
            </p>
            <ul className="mt-sm list-disc space-y-xs pl-lg text-body-sm text-ink-700">
              {blockers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {step === 0 && blockers.length > 0 ? (
          <div
            className="mt-md rounded-2md bg-jade-50 px-md py-md"
            role="status"
          >
            <p className="text-body-sm font-medium text-ink-700">
              {t('onboarding.blockersTitle')}
            </p>
            <ul className="mt-sm list-disc space-y-xs pl-lg text-body-sm text-ink-700">
              {blockers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-2xl flex gap-2.5">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="tap-target h-12 shrink-0 rounded-full bg-line-soft px-xl text-[14.5px] font-semibold text-ink-700 transition-colors duration-fast ease-out hover:bg-hover focus-visible:shadow-focus"
            >
              {t('common.back')}
            </button>
          ) : (
            <Link
              to="/"
              className="tap-target inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-line-soft px-xl text-[14.5px] font-semibold text-ink-700 no-underline transition-colors duration-fast ease-out hover:bg-hover focus-visible:shadow-focus"
            >
              {t('common.back')}
            </Link>
          )}
          <button
            type="submit"
            disabled={
              loading ||
              (step === 0 ? !canSubmit : step === 3 ? !canSubmit : false)
            }
            className="tap-target h-12 flex-1 rounded-full bg-jade-600 text-[15px] font-semibold text-white shadow-cta transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800 disabled:bg-ink-300 disabled:shadow-none"
          >
            {loading
              ? t('common.loading')
              : step < 3
                ? t('common.continue')
                : t('onboarding.submit')}
          </button>
        </div>
      </form>
    </section>
  );
}
