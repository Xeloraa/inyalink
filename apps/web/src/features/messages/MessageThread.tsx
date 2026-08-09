import { FormEvent, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MESSAGE_BODY_MAX } from '@inyalink/shared';
import {
  getEngagementMessages,
  sendEngagementMessage,
} from '../../lib/api';
import { ApiError } from '../../lib/apiClient';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

const POLL_MS = 8_000;

type MessageThreadProps = {
  engagementId: string;
};

export function MessageThread({ engagementId }: MessageThreadProps) {
  const { t } = useI18n();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const threadQuery = useQuery({
    queryKey: ['engagement-messages', engagementId],
    queryFn: () => getEngagementMessages(engagementId),
    enabled: Boolean(session && engagementId),
    refetchInterval: POLL_MS,
    retry: 2,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      sendEngagementMessage(engagementId, { body }),
    onSuccess: async () => {
      setDraft('');
      setSendError(null);
      await qc.invalidateQueries({
        queryKey: ['engagement-messages', engagementId],
      });
    },
    onError: (err) => {
      setSendError(
        err instanceof ApiError ? err.message : t('messages.sendError'),
      );
    },
  });

  const messages = threadQuery.data?.messages ?? [];
  const viewerId = session?.userId ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sendMutation.isPending) return;
    sendMutation.mutate(body);
  }

  if (threadQuery.isLoading && !threadQuery.data) {
    return (
      <p className="py-3xl text-center text-body text-ink-500" role="status">
        {t('common.loading')}
      </p>
    );
  }

  if (threadQuery.isError && !threadQuery.data) {
    return (
      <div className="space-y-3 py-2xl text-center">
        <p className="text-body text-danger" role="alert">
          {threadQuery.error instanceof ApiError
            ? threadQuery.error.message
            : t('messages.loadError')}
        </p>
        <button
          type="button"
          onClick={() => void threadQuery.refetch()}
          className="tap-target rounded-md border border-line px-4 py-2.5 text-sm text-ink-700"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const thread = threadQuery.data;
  if (!thread) return null;

  const briefTitle = thread.brief.title?.trim() || t('proFeed.untitled');

  return (
    <div className="flex min-h-[70vh] flex-col">
      <header className="sticky top-0 z-10 space-y-2 border-b border-line bg-paper/95 px-1 py-4 backdrop-blur-sm">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-400">
          {t('messages.pinnedBrief')}
        </p>
        <h1 className="text-title text-ink-900 [overflow-wrap:anywhere]">
          {briefTitle}
        </h1>
        {thread.brief.description ? (
          <p className="text-body-sm leading-[1.8] text-ink-700 [overflow-wrap:anywhere]">
            {thread.brief.description}
          </p>
        ) : null}
        <p className="text-caption leading-[1.8] text-ink-500 [overflow-wrap:anywhere]">
          {t('messages.retentionNotice')}
        </p>
      </header>

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto py-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="py-xl text-center text-body-sm text-ink-500">
            {t('messages.empty')}
          </p>
        ) : (
          messages.map((msg) => {
            const mine = viewerId !== null && msg.senderId === viewerId;
            return (
              <div
                key={msg.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-md px-3 py-2 ${
                    mine
                      ? 'bg-jade-600 text-white'
                      : 'border border-line bg-white text-ink-900'
                  }`}
                >
                  <p className="text-body-sm leading-[1.8] [overflow-wrap:anywhere]">
                    {msg.body}
                  </p>
                  <time
                    dateTime={msg.createdAt}
                    className={`mt-1 block text-caption ${
                      mine ? 'text-jade-100' : 'text-ink-400'
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleString()}
                  </time>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {thread.canSend ? (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="sticky bottom-0 space-y-2 border-t border-line bg-paper py-3"
        >
          {sendError ? (
            <p className="text-body-sm text-danger" role="alert">
              {sendError}
            </p>
          ) : null}
          <label htmlFor="message-body" className="sr-only">
            {t('messages.composerLabel')}
          </label>
          <textarea
            id="message-body"
            rows={3}
            value={draft}
            maxLength={MESSAGE_BODY_MAX}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('messages.composerPlaceholder')}
            className="w-full rounded-md border border-line bg-white px-md py-md text-body leading-[1.8] outline-none [overflow-wrap:anywhere] focus:border-jade-400 focus:shadow-focus"
            disabled={sendMutation.isPending}
          />
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <p className="text-caption text-ink-400">
              {draft.trim().length}/{MESSAGE_BODY_MAX}
            </p>
            <button
              type="submit"
              disabled={
                sendMutation.isPending || draft.trim().length < 1
              }
              className="tap-target rounded-md bg-jade-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {sendMutation.isPending
                ? t('messages.sending')
                : t('messages.send')}
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t border-line py-3 text-body-sm text-ink-500">
          {t('messages.cannotSend')}
        </p>
      )}
    </div>
  );
}
