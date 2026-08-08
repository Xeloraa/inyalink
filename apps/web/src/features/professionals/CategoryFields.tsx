import type { Category, CategorySlug } from '@inyalink/shared';
import { useI18n } from '../../lib/i18n';
import { FIELD_INPUT, FIELD_TEXTAREA } from './fieldStyles';

type CategoryFieldsProps = {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  categorySlug: CategorySlug | '';
  onCategoryChange: (slug: CategorySlug) => void;
  categoryOtherText: string;
  onCategoryOtherTextChange: (value: string) => void;
  categories: Category[];
};

export function CategoryFields({
  displayName,
  onDisplayNameChange,
  categorySlug,
  onCategoryChange,
  categoryOtherText,
  onCategoryOtherTextChange,
  categories,
}: CategoryFieldsProps) {
  const { t, locale } = useI18n();

  return (
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
          onChange={(e) => onDisplayNameChange(e.target.value)}
          className={FIELD_INPUT}
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
                  onChange={() => onCategoryChange(cat.slug)}
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>
      {categorySlug === 'other' ? (
        <div>
          <label
            htmlFor="categoryOtherText"
            className="mb-1.5 block text-caption text-ink-500"
          >
            {t('onboarding.categoryOther')}
          </label>
          <textarea
            id="categoryOtherText"
            value={categoryOtherText}
            onChange={(e) => onCategoryOtherTextChange(e.target.value)}
            rows={3}
            maxLength={200}
            required
            placeholder={t('onboarding.categoryOtherPlaceholder')}
            className={`${FIELD_TEXTAREA} leading-burmese`}
          />
        </div>
      ) : null}
    </>
  );
}
