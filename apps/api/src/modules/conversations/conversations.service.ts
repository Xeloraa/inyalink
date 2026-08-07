import { normalizeToUnicode } from '@inyalink/burmese';
import {
  ConversationDetailSchema,
  ConversationListResponseSchema,
  conversationTitleFromOpening,
  type ConversationDetail,
  type ConversationListResponse,
  type ConversationPath,
  type UpsertConversationInput,
} from '@inyalink/shared';
import { AppError } from '../../middleware/errors.js';
import * as repo from './conversations.repo.js';

function normalizeMessages(messages: UpsertConversationInput['messages']) {
  return messages.map((m) => ({
    role: m.role,
    content: normalizeToUnicode(m.content.trim()),
  }));
}

function titleFromMessages(
  messages: { role: string; content: string }[],
): string {
  const opening = messages.find((m) => m.role === 'user');
  return conversationTitleFromOpening(opening?.content ?? 'Conversation');
}

function toDetail(row: NonNullable<Awaited<ReturnType<typeof repo.getConversation>>>): ConversationDetail {
  return ConversationDetailSchema.parse({
    id: row.id,
    title: row.title,
    path: row.path,
    briefDraft: row.briefDraft,
    complete: row.complete,
    messages: row.messages,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export async function listConversations(
  userId: string,
): Promise<ConversationListResponse> {
  const rows = await repo.listConversations(userId);
  return ConversationListResponseSchema.parse({
    conversations: rows.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
}

export async function getConversation(
  id: string,
  userId: string,
): Promise<ConversationDetail> {
  const row = await repo.getConversation(id, userId);
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', 'Conversation not found');
  }
  return toDetail(row);
}

export async function createConversation(
  input: UpsertConversationInput,
  userId: string,
): Promise<ConversationDetail> {
  const messages = normalizeMessages(input.messages);
  if (messages.some((m) => !m.content)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Message content is required');
  }
  const path: ConversationPath | null = input.path ?? null;
  const row = await repo.insertConversation({
    userId,
    title: titleFromMessages(messages),
    path,
    briefDraft: input.briefDraft ?? {},
    complete: input.complete ?? false,
    messages,
  });
  return toDetail(row);
}

export async function updateConversation(
  id: string,
  input: UpsertConversationInput,
  userId: string,
): Promise<ConversationDetail> {
  const messages = normalizeMessages(input.messages);
  if (messages.some((m) => !m.content)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Message content is required');
  }
  const path: ConversationPath | null =
    input.path === undefined ? null : input.path;
  const row = await repo.replaceConversation(id, userId, {
    title: titleFromMessages(messages),
    path,
    briefDraft: input.briefDraft ?? {},
    complete: input.complete ?? false,
    messages,
  });
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', 'Conversation not found');
  }
  return toDetail(row);
}
