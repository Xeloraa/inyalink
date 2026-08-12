import type { Category, CategorySlug } from '@inyalink/shared';
import { useI18n } from '../../lib/i18n';

function pillClass(active: boolean): string {
  return `tap-target inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-lg text-body-sm font-medium transition-colors duration-fast ease-out focus-visible:shadow-focus ${
    active
      ? 'bg-jade-600 text-white'
      : 'border border-line bg-white text-ink-700 hover:border-jade-400'
  }`;
}

/**
 * Single-select quick category filter. Advanced multi-category selection
 * still lives in the Filters sheet — this is the one-tap common case.
 */
export function CategoryPills({
  categories,
  selected,
  onSelect,
}: {
  categories: Category[];
  selected: CategorySlug | null;
  onSelect: (slug: CategorySlug | null) => void;
}) {
  const { t, locale } = useI18n();

  return (
    <div
      role="group"
      aria-label={t('browse.categories')}
      className="no-scrollbar -mx-[22px] flex gap-sm overflow-x-auto px-[22px] pb-0.5"
    >
      <button
        type="button"
        aria-pressed={selected === null}
        onClick={() => onSelect(null)}
        className={pillClass(selected === null)}
      >
        {t('browse.categoryAll')}
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          aria-pressed={selected === cat.slug}
          onClick={() => onSelect(cat.slug)}
          className={pillClass(selected === cat.slug)}
        >
          {locale === 'en' ? cat.nameEn : cat.nameMy}
        </button>
      ))}
    </div>
  );
}
