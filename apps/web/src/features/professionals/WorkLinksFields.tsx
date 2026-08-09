import type { WorkLink, WorkLinkPlatform } from '@inyalink/shared';
import { useI18n } from '../../lib/i18n';
import { WorkLinkIcon } from './WorkLinkIcon';

const PLATFORMS: WorkLinkPlatform[] = [
  'github',
  'behance',
  'dribbble',
  'website',
  'instagram',
  'facebook',
  'linkedin',
  'other',
];

function platformLabel(
  t: (key: string) => string,
  platform: WorkLinkPlatform,
  label: string | null,
): string {
  if (platform === 'other' && label) return label;
  return t(`workLinks.platform.${platform}`);
}

type WorkLinksDisplayProps = {
  links: WorkLink[];
};

export function WorkLinksDisplay({ links }: WorkLinksDisplayProps) {
  const { t } = useI18n();
  if (links.length === 0) return null;

  return (
    <ul className="mt-lg flex flex-wrap gap-sm">
      {links.map((link) => (
        <li key={link.id}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="tap-target inline-flex items-center gap-xs rounded-sm border border-line bg-white px-md text-caption text-ink-700 transition-colors duration-fast ease-out hover:border-jade-400 hover:text-jade-800 focus-visible:shadow-focus"
          >
            <span className="text-ink-500">
              <WorkLinkIcon platform={link.platform} />
            </span>
            {platformLabel(t, link.platform, link.label)}
          </a>
        </li>
      ))}
    </ul>
  );
}

type WorkLinksEditorProps = {
  links: WorkLink[];
  platform: WorkLinkPlatform;
  onPlatformChange: (p: WorkLinkPlatform) => void;
  url: string;
  onUrlChange: (v: string) => void;
  label: string;
  onLabelChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  busy?: boolean;
};

export function WorkLinksEditor({
  links,
  platform,
  onPlatformChange,
  url,
  onUrlChange,
  label,
  onLabelChange,
  onAdd,
  onRemove,
  busy,
}: WorkLinksEditorProps) {
  const { t } = useI18n();

  return (
    <>
      <p className="text-body-sm text-ink-500">{t('workLinks.help')}</p>
      <div className="grid gap-md sm:grid-cols-2">
        <div>
          <label
            htmlFor="workLinkPlatform"
            className="mb-1.5 block text-caption text-ink-500"
          >
            {t('workLinks.platform')}
          </label>
          <select
            id="workLinkPlatform"
            value={platform}
            onChange={(e) =>
              onPlatformChange(e.target.value as WorkLinkPlatform)
            }
            className="tap-target w-full rounded-md border border-line bg-white px-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {t(`workLinks.platform.${p}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="workLinks"
            className="mb-1.5 block text-caption text-ink-500"
          >
            {t('workLinks.url')}
          </label>
          <input
            id="workLinks"
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://"
            className="tap-target w-full rounded-md border border-line bg-white px-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
          />
        </div>
      </div>
      {platform === 'other' ? (
        <div>
          <label
            htmlFor="workLinkLabel"
            className="mb-1.5 block text-caption text-ink-500"
          >
            {t('workLinks.label')}
          </label>
          <input
            id="workLinkLabel"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            className="tap-target w-full rounded-md border border-line bg-white px-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
          />
        </div>
      ) : null}
      <button
        type="button"
        disabled={busy || !url.trim()}
        onClick={onAdd}
        className="tap-target rounded-md border border-line px-lg text-body-sm transition-colors duration-fast ease-out hover:border-jade-400 focus-visible:shadow-focus disabled:opacity-40"
      >
        {t('workLinks.add')}
      </button>
      {links.length > 0 ? (
        <ul className="space-y-sm">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-center justify-between gap-md rounded-sm border border-line-soft px-md py-sm text-body-sm"
            >
              <span className="inline-flex min-w-0 items-center gap-xs truncate text-ink-700">
                <WorkLinkIcon platform={link.platform} />
                <span className="truncate">
                  {platformLabel(t, link.platform, link.label)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(link.id)}
                disabled={busy}
                className="shrink-0 text-ink-400 transition-colors hover:text-danger focus-visible:shadow-focus disabled:opacity-40"
              >
                {t('onboarding.remove')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-caption text-ink-400">{t('workLinks.noScrape')}</p>
    </>
  );
}
