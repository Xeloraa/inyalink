import { getSql } from '../../db/client.js';
import type {
  BriefDraft,
  ChatMessage,
  ConversationPath,
} from '@inyalink/shared';
import { BriefDraftSchema, ChatMessageSchema } from '@inyalink/shared';

export type ConversationSummaryRow = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ConversationDetailRow = ConversationSummaryRow & {
  path: ConversationPath | null;
  briefDraft: BriefDraft;
  complete: boolean;
  messages: ChatMessage[];
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(0).toISOString();
}

function parsePath(value: unknown): ConversationPath | null {
  if (
    value === 'quick' ||
    value === 'plan' ||
    value === 'clarify' ||
    value === 'unrelated'
  ) {
    return value;
  }
  return null;
}

function parseBriefDraft(value: unknown): BriefDraft {
  const parsed = BriefDraftSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : {};
}

type SqlConversation = {
  id: string;
  title: string;
  path: string | null;
  brief_draft: unknown;
  complete: boolean;
  created_at: unknown;
  updated_at: unknown;
};

type SqlMessage = {
  role: string;
  content: string;
  sort_order: number;
};

function mapSummary(row: SqlConversation): ConversationSummaryRow {
  return {
    id: row.id,
    title: row.title,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function listConversations(
  userId: string,
  limit = 50,
): Promise<ConversationSummaryRow[]> {
  const sql = getSql();
  const rows = await sql<SqlConversation[]>`
    select id, title, path, brief_draft, complete, created_at, updated_at
    from ai_conversations
    where user_id = ${userId}::uuid
      and expires_at > now()
    order by updated_at desc
    limit ${limit}
  `;
  return rows.map(mapSummary);
}

export async function getConversation(
  id: string,
  userId: string,
): Promise<ConversationDetailRow | null> {
  const sql = getSql();
  const rows = await sql<SqlConversation[]>`
    select id, title, path, brief_draft, complete, created_at, updated_at
    from ai_conversations
    where id = ${id}::uuid
      and user_id = ${userId}::uuid
      and expires_at > now()
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;

  const msgRows = await sql<SqlMessage[]>`
    select role, content, sort_order
    from ai_conversation_messages
    where conversation_id = ${id}::uuid
    order by sort_order asc
  `;

  const messages: ChatMessage[] = [];
  for (const m of msgRows) {
    const parsed = ChatMessageSchema.safeParse({
      role: m.role,
      content: m.content,
    });
    if (parsed.success) messages.push(parsed.data);
  }

  return {
    ...mapSummary(row),
    path: parsePath(row.path),
    briefDraft: parseBriefDraft(row.brief_draft),
    complete: Boolean(row.complete),
    messages,
  };
}

export async function insertConversation(input: {
  userId: string;
  title: string;
  path: ConversationPath | null;
  briefDraft: BriefDraft;
  complete: boolean;
  messages: ChatMessage[];
}): Promise<ConversationDetailRow> {
  const sql = getSql();
  const rows = await sql.begin(async (tx) => {
    const created = await tx<SqlConversation[]>`
      insert into ai_conversations (user_id, title, path, brief_draft, complete)
      values (
        ${input.userId}::uuid,
        ${input.title},
        ${input.path},
        ${tx.json(input.briefDraft as never)},
        ${input.complete}
      )
      returning id, title, path, brief_draft, complete, created_at, updated_at
    `;
    const conv = created[0];
    if (!conv) throw new Error('insert ai_conversations returned no row');

    for (let i = 0; i < input.messages.length; i++) {
      const m = input.messages[i]!;
      await tx`
        insert into ai_conversation_messages
          (conversation_id, role, content, sort_order)
        values (
          ${conv.id}::uuid,
          ${m.role},
          ${m.content},
          ${i}
        )
      `;
    }
    return conv;
  });

  return {
    ...mapSummary(rows),
    path: parsePath(rows.path),
    briefDraft: parseBriefDraft(rows.brief_draft),
    complete: Boolean(rows.complete),
    messages: input.messages,
  };
}

export async function replaceConversation(
  id: string,
  userId: string,
  input: {
    title: string;
    path: ConversationPath | null;
    briefDraft: BriefDraft;
    complete: boolean;
    messages: ChatMessage[];
  },
): Promise<ConversationDetailRow | null> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const updated = await tx<SqlConversation[]>`
      update ai_conversations
      set
        title = ${input.title},
        path = ${input.path},
        brief_draft = ${tx.json(input.briefDraft as never)},
        complete = ${input.complete},
        updated_at = now()
      where id = ${id}::uuid
        and user_id = ${userId}::uuid
        and expires_at > now()
      returning id, title, path, brief_draft, complete, created_at, updated_at
    `;
    const conv = updated[0];
    if (!conv) return null;

    await tx`
      delete from ai_conversation_messages
      where conversation_id = ${id}::uuid
    `;

    for (let i = 0; i < input.messages.length; i++) {
      const m = input.messages[i]!;
      await tx`
        insert into ai_conversation_messages
          (conversation_id, role, content, sort_order)
        values (
          ${id}::uuid,
          ${m.role},
          ${m.content},
          ${i}
        )
      `;
    }

    return {
      ...mapSummary(conv),
      path: parsePath(conv.path),
      briefDraft: parseBriefDraft(conv.brief_draft),
      complete: Boolean(conv.complete),
      messages: input.messages,
    };
  });
}
