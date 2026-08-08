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

  function canContinue(): boolean {
    if (step === 0) {
      if (!categorySlug || displayName.trim().length < 2) return false;
      if (categorySlug === 'other' && categoryOtherText.trim().length < 2) {
        return false;
      }
      return true;
    }
    if (step === 1) return skills.length >= 1;
    if (step === 2) return portfolio.length >= 1;
    return (
      headlineMy.trim().length >= 4 &&
      headlineEn.trim().length >= 4 &&
      bioMy.trim().length >= 20 &&
      bioEn.trim().length >= 20 &&
      turnaround >= 1 &&
      minBudget >= 10_000
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!categorySlug || !canContinue()) return;
    setLoading(true);
    setError(null);
    try {
      const body: ProfessionalApplyInput = {
        displayName: displayName.trim(),
        categorySlug,
        ...(categorySlug === 'other'
          ? { categoryOtherText: categoryOtherText.trim() }
          : {}),
        skills,
        headlineMy: headlineMy.trim(),
        headlineEn: headlineEn.trim(),
        bioMy: bioMy.trim(),
        bioEn: bioEn.trim(),
        typicalTurnaroundDays: turnaround,
        minBudgetMmk: minBudget,
        acceptingWork,
        portfolio,
      };
      const result = await applyAsProfessional(body);
      setDone(result);
      onApplied?.(result);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('onboarding.submitError'),
      );
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
            if (canContinue()) setStep((s) => (s + 1) as Step);
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
            disabled={loading || !canContinue()}
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
