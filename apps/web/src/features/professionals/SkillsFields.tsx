import type { CategorySlug } from '@inyalink/shared';
import { useI18n } from '../../lib/i18n';
import {
  FIELD_BTN_SECONDARY,
  FIELD_INPUT,
  FIELD_PILL_ACTIVE,
  FIELD_PILL_IDLE,
  SKILL_SUGGESTIONS,
} from './fieldStyles';

type SkillsFieldsProps = {
  categorySlug: CategorySlug | '';
  skills: string[];
  skillDraft: string;
  onSkillDraftChange: (value: string) => void;
  onToggleSkill: (skill: string) => void;
  onAddDraft: () => void;
};

export function SkillsFields({
  categorySlug,
  skills,
  skillDraft,
  onSkillDraftChange,
  onToggleSkill,
  onAddDraft,
}: SkillsFieldsProps) {
  const { t } = useI18n();
  const suggestions = categorySlug ? SKILL_SUGGESTIONS[categorySlug] : [];

  return (
    <>
      <p className="text-[13px] leading-[1.8] text-ink-500">
        {t('onboarding.skillsHelp')}
      </p>
      <div className="flex flex-wrap gap-sm">
        {suggestions.map((skill) => {
          const active = skills.includes(skill);
          return (
            <button
              key={skill}
              type="button"
              onClick={() => onToggleSkill(skill)}
              className={active ? FIELD_PILL_ACTIVE : FIELD_PILL_IDLE}
            >
              {skill}
            </button>
          );
        })}
      </div>
      <div>
        <label
          htmlFor="skills"
          className="mb-1.5 block text-[12px] text-ink-400"
        >
          {t('onboarding.addSkill')}
        </label>
        <div className="flex gap-sm">
          <input
            id="skills"
            value={skillDraft}
            onChange={(e) => onSkillDraftChange(e.target.value)}
            placeholder={t('onboarding.skillPlaceholder')}
            className={`min-w-0 flex-1 ${FIELD_INPUT}`}
          />
          <button
            type="button"
            onClick={onAddDraft}
            className={FIELD_BTN_SECONDARY}
          >
            +
          </button>
        </div>
      </div>
      {skills.length > 0 ? (
        <ul className="flex flex-wrap gap-sm">
          {skills.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => onToggleSkill(s)}
                className="tap-target inline-flex items-center rounded-full bg-jade-100 px-md py-1.5 text-[13px] font-medium text-jade-800 transition-colors duration-fast ease-out hover:bg-jade-50 focus-visible:shadow-focus"
              >
                {s} ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
