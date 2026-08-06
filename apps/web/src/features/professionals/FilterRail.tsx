import type { Category, SkillFacet } from '@inyalink/shared';
import { useI18n } from '../../lib/i18n';
import { BudgetSlider } from './BudgetSlider';
import type { BrowseFilters } from './filters';

function CheckboxRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="tap-target flex cursor-pointer items-center gap-sm rounded-sm px-xs text-body-sm text-ink-700 transition-colors duration-fast ease-out hover:text-ink-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-[18px] w-[18px] shrink-0 cursor-pointer rounded-sm border-line accent-jade-600 focus-visible:shadow-focus"
      />
      <span className="[overflow-wrap:anywhere]">{label}</span>
    </label>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-caption font-medium tracking-[0.06em] text-ink-500">
      {children}
    </p>
  );
}

/**
 * "Clear filters · N" link used in the desktop rail header and the mobile
 * sheet footer. Muted and inert until at least one filter is active.
 */
export function ClearFiltersButton({
  activeCount,
  onClear,
}: {
  activeCount: number;
  onClear: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClear}
      disabled={activeCount === 0}
      className={`tap-target inline-flex items-center gap-xs whitespace-nowrap rounded-sm text-body-sm transition-colors duration-fast ease-out focus-visible:shadow-focus ${
        activeCount === 0
          ? 'cursor-default text-ink-300'
          : 'text-jade-600 hover:text-jade-400 active:text-jade-800'
      }`}
    >
      {t('browse.clearFilters')}
      {activeCount > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-jade-100 px-xs text-caption font-semibold text-jade-800">
          {activeCount}
        </span>
      ) : null}
    </button>
  );
}

/**
 * The four filter sections (category, skills, budget, availability), layout
 * agnostic so the same markup serves the sticky desktop rail and the mobile
 * bottom sheet. Filtering applies immediately on change.
 */
export function FilterRail({
  categories,
  skills,
  filters,
  onChange,
}: {
  categories: Category[];
  skills: SkillFacet[];
  filters: BrowseFilters;
  onChange: (next: BrowseFilters) => void;
}) {
  const { t, locale } = useI18n();

  function toggleIn<T>(list: T[], item: T): T[] {
    return list.includes(item)
      ? list.filter((v) => v !== item)
      : [...list, item];
  }

  return (
    <div className="flex flex-col gap-lg">
      <fieldset>
        <legend className="sr-only">{t('browse.categories')}</legend>
        <SectionLabel>{t('browse.categories')}</SectionLabel>
        <ul className="mt-xs">
          {categories.map((cat) => (
            <li key={cat.id}>
              <CheckboxRow
                label={locale === 'en' ? cat.nameEn : cat.nameMy}
                checked={filters.categories.includes(cat.slug)}
                onToggle={() =>
                  onChange({
                    ...filters,
                    categories: toggleIn(filters.categories, cat.slug),
                  })
                }
              />
            </li>
          ))}
        </ul>
      </fieldset>

      {skills.length > 0 ? (
        <fieldset className="border-t border-line-soft pt-lg">
          <legend className="sr-only">{t('browse.skills')}</legend>
          <SectionLabel>{t('browse.skills')}</SectionLabel>
          <ul className="mt-xs">
            {skills.map((skill) => (
              <li key={skill.name}>
                <CheckboxRow
                  label={skill.name}
                  checked={filters.skills.includes(skill.name)}
                  onToggle={() =>
                    onChange({
                      ...filters,
                      skills: toggleIn(filters.skills, skill.name),
                    })
                  }
                />
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      <div className="border-t border-line-soft pt-lg">
        <SectionLabel>{t('browse.budget')}</SectionLabel>
        <div className="mt-xs">
          <BudgetSlider
            value={filters.budget}
            onChange={(budget) => onChange({ ...filters, budget })}
          />
        </div>
      </div>

      <div className="border-t border-line-soft pt-lg">
        <button
          type="button"
          role="switch"
          aria-checked={filters.availableOnly}
          onClick={() =>
            onChange({ ...filters, availableOnly: !filters.availableOnly })
          }
          className="tap-target flex w-full cursor-pointer items-center justify-between gap-md rounded-sm px-xs text-left text-body-sm text-ink-700 transition-colors duration-fast ease-out hover:text-ink-900 focus-visible:shadow-focus"
        >
          <span>{t('browse.acceptingOnly')}</span>
          <span
            aria-hidden
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-base ease-out ${
              filters.availableOnly ? 'bg-jade-600' : 'bg-line'
            }`}
          >
            <span
              className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-[left] duration-base ease-out motion-reduce:transition-none ${
                filters.availableOnly ? 'left-[23px]' : 'left-[3px]'
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );
}
