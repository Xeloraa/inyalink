import { useEffect, useState } from 'react';
import { BriefDraftSchema, type BriefDraft } from '@inyalink/shared';
import { useI18n } from '../../lib/i18n';

type BriefSummaryCardProps = {
  draft: BriefDraft;
  goal: string;
  busy?: boolean;
  error?: string | null;
  onChange: (draft: BriefDraft) => void;
  onFindMatches: (urgent: boolean) => void;
};

/** Compact editable brief summary rendered in the chat transcript. */
export function BriefSummaryCard({
  draft,
  goal,
  busy,
  error,
  onChange,
  onFindMatches,
}: BriefSummaryCardProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState(draft.title ?? '');
  const [category, setCategory] = useState(draft.category ?? '');
  const [description, setDescription] = useState(
    draft.description ?? goal,
  );
  const [budgetMin, setBudgetMin] = useState(
    draft.budget_min_mmk !== undefined ? String(draft.budget_min_mmk) : '',
  );
  const [budgetMax, setBudgetMax] = useState(
    draft.budget_max_mmk !== undefined ? String(draft.budget_max_mmk) : '',
  );
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    setTitle(draft.title ?? '');
    setCategory(draft.category ?? '');
    setDescription(draft.description ?? goal);
    setBudgetMin(
      draft.budget_min_mmk !== undefined ? String(draft.budget_min_mmk) : '',
    );
    setBudgetMax(
      draft.budget_max_mmk !== undefined ? String(draft.budget_max_mmk) : '',
    );
  }, [draft, goal]);

  function commit(partial: {
    title?: string;
    category?: string;
    description?: string;
    budgetMin?: string;
    budgetMax?: string;
  }) {
    const nextTitle = partial.title ?? title;
    const nextCategory = partial.category ?? category;
    const nextDescription = partial.description ?? description;
    const nextMin = partial.budgetMin ?? budgetMin;
    const nextMax = partial.budgetMax ?? budgetMax;
    const parsed = BriefDraftSchema.safeParse({
      language: draft.language ?? 'my',
      title: nextTitle.trim() || undefined,
      category: nextCategory.trim() || undefined,
      description: nextDescription.trim() || undefined,
      requirements: draft.requirements,
      budget_min_mmk: nextMin
        ? Number.parseInt(nextMin, 10)
        : undefined,
      budget_max_mmk: nextMax
        ? Number.parseInt(nextMax, 10)
        : undefined,
      deadline: draft.deadline,
      reference_links: draft.reference_links,
      ai_confidence: draft.ai_confidence,
      needs_human_review: draft.needs_human_review,
    });
    if (!parsed.success) return;
    onChange(parsed.data);
  }

  const fieldClass =
    'mt-xs w-full rounded-sm border border-line bg-paper px-sm py-xs text-body-sm leading-burmese outline-none focus:border-jade-400 focus:shadow-focus';

  return (
    <div className="w-full max-w-[86%] rounded-md border border-line bg-white px-md py-md">
      <p className="text-caption font-medium text-ink-500">{t('brief.title')}</p>
      <label className="mt-sm block text-caption text-ink-500">
        {t('brief.fieldTitle')}
        <input
          className={fieldClass}
          value={title}
          disabled={busy}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => commit({ title })}
        />
      </label>
      <label className="mt-sm block text-caption text-ink-500">
        {t('brief.fieldCategory')}
        <input
          className={fieldClass}
          value={category}
          disabled={busy}
          onChange={(e) => setCategory(e.target.value)}
          onBlur={() => commit({ category })}
        />
      </label>
      <label className="mt-sm block text-caption text-ink-500">
        {t('brief.fieldDescription')}
        <textarea
          rows={2}
          className={`${fieldClass} resize-none`}
          value={description}
          disabled={busy}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => commit({ description })}
        />
      </label>
      <div className="mt-sm grid grid-cols-2 gap-sm">
        <label className="block text-caption text-ink-500">
          {t('brief.fieldBudgetMin')}
          <input
            inputMode="numeric"
            className={fieldClass}
            value={budgetMin}
            disabled={busy}
            onChange={(e) => setBudgetMin(e.target.value)}
            onBlur={() => commit({ budgetMin })}
          />
        </label>
        <label className="block text-caption text-ink-500">
          {t('brief.fieldBudgetMax')}
          <input
            inputMode="numeric"
            className={fieldClass}
            value={budgetMax}
            disabled={busy}
            onChange={(e) => setBudgetMax(e.target.value)}
            onBlur={() => commit({ budgetMax })}
          />
        </label>
      </div>
      <label className="mt-md flex items-start gap-sm text-caption leading-burmese text-ink-500">
        <input
          type="checkbox"
          className="mt-1"
          checked={urgent}
          disabled={busy}
          onChange={(e) => setUrgent(e.target.checked)}
        />
        <span>
          <span className="font-medium text-ink-900">{t('brief.urgent')}</span>
        </span>
      </label>
      {error ? (
        <p className="mt-sm text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          commit({});
          onFindMatches(urgent);
        }}
        className="tap-target mt-md w-full rounded-md bg-jade-600 px-md py-sm text-body-sm font-medium text-white hover:bg-jade-400 focus-visible:shadow-focus disabled:opacity-40"
      >
        {t('brief.findMatches')}
      </button>
    </div>
  );
}
