import { z } from 'zod';
import { TextLanguageSchema } from './brief.js';
import { EngagementStatusSchema } from './engagement.js';

/** Matches `messages.body` check constraint (1–4000). */
export const MESSAGE_BODY_MAX = 4000 as const;

export const MessageSchema = z.object({
  id: z.string().uuid(),
  engagementId: z.string().uuid(),
  senderId: z.string().uuid(),
  body: z.string().min(1).max(MESSAGE_BODY_MAX),
  createdAt: z.string(),
  expiresAt: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;

export const SendMessageInputSchema = z.object({
  body: z.string().trim().min(1).max(MESSAGE_BODY_MAX),
});

export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const EngagementMessagesParamsSchema = z.object({
  id: z.string().uuid(),
});

export type EngagementMessagesParams = z.infer<
  typeof EngagementMessagesParamsSchema
>;

/** Brief summary pinned at the top of an engagement thread. */
export const MessageThreadBriefSchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  language: TextLanguageSchema.nullable(),
});

export type MessageThreadBrief = z.infer<typeof MessageThreadBriefSchema>;

export const MessageThreadResponseSchema = z.object({
  engagementId: z.string().uuid(),
  status: EngagementStatusSchema,
  brief: MessageThreadBriefSchema,
  messages: z.array(MessageSchema),
  /** True when status allows sending (accepted and later active states). */
  canSend: z.boolean(),
});

export type MessageThreadResponse = z.infer<typeof MessageThreadResponseSchema>;

/** Inbox row for open message threads (pro or client). */
export const MessageThreadSummarySchema = z.object({
  engagementId: z.string().uuid(),
  status: EngagementStatusSchema,
  briefId: z.string().uuid(),
  briefTitle: z.string().nullable(),
  counterpartName: z.string().nullable(),
  lastMessageAt: z.string().nullable(),
});

export type MessageThreadSummary = z.infer<typeof MessageThreadSummarySchema>;

export const MessageThreadListResponseSchema = z.object({
  threads: z.array(MessageThreadSummarySchema),
});

export type MessageThreadListResponse = z.infer<
  typeof MessageThreadListResponseSchema
>;
