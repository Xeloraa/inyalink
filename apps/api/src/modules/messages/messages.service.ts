import { normalizeToUnicode } from '@inyalink/burmese';
import {
  MessageSchema,
  MessageThreadListResponseSchema,
  MessageThreadResponseSchema,
  type EngagementStatus,
  type Message,
  type MessageThreadListResponse,
  type MessageThreadResponse,
  type SendMessageInput,
} from '@inyalink/shared';
import { AppError } from '../../middleware/errors.js';
import * as repo from './messages.repo.js';

const SENDABLE_STATUSES = new Set<EngagementStatus>([
  'accepted',
  'in_progress',
  'delivered',
  'disputed',
]);

function toMessage(row: repo.MessageRow): Message {
  return MessageSchema.parse({
    id: row.id,
    engagementId: row.engagementId,
    senderId: row.senderId,
    body: row.body,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  });
}

function assertParticipant(
  access: repo.EngagementAccessRow,
  userId: string,
): void {
  if (access.clientId !== userId && access.professionalId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Not a participant on this engagement');
  }
}

export function canSendMessages(status: EngagementStatus): boolean {
  return SENDABLE_STATUSES.has(status);
}

export async function listThread(
  engagementId: string,
  userId: string,
): Promise<MessageThreadResponse> {
  const access = await repo.getEngagementAccess(engagementId);
  if (!access) {
    throw new AppError(404, 'NOT_FOUND', 'Engagement not found');
  }
  assertParticipant(access, userId);

  const rows = await repo.listByEngagement(engagementId);
  return MessageThreadResponseSchema.parse({
    engagementId: access.id,
    status: access.status,
    brief: {
      id: access.briefId,
      title: access.briefTitle,
      description: access.briefDescription,
      language: access.briefLanguage,
    },
    messages: rows.map(toMessage),
    canSend: canSendMessages(access.status),
  });
}

export async function sendMessage(
  engagementId: string,
  userId: string,
  input: SendMessageInput,
): Promise<Message> {
  const access = await repo.getEngagementAccess(engagementId);
  if (!access) {
    throw new AppError(404, 'NOT_FOUND', 'Engagement not found');
  }
  assertParticipant(access, userId);

  if (!canSendMessages(access.status)) {
    throw new AppError(
      409,
      'ENGAGEMENT_NOT_ACTIVE',
      'Messaging is only available on accepted engagements',
    );
  }

  const body = normalizeToUnicode(input.body.trim());
  if (body.length < 1 || body.length > 4000) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Message body must be 1–4000 characters');
  }

  const row = await repo.insertMessage({
    engagementId,
    senderId: userId,
    body,
  });
  return toMessage(row);
}

export async function listThreads(
  userId: string,
): Promise<MessageThreadListResponse> {
  const rows = await repo.listThreadsForUser(userId);
  return MessageThreadListResponseSchema.parse({
    threads: rows.map((row) => ({
      engagementId: row.engagementId,
      status: row.status,
      briefId: row.briefId,
      briefTitle: row.briefTitle,
      counterpartName: row.counterpartName,
      lastMessageAt: row.lastMessageAt,
    })),
  });
}
