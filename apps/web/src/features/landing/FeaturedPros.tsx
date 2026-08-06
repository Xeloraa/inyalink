import { useI18n } from '../../lib/i18n';
import { Link } from 'react-router-dom';

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

export type FeaturedPro = {
  id: string;
  name: string;
  avatarUrl: string;
  portfolio: string[];
  headlineKey: string;
  locationKey: string;
  completed: number;
  clients: number;
  rate: string;
  response: string;
  skills: string[];
  reasonKey: string;
  verified: boolean;
};

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-sm bg-jade-50 px-md py-md">
      <dt className="whitespace-nowrap text-caption text-ink-500">{label}</dt>
      <dd className="mt-xs whitespace-nowrap text-stat text-jade-600">{value}</dd>
    </div>
  );
}

export function FeaturedProCard({ pro }: { pro: FeaturedPro }) {
  const { t } = useI18n();

  const stats = [
    { label: t('landing.cardStat.jobs'), value: String(pro.completed) },
    { label: t('landing.cardStat.clients'), value: String(pro.clients) },
    { label: t('landing.cardStat.rate'), value: pro.rate },
    { label: t('landing.cardStat.reply'), value: pro.response },
  ];

  return (
    <article className="rounded-lg border border-line bg-white p-5 shadow-md transition-[border-color,box-shadow,transform] duration-fast ease-out hover:-translate-y-1 hover:border-jade-200 hover:shadow-lg focus-within:shadow-focus">
      <Link
        to={`/professionals/${pro.id}`}
        className="block no-underline text-inherit"
      >
      <div className="flex gap-md">
        <img
          src={pro.avatarUrl}
          alt=""
          width={52}
          height={52}
          className="h-[52px] w-[52px] shrink-0 rounded-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-xs">
            <h3 className="text-title text-ink-900">{pro.name}</h3>
            {pro.verified ? (
              <span
                className="inline-flex items-center gap-xs rounded-sm bg-jade-100 px-2.5 py-1 text-caption font-medium text-jade-800"
                title={t('landing.verified')}
              >
                <span className="text-jade-600">
                  <CheckIcon />
                </span>
                {t('landing.verified')}
              </span>
            ) : null}
          </div>
          <p className="mt-xs text-body-sm text-ink-500">{t(pro.headlineKey)}</p>
          <p className="mt-xs flex items-center gap-xs text-caption text-ink-400">
            <PinIcon />
            {t(pro.locationKey)}
          </p>
        </div>
      </div>
      </Link>

      <dl className="mt-lg grid grid-cols-2 gap-md sm:grid-cols-4">
        {stats.map((stat) => (
          <StatCell key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </dl>

      {pro.portfolio.length > 0 ? (
        <ul className="mt-lg grid grid-cols-3 gap-1.5">
          {pro.portfolio.slice(0, 3).map((url) => (
            <li
              key={url}
              className="aspect-square overflow-hidden rounded-sm border border-line bg-jade-50"
            >
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="mt-lg flex flex-wrap gap-sm">
        {pro.skills.map((skill) => (
          <li
            key={skill}
            className="rounded-sm border border-line bg-white px-2.5 py-1 text-caption text-ink-700"
          >
            {skill}
          </li>
        ))}
      </ul>

      <div className="mt-lg rounded-sm bg-jade-50 p-md">
        <p className="text-body-sm text-ink-700">{t(pro.reasonKey)}</p>
      </div>
    </article>
  );
}

/**
 * Seed-aligned featured set. Portfolio thumbs are pre-sized 320px JPEGs
 * (~12-18KB each) styled per discipline: brand work for Min Thet, web
 * layouts for Win Htut, social design for Tun Lin.
 */
export const FEATURED_PROS: FeaturedPro[] = [
  {
    id: 'a0000000-0000-4000-8000-000000000001',
    name: 'မင်းထက် · Min Thet',
    avatarUrl: '/images/avatars/pro01.jpg',
    portfolio: [
      '/images/portfolio/min-thet-1.jpg',
      '/images/portfolio/min-thet-2.jpg',
      '/images/portfolio/min-thet-3.jpg',
    ],
    headlineKey: 'landing.pro1.headline',
    locationKey: 'landing.pro1.location',
    completed: 48,
    clients: 31,
    rate: '98%',
    response: '25m',
    skills: ['logo', 'branding', 'packaging'],
    reasonKey: 'landing.pro1.reason',
    verified: true,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000009',
    name: 'ဝင်းထွဋ် · Win Htut',
    avatarUrl: '/images/avatars/pro09.jpg',
    portfolio: [
      '/images/portfolio/win-htut-1.jpg',
      '/images/portfolio/win-htut-2.jpg',
      '/images/portfolio/win-htut-3.jpg',
    ],
    headlineKey: 'landing.pro2.headline',
    locationKey: 'landing.pro2.location',
    completed: 36,
    clients: 22,
    rate: '96%',
    response: '40m',
    skills: ['html', 'css', 'responsive'],
    reasonKey: 'landing.pro2.reason',
    verified: true,
  },
  {
    id: 'a0000000-0000-4000-8000-00000000000d',
    name: 'ထွန်းလင်း · Tun Lin',
    avatarUrl: '/images/avatars/pro12.jpg',
    portfolio: [
      '/images/portfolio/tun-lin-1.jpg',
      '/images/portfolio/tun-lin-2.jpg',
      '/images/portfolio/tun-lin-3.jpg',
    ],
    headlineKey: 'landing.pro3.headline',
    locationKey: 'landing.pro3.location',
    completed: 29,
    clients: 18,
    rate: '100%',
    response: '1h',
    skills: ['facebook', 'instagram', 'calendar'],
    reasonKey: 'landing.pro3.reason',
    verified: true,
  },
];
