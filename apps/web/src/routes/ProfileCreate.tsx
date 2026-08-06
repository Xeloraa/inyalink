import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type {
  Category,
  CategorySlug,
  ProfessionalApplyInput,
} from '@inyalink/shared';
import { applyAsProfessional, getCategories } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { useI18n } from '../lib/i18n';

type Step = 0 | 1 | 2 | 3 | 4;

const SKILL_SUGGESTIONS: Record<CategorySlug, string[]> = {
  'graphic-design': ['logo', 'branding', 'packaging', 'illustration', 'print'],
  photography: ['product', 'food', 'event', 'portrait', 'interior'],
  'web-development': ['html', 'css', 'responsive', 'wordpress', 'landing'],
  'social-media-marketing': [
    'facebook',
    'instagram',
    'copywriting',
    'calendar',
    'ads',
  ],
};

export default function ProfileCreate() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [categorySlug, setCategorySlug] = useState<CategorySlug | ''>('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [portfolioCaption, setPortfolioCaption] = useState('');
  const [portfolio, setPortfolio] = useState<
    Array<{ externalUrl: string; caption?: string }>
  >([]);
  const [headlineMy, setHeadlineMy] = useState('');
  const [headlineEn, setHeadlineEn] = useState('');
  const [bioMy, setBioMy] = useState('');
  const [bioEn, setBioEn] = useState('');
  const [turnaround, setTurnaround] = useState(5);
  const [minBudget, setMinBudget] = useState(100_000);
  const [acceptingWork, setAcceptingWork] = useState(true);
  const [clientPreference, setClientPreference] = useState('');

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
    if (step === 0) return Boolean(categorySlug) && displayName.trim().length >= 2;
    if (step === 1) return skills.length >= 1;
    if (step === 2) return portfolio.length >= 1;
    if (step === 3) {
      return (
        headlineMy.trim().length >= 4 &&
        headlineEn.trim().length >= 4 &&
        bioMy.trim().length >= 20 &&
        bioEn.trim().length >= 20
      );
    }
    return turnaround >= 1 && minBudget >= 10_000;
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
        skills,
        headlineMy: headlineMy.trim(),
        headlineEn: headlineEn.trim(),
        bioMy: bioMy.trim(),
        bioEn: bioEn.trim(),
        typicalTurnaroundDays: turnaround,
        minBudgetMmk: minBudget,
        acceptingWork,
        clientPreference: clientPreference.trim() || undefined,
        portfolio,
      };
      await applyAsProfessional(body);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('onboarding.submitError'),
      );
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <section className="mx-auto max-w-md py-3xl text-center">
        <h1 className="text-display-sm text-ink-900">
          {t('onboarding.doneTitle')}
        </h1>
        <p className="mt-sm text-body text-ink-500">{t('onboarding.doneBody')}</p>
        <Link
          to="/"
          className="tap-target mt-2xl inline-flex items-center justify-center rounded-md bg-jade-600 px-xl text-body font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus"
        >
          {t('onboarding.doneCta')}
        </Link>
      </section>
    );
  }

  const suggestions = categorySlug ? SKILL_SUGGESTIONS[categorySlug] : [];
  const stepLabels = [
    t('onboarding.stepCategory'),
    t('onboarding.stepSkills'),
    t('onboarding.stepPortfolio'),
    t('onboarding.stepBio'),
    t('onboarding.stepAvailability'),
  ];

  return (
    <section className="mx-auto max-w-lg py-2xl md:py-3xl">
      <p className="text-caption font-medium text-ink-400">
        {`${t('onboarding.progress')} ${step + 1} / 5 — ${stepLabels[step]}`}
      </p>
      <h1 className="mt-sm text-display-sm text-ink-900">
        {t('onboarding.title')}
      </h1>
      <p className="mt-sm text-body text-ink-500">{t('onboarding.subhead')}</p>

      <div className="mt-xl flex gap-xs" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
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
          if (step < 4) {
            e.preventDefault();
            if (canContinue()) setStep((s) => (s + 1) as Step);
            return;
          }
          void onSubmit(e);
        }}
      >
        {step === 0 ? (
          <>
            <div>
              <label
                htmlFor="displayName"
                className="mb-1.5 block text-caption text-ink-500"
              >
                {t('onboarding.displayName')}
              </label>
              <input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="tap-target w-full rounded-md border border-line bg-white px-md text-body text-ink-900 outline-none focus:border-jade-400 focus:shadow-focus"
                required
              />
            </div>
            <fieldset>
              <legend className="mb-md text-caption text-ink-500">
                {t('onboarding.category')}
              </legend>
              <div className="grid gap-sm">
                {categories.map((cat) => {
                  const label = locale === 'en' ? cat.nameEn : cat.nameMy;
                  return (
                    <label
                      key={cat.id}
                      className={`tap-target flex cursor-pointer items-center rounded-md border px-lg transition-colors duration-fast ease-out ${
                        categorySlug === cat.slug
                          ? 'border-jade-600 bg-jade-50 text-jade-800'
                          : 'border-line bg-white text-ink-700 hover:border-jade-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        className="sr-only"
                        checked={categorySlug === cat.slug}
                        onChange={() => setCategorySlug(cat.slug)}
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <p className="text-body-sm text-ink-500">{t('onboarding.skillsHelp')}</p>
            <div className="flex flex-wrap gap-sm">
              {suggestions.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`tap-target rounded-sm border px-md text-caption transition-colors duration-fast ease-out focus-visible:shadow-focus ${
                    skills.includes(skill)
                      ? 'border-jade-600 bg-jade-100 text-jade-800'
                      : 'border-line bg-white text-ink-700 hover:border-jade-400'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
            <div className="flex gap-sm">
              <input
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                placeholder={t('onboarding.skillPlaceholder')}
                className="tap-target min-w-0 flex-1 rounded-md border border-line bg-white px-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
              />
              <button
                type="button"
                onClick={addSkillDraft}
                className="tap-target rounded-md border border-line px-lg text-body-sm transition-colors duration-fast ease-out hover:border-jade-400 focus-visible:shadow-focus"
              >
                {t('onboarding.addSkill')}
              </button>
            </div>
            {skills.length > 0 ? (
              <ul className="flex flex-wrap gap-sm">
                {skills.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => toggleSkill(s)}
                      className="rounded-sm bg-jade-100 px-2.5 py-1 text-caption text-jade-800"
                    >
                      {s} ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className="text-body-sm text-ink-500">
              {t('onboarding.portfolioHelp')}
            </p>
            <div>
              <label
                htmlFor="portfolioUrl"
                className="mb-1.5 block text-caption text-ink-500"
              >
                {t('onboarding.portfolioUrl')}
              </label>
              <input
                id="portfolioUrl"
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="/images/portfolio/01.svg"
                className="tap-target w-full rounded-md border border-line bg-white px-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
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
                onChange={(e) => setPortfolioCaption(e.target.value)}
                className="tap-target w-full rounded-md border border-line bg-white px-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
              />
            </div>
            <button
              type="button"
              onClick={addPortfolioItem}
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
                      onClick={() =>
                        setPortfolio((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="shrink-0 text-ink-400 transition-colors hover:text-danger focus-visible:shadow-focus"
                    >
                      {t('onboarding.remove')}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-caption text-ink-400">
              {t('onboarding.noIdDocs')}
            </p>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div>
              <label
                htmlFor="headlineMy"
                className="mb-1.5 block text-caption text-ink-500"
              >
                {t('onboarding.headlineMy')}
              </label>
              <input
                id="headlineMy"
                value={headlineMy}
                onChange={(e) => setHeadlineMy(e.target.value)}
                className="tap-target font-myanmar w-full rounded-md border border-line bg-white px-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
                required
              />
            </div>
            <div>
              <label
                htmlFor="headlineEn"
                className="mb-1.5 block text-caption text-ink-500"
              >
                {t('onboarding.headlineEn')}
              </label>
              <input
                id="headlineEn"
                value={headlineEn}
                onChange={(e) => setHeadlineEn(e.target.value)}
                className="tap-target w-full rounded-md border border-line bg-white px-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
                required
              />
            </div>
            <div>
              <label
                htmlFor="bioMy"
                className="mb-1.5 block text-caption text-ink-500"
              >
                {t('onboarding.bioMy')}
              </label>
              <textarea
                id="bioMy"
                rows={4}
                value={bioMy}
                onChange={(e) => setBioMy(e.target.value)}
                className="font-myanmar w-full rounded-md border border-line bg-white px-md py-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
                required
              />
            </div>
            <div>
              <label
                htmlFor="bioEn"
                className="mb-1.5 block text-caption text-ink-500"
              >
                {t('onboarding.bioEn')}
              </label>
              <textarea
                id="bioEn"
                rows={4}
                value={bioEn}
                onChange={(e) => setBioEn(e.target.value)}
                className="w-full rounded-md border border-line bg-white px-md py-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
                required
              />
            </div>
            <p className="text-caption text-ink-400">{t('onboarding.noIdDocs')}</p>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <label className="tap-target flex cursor-pointer items-center justify-between gap-md rounded-md border border-line bg-white px-lg text-body text-ink-700">
              <span>{t('onboarding.acceptingWork')}</span>
              <input
                type="checkbox"
                checked={acceptingWork}
                onChange={(e) => setAcceptingWork(e.target.checked)}
                className="h-4 w-4 rounded border-line accent-jade-600"
              />
            </label>
            <div className="grid gap-lg sm:grid-cols-2">
              <div>
                <label
                  htmlFor="turnaround"
                  className="mb-1.5 block text-caption text-ink-500"
                >
                  {t('onboarding.turnaround')}
                </label>
                <input
                  id="turnaround"
                  type="number"
                  min={1}
                  max={90}
                  value={turnaround}
                  onChange={(e) => setTurnaround(Number(e.target.value))}
                  className="tap-target w-full rounded-md border border-line bg-white px-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
                />
              </div>
              <div>
                <label
                  htmlFor="minBudget"
                  className="mb-1.5 block text-caption text-ink-500"
                >
                  {t('onboarding.minBudget')}
                </label>
                <input
                  id="minBudget"
                  type="number"
                  min={10000}
                  step={10000}
                  value={minBudget}
                  onChange={(e) => setMinBudget(Number(e.target.value))}
                  className="tap-target w-full rounded-md border border-line bg-white px-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="pref"
                className="mb-1.5 block text-caption text-ink-500"
              >
                {t('onboarding.clientPref')}
              </label>
              <textarea
                id="pref"
                rows={3}
                value={clientPreference}
                onChange={(e) => setClientPreference(e.target.value)}
                className="w-full rounded-md border border-line bg-white px-md py-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
              />
            </div>
          </>
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
              : step < 4
                ? t('common.continue')
                : t('onboarding.submit')}
          </button>
        </div>
      </form>
    </section>
  );
}
