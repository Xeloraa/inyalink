import {
  ConversationDetailSchema,
  ConversationSummarySchema,
  conversationTitleFromOpening,
  type BriefDraft,
  type ChatMessage,
  type ConversationDetail,
  type ConversationPath,
  type ConversationSummary,
  type UpsertConversationInput,
} from '@inyalink/shared';
import {
  createConversation,
  getConversation,
  listConversations,
  updateConversation,
} from './api';

const ANON_KEY = 'inyalink.anonConversations';

type AnonStore = {
  conversations: ConversationDetail[];
};

function readAnonStore(): AnonStore {
  try {
    const raw = sessionStorage.getItem(ANON_KEY);
    if (!raw) return { conversations: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return { conversations: [] };
    const list = (parsed as { conversations?: unknown }).conversations;
    if (!Array.isArray(list)) return { conversations: [] };
    const conversations: ConversationDetail[] = [];
    for (const item of list) {
      const result = ConversationDetailSchema.safeParse(item);
      if (result.success) conversations.push(result.data);
    }
    return { conversations };
  } catch {
    return { conversations: [] };
  }
}

function writeAnonStore(store: AnonStore): void {
  try {
    sessionStorage.setItem(ANON_KEY, JSON.stringify(store));
  } catch {
    /* private mode / quota */
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type PersistSnapshotArgs = {
  conversationId: string | null;
  messages: ChatMessage[];
  briefDraft: BriefDraft;
  path: ConversationPath | null;
  complete: boolean;
  signedIn: boolean;
};

export type PersistSnapshotResult = {
  id: string;
  detail: ConversationDetail;
};

function toUpsertInput(args: PersistSnapshotArgs): UpsertConversationInput {
  return {
    messages: args.messages,
    briefDraft: args.briefDraft,
    path: args.path,
    complete: args.complete,
  };
}

function buildDetail(
  id: string,
  args: PersistSnapshotArgs,
  timestamps?: { createdAt: string; updatedAt: string },
): ConversationDetail {
  const now = new Date().toISOString();
  const opening =
    args.messages.find((m) => m.role === 'user')?.content ?? 'Conversation';
  return ConversationDetailSchema.parse({
    id,
    title: conversationTitleFromOpening(opening),
    path: args.path,
    briefDraft: args.briefDraft,
    complete: args.complete,
    messages: args.messages,
    createdAt: timestamps?.createdAt ?? now,
    updatedAt: timestamps?.updatedAt ?? now,
  });
}

/** Persist after a turn. Signed-in → API; anonymous → sessionStorage only. */
export async function persistConversationSnapshot(
  args: PersistSnapshotArgs,
): Promise<PersistSnapshotResult | null> {
  if (args.messages.length === 0) return null;

  if (!args.signedIn) {
    const store = readAnonStore();
    const existing = args.conversationId
      ? store.conversations.find((c) => c.id === args.conversationId)
      : undefined;
    const id = existing?.id ?? args.conversationId ?? newId();
    const detail = buildDetail(id, args, {
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const next = store.conversations.filter((c) => c.id !== id);
    next.unshift(detail);
    writeAnonStore({ conversations: next.slice(0, 50) });
    return { id, detail };
  }

  const body = toUpsertInput(args);
  if (args.conversationId) {
    try {
      const detail = await updateConversation(args.conversationId, body);
      return { id: detail.id, detail };
    } catch {
      // Stale / expired id — create a fresh row.
    }
  }
  const detail = await createConversation(body);
  return { id: detail.id, detail };
}

export async function fetchConversationSummaries(
  signedIn: boolean,
): Promise<ConversationSummary[]> {
  if (signedIn) {
    const res = await listConversations();
    return res.conversations;
  }
  const store = readAnonStore();
  return store.conversations
    .map((c) =>
      ConversationSummarySchema.parse({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function fetchConversationDetail(
  id: string,
  signedIn: boolean,
): Promise<ConversationDetail> {
  if (signedIn) {
    return getConversation(id);
  }
  const found = readAnonStore().conversations.find((c) => c.id === id);
  if (!found) {
    throw new Error('Conversation not found');
  }
  return found;
}
