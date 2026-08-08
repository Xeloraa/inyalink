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
import { PortfolioFields, type PortfolioDraftItem } from './PortfolioFields';
import { QuestionnaireFields } from './QuestionnaireFields';
import { SkillsFields } from './SkillsFields';

type Step = 0 | 1 | 2 | 3;

type JoinWizardProps = {
  onApplied?: (result: ProfessionalApplyResponse) => void;
};

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
    return (
      <section className="mx-auto max-w-md py-3xl text-center">
        <h1 className="text-display-sm text-ink-900">
          {approved ? t('onboarding.doneTitleApproved') : t('onboarding.doneTitle')}
        </h1>
        <p className="mt-sm text-body text-ink-500">
          {approved ? t('onboarding.doneBodyApproved') : t('onboarding.doneBody')}
        </p>
        <div className="mt-2xl flex flex-col items-center gap-sm">
          {approved ? (
            <Link
              to="/professionals/me/edit"
              className="tap-target inline-flex items-center justify-center rounded-md bg-jade-600 px-xl text-body font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus"
            >
              {t('onboarding.editProfile')}
            </Link>
          ) : null}
          <Link
            to={approved ? '/app/briefs' : '/'}
            className={
              approved
                ? 'tap-target text-body-sm text-ink-500 transition-colors hover:text-jade-600'
                : 'tap-target inline-flex items-center justify-center rounded-md bg-jade-600 px-xl text-body font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus'
            }
          >
            {approved ? t('onboarding.doneCtaFeed') : t('onboarding.doneCta')}
          </Link>
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

  return (
    <section className="mx-auto max-w-lg py-2xl md:py-3xl">
      <p className="text-caption font-medium text-ink-400">
        {`${t('onboarding.progress')} ${step + 1} / 4 — ${stepLabels[step]}`}
      </p>
      <h1 className="mt-sm text-display-sm text-ink-900">
        {t('onboarding.title')}
      </h1>
      <p className="mt-sm text-body text-ink-500">{t('onboarding.subhead')}</p>

      <div className="mt-xl flex gap-xs" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i <= step ? 'bg-jade-600' : 'bg-line'
            }`}
          />
        ))}
      </div>

      <form
        className="mt-2xl space-y-lg"
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
          />
        ) : null}

        {error ? (
          <p className="text-body-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {step === 3 && blockers.length > 0 ? (
          <div
            className="rounded-md border border-danger/30 bg-[rgba(192,69,60,0.06)] px-md py-md"
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
            className="rounded-md border border-line bg-jade-50 px-md py-md"
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

        <div className="flex flex-col gap-sm pt-md sm:flex-row sm:justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="tap-target rounded-md px-xl text-body-sm text-ink-500 transition-colors duration-fast ease-out hover:text-jade-600 focus-visible:shadow-focus"
            >
              {t('common.back')}
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={
              loading || (step === 0 ? !canSubmit : step === 3 ? !canSubmit : false)
            }
            className="tap-target rounded-md bg-jade-600 px-xl text-body font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800 disabled:bg-ink-300 sm:ml-auto"
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
