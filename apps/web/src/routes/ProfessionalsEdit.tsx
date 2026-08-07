import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type {
  Category,
  CategorySlug,
  PortfolioItem,
  ProfessionalMe,
  ProfessionalUpdateInput,
} from '@inyalink/shared';
import {
  addMyPortfolioItem,
  deleteMyPortfolioItem,
  getCategories,
  getMyProfessional,
  updateMyProfessional,
} from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { useI18n } from '../lib/i18n';
import { RequireAuth } from '../components/RequireAuth';
import { CategoryFields } from '../features/professionals/CategoryFields';
import { PortfolioFields } from '../features/professionals/PortfolioFields';
import { QuestionnaireFields } from '../features/professionals/QuestionnaireFields';
import { SkillsFields } from '../features/professionals/SkillsFields';

function EditForm({ initial }: { initial: ProfessionalMe }) {
  const { t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [categorySlug, setCategorySlug] = useState<CategorySlug | ''>(
    initial.category?.slug ?? '',
  );
  const [skills, setSkills] = useState<string[]>(initial.skills);
  const [skillDraft, setSkillDraft] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(initial.portfolio);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [portfolioCaption, setPortfolioCaption] = useState('');
  const [headlineMy, setHeadlineMy] = useState(initial.headlineMy ?? '');
  const [headlineEn, setHeadlineEn] = useState(initial.headlineEn ?? '');
  const [bioMy, setBioMy] = useState(initial.bioMy ?? '');
  const [bioEn, setBioEn] = useState(initial.bioEn ?? '');
  const [turnaround, setTurnaround] = useState(
    initial.stats.typicalTurnaroundDays ?? 5,
  );
  const [minBudget, setMinBudget] = useState(
    initial.stats.minBudgetMmk ?? 100_000,
  );
  const [acceptingWork, setAcceptingWork] = useState(initial.acceptingWork);

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

  async function onAddPortfolio() {
    const url = portfolioUrl.trim();
    if (!url) return;
    setError(null);
    try {
      const item = await addMyPortfolioItem({
        externalUrl: url,
        caption: portfolioCaption.trim() || undefined,
      });
      setPortfolio((prev) => [...prev, item]);
      setPortfolioUrl('');
      setPortfolioCaption('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('edit.saveError'));
    }
  }

  async function onRemovePortfolio(index: number) {
    const item = portfolio[index];
    if (!item) return;
    setError(null);
    try {
      await deleteMyPortfolioItem(item.id);
      setPortfolio((prev) => prev.filter((_, j) => j !== index));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('edit.saveError'));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!categorySlug || skills.length < 1) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const body: ProfessionalUpdateInput = {
        displayName: displayName.trim(),
        categorySlug,
        skills,
        headlineMy: headlineMy.trim(),
        headlineEn: headlineEn.trim(),
        bioMy: bioMy.trim(),
        bioEn: bioEn.trim(),
        typicalTurnaroundDays: turnaround,
        minBudgetMmk: minBudget,
        acceptingWork,
      };
      const updated = await updateMyProfessional(body);
      setPortfolio(updated.portfolio);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('edit.saveError'));
    } finally {
      setLoading(false);
    }
  }

  const statusLabel =
    initial.status === 'approved'
      ? t('edit.statusApproved')
      : initial.status === 'pending'
        ? t('edit.statusPending')
        : initial.status === 'paused'
          ? t('edit.statusPaused')
          : t('edit.statusRejected');

  return (
    <section className="mx-auto max-w-lg space-y-2xl py-2xl md:py-3xl">
      <div>
        <p className="text-caption font-medium text-ink-400">{statusLabel}</p>
        <h1 className="mt-sm text-display-sm text-ink-900">{t('edit.title')}</h1>
        <p className="mt-sm text-body text-ink-500">{t('edit.subhead')}</p>
      </div>

      <form className="space-y-2xl" onSubmit={(e) => void onSubmit(e)}>
        <fieldset className="space-y-lg">
          <legend className="text-title text-ink-900">
            {t('onboarding.stepCategory')}
          </legend>
          <CategoryFields
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            categorySlug={categorySlug}
            onCategoryChange={setCategorySlug}
            categories={categories}
          />
        </fieldset>

        <fieldset className="space-y-lg">
          <legend className="text-title text-ink-900">
            {t('onboarding.stepSkills')}
          </legend>
          <SkillsFields
            categorySlug={categorySlug}
            skills={skills}
            skillDraft={skillDraft}
            onSkillDraftChange={setSkillDraft}
            onToggleSkill={toggleSkill}
            onAddDraft={() => {
              const next = skillDraft.trim();
              if (!next) return;
              toggleSkill(next);
              setSkillDraft('');
            }}
          />
        </fieldset>

        <fieldset className="space-y-lg">
          <legend className="text-title text-ink-900">
            {t('onboarding.stepPortfolio')}
          </legend>
          <PortfolioFields
            portfolioUrl={portfolioUrl}
            onPortfolioUrlChange={setPortfolioUrl}
            portfolioCaption={portfolioCaption}
            onPortfolioCaptionChange={setPortfolioCaption}
            portfolio={portfolio.map((p) => ({
              externalUrl: p.externalUrl ?? '',
              caption: p.caption ?? undefined,
            }))}
            onAdd={() => void onAddPortfolio()}
            onRemove={(i) => void onRemovePortfolio(i)}
          />
        </fieldset>

        <fieldset className="space-y-lg">
          <legend className="text-title text-ink-900">
            {t('onboarding.stepQuestionnaire')}
          </legend>
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
        </fieldset>

        {error ? (
          <p className="text-body-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-body-sm text-jade-800" role="status">
            {t('edit.saved')}
          </p>
        ) : null}

        <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/app/briefs"
            className="tap-target text-body-sm text-ink-500 transition-colors hover:text-jade-600"
          >
            {t('edit.backToFeed')}
          </Link>
          <button
            type="submit"
            disabled={loading || !categorySlug || skills.length < 1}
            className="tap-target rounded-md bg-jade-600 px-xl text-body font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800 disabled:bg-ink-300"
          >
            {loading ? t('common.loading') : t('edit.save')}
          </button>
        </div>
      </form>
    </section>
  );
}

function EditLoader() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<ProfessionalMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getMyProfessional()
      .then((me) => {
        if (!cancelled) setProfile(me);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setError('missing');
        } else {
          setError(err instanceof ApiError ? err.message : t('edit.loadError'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (error === 'missing') {
    return <Navigate to="/professionals/join" replace />;
  }

  if (error) {
    return (
      <p className="py-3xl text-center text-body text-danger" role="alert">
        {error}
      </p>
    );
  }

  if (!profile) {
    return (
      <p className="py-3xl text-center text-body text-ink-500" role="status">
        {t('common.loading')}
      </p>
    );
  }

  return <EditForm initial={profile} />;
}

export default function ProfessionalsEdit() {
  return (
    <RequireAuth>
      <EditLoader />
    </RequireAuth>
  );
}
