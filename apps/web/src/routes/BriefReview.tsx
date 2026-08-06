import { BriefDraftSchema, type BriefDraft } from '@inyalink/shared';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { createBrief, submitBrief, updateBrief } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { useDemoFlow } from '../lib/demoFlow';
import { useI18n } from '../lib/i18n';
import { ProgressNotice } from '../components/Notices';

type FormValues = {
  title: string;
  category: string;
  description: string;
  requirementsText: string;
  budget_min_mmk: string;
  budget_max_mmk: string;
  deadline: string;
  urgent: boolean;
};

export default function BriefReview() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { briefDraft, briefId, setBriefDraft, setBriefId, goal } = useDemoFlow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    defaultValues: {
      title: briefDraft.title ?? '',
      category: briefDraft.category ?? 'graphic-design',
      description: briefDraft.description ?? goal,
      requirementsText: (briefDraft.requirements ?? []).join('\n'),
      budget_min_mmk:
        briefDraft.budget_min_mmk !== undefined
          ? String(briefDraft.budget_min_mmk)
          : '',
      budget_max_mmk:
        briefDraft.budget_max_mmk !== undefined
          ? String(briefDraft.budget_max_mmk)
          : '',
      deadline: briefDraft.deadline ?? '',
      urgent: false,
    },
  });

  useEffect(() => {
    if (!goal && !briefDraft.description) {
      void navigate('/');
    }
  }, [goal, briefDraft.description, navigate]);

  async function onSubmit(values: FormValues) {
    setBusy(true);
    setError(null);
    const requirements = values.requirementsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const draft: BriefDraft = BriefDraftSchema.parse({
      language: briefDraft.language ?? 'my',
      title: values.title.trim() || undefined,
      category: values.category.trim() || undefined,
      description: values.description.trim() || undefined,
      requirements: requirements.length ? requirements : undefined,
      budget_min_mmk: values.budget_min_mmk
        ? Number.parseInt(values.budget_min_mmk, 10)
        : undefined,
      budget_max_mmk: values.budget_max_mmk
        ? Number.parseInt(values.budget_max_mmk, 10)
        : undefined,
      deadline: values.deadline || undefined,
    });
    setBriefDraft(draft);

    try {
      const body = {
        source: 'ai_chat' as const,
        raw_input: goal || undefined,
        draft,
      };
      const saved = briefId
        ? await updateBrief(briefId, { draft })
        : await createBrief(body);
      setBriefId(saved.id);
      // DEMO_MODE early-closes on the API — stage path never waits.
      await submitBrief(saved.id, { urgent: values.urgent });
      void navigate(`/matches/${saved.id}`);
    } catch (err) {
      // Matching is DB-only — never surface the AI rate-limit banner here.
      setError(
        err instanceof ApiError ? err.message : t('matches.loadError'),
      );
    } finally {
      setBusy(false);
    }
  }

  const fieldClass =
    'mt-1 w-full rounded-md border border-line bg-paper px-3 py-2.5 leading-[1.8] outline-none focus:border-jade';

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold leading-[1.8]">{t('brief.title')}</h1>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          void form.handleSubmit(onSubmit)(e);
        }}
      >
        <label className="block text-sm">
          {t('brief.fieldTitle')}
          <input className={fieldClass} {...form.register('title')} />
        </label>
        <label className="block text-sm">
          {t('brief.fieldCategory')}
          <input className={fieldClass} {...form.register('category')} />
        </label>
        <label className="block text-sm">
          {t('brief.fieldDescription')}
          <textarea
            rows={4}
            className={fieldClass}
            {...form.register('description')}
          />
        </label>
        <label className="block text-sm">
          {t('brief.fieldRequirements')}
          <textarea
            rows={3}
            className={fieldClass}
            {...form.register('requirementsText')}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            {t('brief.fieldBudgetMin')}
            <input
              inputMode="numeric"
              className={fieldClass}
              {...form.register('budget_min_mmk')}
            />
          </label>
          <label className="block text-sm">
            {t('brief.fieldBudgetMax')}
            <input
              inputMode="numeric"
              className={fieldClass}
              {...form.register('budget_max_mmk')}
            />
          </label>
        </div>
        <label className="block text-sm">
          {t('brief.fieldDeadline')}
          <input type="date" className={fieldClass} {...form.register('deadline')} />
        </label>

        <label className="flex items-start gap-3 text-sm leading-[1.8]">
          <input
            type="checkbox"
            className="mt-1.5"
            {...form.register('urgent')}
          />
          <span>
            <span className="font-medium text-ink-900">{t('brief.urgent')}</span>
            <span className="mt-0.5 block text-ink-500">{t('brief.urgentHelp')}</span>
          </span>
        </label>

        {busy ? <ProgressNotice messageKey="progress.matching" /> : null}
        {error ? (
          <div
            className="rounded-md border border-line bg-paper px-3 py-3 leading-[1.8]"
            role="alert"
          >
            <p className="text-sm text-ink/80">{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-lacquer px-4 py-3 text-paper disabled:opacity-40"
        >
          {t('brief.findMatches')}
        </button>
      </form>
    </section>
  );
}
