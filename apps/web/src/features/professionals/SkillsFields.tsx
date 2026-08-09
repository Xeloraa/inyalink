import type { CategorySlug } from '@inyalink/shared';
import { useI18n } from '../../lib/i18n';
import { FIELD_INPUT } from './fieldStyles';
import { SKILL_SUGGESTIONS } from './fieldStyles';

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
      <p className="text-body-sm text-ink-500">{t('onboarding.skillsHelp')}</p>
      <div className="flex flex-wrap gap-sm">
        {suggestions.map((skill) => (
          <button
            key={skill}
            type="button"
            onClick={() => onToggleSkill(skill)}
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
          id="skills"
          value={skillDraft}
          onChange={(e) => onSkillDraftChange(e.target.value)}
          placeholder={t('onboarding.skillPlaceholder')}
          className={`min-w-0 flex-1 ${FIELD_INPUT}`}
        />
        <button
          type="button"
          onClick={onAddDraft}
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
                onClick={() => onToggleSkill(s)}
                className="tap-target inline-flex items-center rounded-sm bg-jade-100 px-md text-caption text-jade-800"
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
