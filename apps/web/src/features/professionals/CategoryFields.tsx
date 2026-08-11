import type { Category, CategorySlug } from '@inyalink/shared';
import { useI18n } from '../../lib/i18n';
import {
  FIELD_INPUT,
  FIELD_PILL_ACTIVE,
  FIELD_PILL_IDLE,
  FIELD_TEXTAREA,
} from './fieldStyles';

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
          className="mb-1.5 block text-[12px] text-ink-400"
        >
          {t('onboarding.displayName')}
        </label>
        <input
          id="displayName"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          className={FIELD_INPUT}
        />
      </div>
      <fieldset id="category">
        <legend className="mb-md text-[12px] text-ink-400">
          {t('onboarding.category')}
        </legend>
        <div className="flex flex-wrap gap-sm">
          {categories.map((cat) => {
            const label = locale === 'en' ? cat.nameEn : cat.nameMy;
            const active = categorySlug === cat.slug;
            return (
              <label
                key={cat.id}
                className={`cursor-pointer ${active ? FIELD_PILL_ACTIVE : FIELD_PILL_IDLE}`}
              >
                <input
                  type="radio"
                  name="category"
                  className="sr-only"
                  checked={active}
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
            className="mb-1.5 block text-[12px] text-ink-400"
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
