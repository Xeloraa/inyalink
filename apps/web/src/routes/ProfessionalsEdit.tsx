import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type {
  Category,
  CategorySlug,
  PortfolioItem,
  ProfessionalMe,
  ProfessionalUpdateInput,
  WorkLink,
  WorkLinkPlatform,
} from '@inyalink/shared';
import { computeProfessionalCompleteness } from '@inyalink/shared';
import {
  addMyPortfolioItem,
  addMyWorkLink,
  deleteMyPortfolioItem,
  deleteMyWorkLink,
  getCategories,
  getMyProfessional,
  updateMyProfessional,
} from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { useI18n } from '../lib/i18n';
import { RequireAuth } from '../features/auth/RequireAuth';
import { CategoryFields } from '../features/professionals/CategoryFields';
import { PortfolioFields } from '../features/professionals/PortfolioFields';
import {
  ProfileCompleteness,
  focusCompletenessAnchor,
} from '../features/professionals/ProfileCompleteness';
import { QuestionnaireFields } from '../features/professionals/QuestionnaireFields';
import { SkillsFields } from '../features/professionals/SkillsFields';
import { WorkLinksEditor } from '../features/professionals/WorkLinksFields';

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
  const [categoryOtherText, setCategoryOtherText] = useState(
    initial.categoryOtherText ?? '',
  );
  const [skills, setSkills] = useState<string[]>(initial.skills);
  const [skillDraft, setSkillDraft] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(initial.portfolio);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [portfolioCaption, setPortfolioCaption] = useState('');
  const [workLinks, setWorkLinks] = useState<WorkLink[]>(initial.workLinks);
  const [workPlatform, setWorkPlatform] = useState<WorkLinkPlatform>('website');
  const [workUrl, setWorkUrl] = useState('');
  const [workLabel, setWorkLabel] = useState('');
  const [workBusy, setWorkBusy] = useState(false);
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

  useEffect(() => {
    const focusFromHash = () => {
      const anchor = window.location.hash.replace(/^#/, '');
      if (!anchor) return;
      // Wait a tick so field ids are in the DOM after first paint.
      window.requestAnimationFrame(() => focusCompletenessAnchor(anchor));
    };
    focusFromHash();
    window.addEventListener('hashchange', focusFromHash);
    return () => window.removeEventListener('hashchange', focusFromHash);
  }, []);

  const completeness = computeProfessionalCompleteness({
    displayName,
    categorySlug: categorySlug || null,
    categoryOtherText,
    skills,
    portfolioCount: portfolio.length,
    workLinksCount: workLinks.length,
    headlineMy,
    headlineEn,
    bioMy,
    bioEn,
    acceptingWork,
    typicalTurnaroundDays: turnaround,
    minBudgetMmk: minBudget,
  });

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

  async function onAddWorkLink() {
    const url = workUrl.trim();
    if (!url) return;
    setWorkBusy(true);
    setError(null);
    try {
      const link = await addMyWorkLink({
        platform: workPlatform,
        url,
        label: workPlatform === 'other' ? workLabel.trim() || undefined : undefined,
      });
      setWorkLinks((prev) => [...prev, link]);
      setWorkUrl('');
      setWorkLabel('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('edit.saveError'));
    } finally {
      setWorkBusy(false);
    }
  }

  async function onRemoveWorkLink(id: string) {
    setWorkBusy(true);
    setError(null);
    try {
      await deleteMyWorkLink(id);
      setWorkLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('edit.saveError'));
    } finally {
      setWorkBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!categorySlug || skills.length < 1) return;
    if (categorySlug === 'other' && categoryOtherText.trim().length < 2) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const body: ProfessionalUpdateInput = {
        displayName: displayName.trim(),
        categorySlug,
        categoryOtherText:
          categorySlug === 'other' ? categoryOtherText.trim() : null,
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

  const initialChar = displayName.trim().slice(0, 1) || '·';
  const isPending = initial.status === 'pending';

  return (
    <section className="mx-auto max-w-[760px] space-y-lg py-2xl md:py-3xl">
      <div>
        <h1 className="font-display text-[clamp(24px,3vw,32px)] font-semibold leading-[1.7] text-ink-900">
          {t('edit.title')}
        </h1>
        <p className="mt-xs text-[14px] leading-[1.8] text-ink-500">
          {t('edit.subhead')}
        </p>
      </div>

      {isPending ? (
        <div className="rounded-xl2 bg-white p-[22px] shadow-md">
          <span className="inline-flex items-center gap-sm rounded-full bg-amber-100 px-[13px] py-1.5 text-[11.5px] font-bold leading-[1.6] text-amber-800">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
              aria-hidden
            />
            {statusLabel}
          </span>
          <p className="mt-md text-[13.5px] leading-[1.8] text-ink-500">
            {t('onboarding.doneBody')}
          </p>
        </div>
      ) : null}

      <div className="rounded-xl2 bg-white p-[22px] shadow-md">
        <div className="flex flex-wrap items-center gap-lg">
          <span
            className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full bg-jade-100 font-display text-[28px] font-semibold text-jade-600"
            aria-hidden
          >
            {initialChar}
          </span>
          <div className="min-w-[180px] flex-1">
            <div className="text-[12px] leading-[1.6] text-ink-400">
              {t('edit.title')}
            </div>
            <div className="mt-xs flex flex-wrap items-center gap-sm">
              <span className="rounded-full bg-jade-100 px-md py-[5px] text-[12px] font-bold leading-[1.6] text-jade-800">
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-xl">
          <ProfileCompleteness
            percent={completeness.percent}
            missing={completeness.missing}
            mode="edit"
          />
        </div>
      </div>

      <form className="space-y-lg" onSubmit={(e) => void onSubmit(e)}>
        <fieldset className="space-y-lg rounded-xl2 bg-white p-[22px] shadow-md">
          <legend className="px-xs text-[15px] font-bold tracking-[0.02em] text-ink-900">
            {t('onboarding.stepCategory')}
          </legend>
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
        </fieldset>

        <fieldset className="space-y-lg rounded-xl2 bg-white p-[22px] shadow-md">
          <legend className="px-xs text-[15px] font-bold tracking-[0.02em] text-ink-900">
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

        <fieldset className="space-y-lg rounded-xl2 bg-white p-[22px] shadow-md">
          <legend className="px-xs text-[15px] font-bold tracking-[0.02em] text-ink-900">
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

        <fieldset className="space-y-lg rounded-xl2 bg-white p-[22px] shadow-md">
          <legend className="px-xs text-[15px] font-bold tracking-[0.02em] text-ink-900">
            {t('workLinks.title')}
          </legend>
          <WorkLinksEditor
            links={workLinks}
            platform={workPlatform}
            onPlatformChange={setWorkPlatform}
            url={workUrl}
            onUrlChange={setWorkUrl}
            label={workLabel}
            onLabelChange={setWorkLabel}
            onAdd={() => void onAddWorkLink()}
            onRemove={(id) => void onRemoveWorkLink(id)}
            busy={workBusy}
          />
        </fieldset>

        <fieldset className="space-y-lg rounded-xl2 bg-white p-[22px] shadow-md">
          <legend className="px-xs text-[15px] font-bold tracking-[0.02em] text-ink-900">
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
          <p className="text-[13px] font-semibold text-jade-600" role="status">
            {t('edit.saved')}
          </p>
        ) : null}

        <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/app/briefs"
            className="tap-target text-body-sm text-ink-500 transition-colors hover:text-jade-600"
          >
            {t('edit.backToFeed')}
          </Link>
          <button
            type="submit"
            disabled={
              loading ||
              !categorySlug ||
              skills.length < 1 ||
              (categorySlug === 'other' && categoryOtherText.trim().length < 2)
            }
            className="tap-target h-12 rounded-full bg-jade-600 px-xl text-[14.5px] font-semibold text-white shadow-cta transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800 disabled:bg-ink-300 disabled:shadow-none"
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    void getMyProfessional()
      .then((me) => {
        setProfile(me);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError('missing');
        } else {
          setError(err instanceof ApiError ? err.message : t('edit.loadError'));
        }
        setLoading(false);
      });
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  if (error === 'missing') {
    return <Navigate to="/professionals/join" replace />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[760px] py-3xl">
        <div className="rounded-xl2 bg-white p-xl text-center shadow-md">
          <p
            className="text-body leading-[1.8] text-ink-700 [overflow-wrap:anywhere]"
            role="alert"
          >
            {error}
          </p>
          <div className="mt-lg flex justify-center">
            <button
              type="button"
              onClick={load}
              className="tap-target h-12 rounded-full bg-jade-600 px-xl text-[14px] font-semibold text-white shadow-cta"
            >
              {t('common.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !profile) {
    return (
      <div className="mx-auto max-w-[760px] py-3xl" role="status">
        <div className="rounded-xl2 bg-white p-xl text-center shadow-md">
          <p className="text-body text-ink-500">{t('common.loading')}</p>
        </div>
      </div>
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
