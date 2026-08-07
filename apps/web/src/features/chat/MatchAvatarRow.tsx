import { Link } from 'react-router-dom';
import type { MatchCandidate } from '@inyalink/shared';
import { useI18n } from '../../lib/i18n';

function initials(name: string): string {
  const parts = name.replace(/·/g, ' ').split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

type MatchAvatarRowProps = {
  matches: MatchCandidate[];
};

/** Up to three circular avatars — tap through to the full profile page. */
export function MatchAvatarRow({ matches }: MatchAvatarRowProps) {
  const { t } = useI18n();
  const top = matches.slice(0, 3);
  if (top.length === 0) return null;

  return (
    <div className="w-full max-w-[86%] space-y-sm">
      <p className="text-caption font-medium text-ink-500">
        {t('matches.title')}
      </p>
      <ul className="flex justify-between gap-sm">
        {top.map((c) => (
          <li key={c.professionalId} className="min-w-0 flex-1">
            <Link
              to={`/professionals/${c.professionalId}`}
              className="tap-target flex flex-col items-center gap-xs rounded-md px-xs py-sm text-center transition-colors duration-fast ease-out hover:bg-jade-50 focus-visible:shadow-focus"
            >
              {c.avatarUrl ? (
                <img
                  src={c.avatarUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-jade-600 text-body-sm font-semibold text-white"
                  aria-hidden
                >
                  {initials(c.displayName)}
                </span>
              )}
              <span className="line-clamp-2 w-full text-caption font-medium leading-burmese text-ink-900 [overflow-wrap:anywhere]">
                {c.displayName}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
