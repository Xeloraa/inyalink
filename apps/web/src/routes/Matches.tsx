import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  Engagement,
  MatchCandidate,
  MatchingCandidatesResponse,
} from '@inyalink/shared';
import {
  createEngagement,
  getMatchCandidates,
  getMatchExplanation,
  listEngagementsForBrief,
} from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { useI18n } from '../lib/i18n';
import { ProgressNotice } from '../components/Notices';
import { Avatar, PortfolioThumbs } from '../components/ProVisuals';

type CandidateView = MatchCandidate & {
  explanationRetryable?: boolean;
  explanationNotice?: string;
};

function engagementForPro(
  engagements: Engagement[],
  professionalId: string,
): Engagement | undefined {
  return engagements.find((e) => e.professionalId === professionalId);
}

export default function Matches() {
  const { briefId = '' } = useParams();
  const { t, locale } = useI18n();
  const [payload, setPayload] = useState<MatchingCandidatesResponse | null>(
    null,
  );
  const [candidates, setCandidates] = useState<CandidateView[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [explaining, setExplaining] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [proposeBusy, setProposeBusy] = useState<string | null>(null);
  const [proposeError, setProposeError] = useState<string | null>(null);

  const loadCandidates = useCallback(async () => {
    if (!briefId) return;
    setLoadingList(true);
    setListError(null);

    let loaded: MatchCandidate[] = [];
    try {
      const [result, eng] = await Promise.all([
        getMatchCandidates(briefId),
        listEngagementsForBrief(briefId).catch(() => ({ engagements: [] })),
      ]);
      setPayload(result);
      loaded = result.candidates;
      setCandidates(loaded);
      setEngagements(eng.engagements);
    } catch (err) {
      setListError(
        err instanceof ApiError ? err.message : t('matches.loadError'),
      );
      setLoadingList(false);
      return;
    } finally {
      setLoadingList(false);
    }

    if (loaded.length === 0) return;
    setExplaining(true);
    await Promise.all(
      loaded.map(async (c) => {
        try {
          const expl = await getMatchExplanation(
            briefId,
            c.professionalId,
            locale,
          );
          setCandidates((prev) =>
            prev.map((row) =>
              row.professionalId === c.professionalId
                ? {
                    ...row,
                    explanation: expl.explanation,
                    explanationRetryable: expl.retryable,
                    explanationNotice: expl.notice,
                  }
                : row,
            ),
          );
        } catch {
          setCandidates((prev) =>
            prev.map((row) =>
              row.professionalId === c.professionalId
                ? {
                    ...row,
                    explanation: null,
                    explanationRetryable: true,
                    explanationNotice: t('rateLimit.body'),
                  }
                : row,
            ),
          );
        }
      }),
    );
    setExplaining(false);
  }, [briefId, locale, t]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  // Refresh after declines/backfill while any proposal is outstanding.
  useEffect(() => {
    if (!briefId) return;
    const hasProposed = engagements.some((e) => e.status === 'proposed');
    if (!hasProposed && payload?.status !== 'ready') return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const [result, eng] = await Promise.all([
            getMatchCandidates(briefId),
            listEngagementsForBrief(briefId),
          ]);
          setPayload(result);
          setCandidates((prev) => {
            const byId = new Map(prev.map((c) => [c.professionalId, c]));
            return result.candidates.map((c) => ({
              ...c,
              explanation: byId.get(c.professionalId)?.explanation ?? null,
              explanationRetryable: byId.get(c.professionalId)
                ?.explanationRetryable,
              explanationNotice: byId.get(c.professionalId)?.explanationNotice,
            }));
          });
          setEngagements(eng.engagements);
        } catch {
          /* keep showing last good list */
        }
      })();
    }, 12_000);
    return () => window.clearInterval(id);
  }, [briefId, engagements, payload?.status]);

  async function onPropose(professionalId: string) {
    if (!briefId) return;
    setProposeBusy(professionalId);
    setProposeError(null);
    try {
      const eng = await createEngagement({ briefId, professionalId });
      setEngagements((prev) => {
        const others = prev.filter((e) => e.professionalId !== professionalId);
        return [...others, eng];
      });
    } catch (err) {
      setProposeError(
        err instanceof ApiError ? err.message : t('matches.proposeError'),
      );
    } finally {
      setProposeBusy(null);
    }
  }

  const heading =
    payload?.status === 'ready'
      ? payload.showInterestCount
        ? t('matches.ofInterested')
            .replace('{count}', String(candidates.length))
            .replace('{n}', String(payload.interestedCount))
        : t('matches.rankedByFit')
      : t('matches.title');

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold leading-[1.8]">{heading}</h1>
        <Link to="/brief" className="text-sm text-jade hover:underline">
          {t('common.back')}
        </Link>
      </div>

      {loadingList ? <ProgressNotice messageKey="progress.matching" /> : null}
      {listError ? (
        <div
          className="rounded-md border border-line bg-paper px-3 py-3 leading-[1.8]"
          role="alert"
        >
          <p className="text-sm text-ink/80">{listError}</p>
          <button
            type="button"
            className="mt-3 rounded bg-jade-600 px-3 py-1.5 text-sm text-white"
            onClick={() => void loadCandidates()}
          >
            {t('common.retry')}
          </button>
        </div>
      ) : null}
      {proposeError ? (
        <p className="text-sm text-danger" role="alert">
          {proposeError}
        </p>
      ) : null}

      {payload?.status === 'waiting' ? (
        <div className="rounded-lg border border-line bg-paper p-5 leading-[1.8]">
          <p className="text-ink-900">{t('matches.waitingTitle')}</p>
          <p className="mt-2 text-sm text-ink-500">{t('matches.waitingBody')}</p>
        </div>
      ) : null}

      {explaining ? <ProgressNotice messageKey="progress.explaining" /> : null}

      <ul className="space-y-5">
        {candidates.map((c) => {
          const headline =
            locale === 'en'
              ? (c.headlineEn ?? c.headlineMy)
              : (c.headlineMy ?? c.headlineEn);
          const eng = engagementForPro(engagements, c.professionalId);
          return (
            <li
              key={c.professionalId}
              className="rounded-lg border border-line bg-paper p-5 shadow-[0_1px_0_rgba(20,34,31,0.04)]"
            >
              <div className="flex gap-4">
                {c.avatarUrl ? (
                  <img
                    src={c.avatarUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <Avatar name={c.displayName} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold leading-[1.8]">
                      <Link
                        to={`/professionals/${c.professionalId}`}
                        className="text-ink-900 hover:text-jade-600"
                      >
                        {c.displayName}
                      </Link>
                    </h2>
                    {c.guaranteedResponse ? (
                      <span className="rounded-sm bg-jade-100 px-2 py-0.5 text-caption font-medium text-jade-800">
                        {t('matches.guaranteed')}
                      </span>
                    ) : null}
                  </div>
                  {headline ? (
                    <p className="text-sm leading-[1.8] text-ink/70">{headline}</p>
                  ) : null}
                </div>
              </div>

              <p className="mt-3 text-sm leading-[1.8] text-ink-500">
                {c.rankReason}
              </p>

              <dl className="mt-4 grid grid-cols-3 gap-3 border-y border-line py-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink/45">
                    {t('matches.completed')}
                  </dt>
                  <dd className="text-2xl font-semibold tabular-nums text-ink">
                    {c.reputation.completedCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink/45">
                    {t('matches.clients')}
                  </dt>
                  <dd className="text-2xl font-semibold tabular-nums text-ink">
                    {c.reputation.uniqueClients}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink/45">
                    {t('matches.rate')}
                  </dt>
                  <dd className="text-2xl font-semibold tabular-nums text-ink">
                    {c.reputation.completionRatePct === null
                      ? '—'
                      : `${Math.round(c.reputation.completionRatePct)}%`}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 min-h-[3rem] leading-[1.8] text-ink/90">
                {c.explanation ? (
                  <p>{c.explanation}</p>
                ) : c.explanationNotice ? (
                  <p className="text-sm text-ink/55">{c.explanationNotice}</p>
                ) : explaining && !c.explanationRetryable ? (
                  <p className="text-sm text-jade">
                    {t('matches.explanationPending')}
                  </p>
                ) : null}
              </div>

              <PortfolioThumbs items={c.portfolio} label={t('matches.portfolio')} />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  to={`/professionals/${c.professionalId}`}
                  className="tap-target inline-flex rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink-700"
                >
                  {t('browse.viewProfile')}
                </Link>
                {eng?.status === 'proposed' ? (
                  <span className="text-sm text-jade-800">
                    {t('matches.proposed')}
                  </span>
                ) : eng?.status === 'accepted' ? (
                  <span className="text-sm text-jade-800">
                    {t('matches.accepted')}
                  </span>
                ) : eng?.status === 'declined' ? (
                  <span className="text-sm text-ink-400">
                    {t('matches.declined')}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={proposeBusy === c.professionalId}
                    onClick={() => void onPropose(c.professionalId)}
                    className="tap-target inline-flex rounded-md bg-jade-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                  >
                    {t('matches.propose')}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
