import { z } from 'zod';
import { BriefDraftSchema } from './brief.js';
import { ChatMessageSchema } from './ai.js';

/** Chat panel path that can be resumed. */
export const ConversationPathSchema = z.enum([
  'quick',
  'plan',
  'clarify',
  'unrelated',
]);
export type ConversationPath = z.infer<typeof ConversationPathSchema>;

export const ConversationIdParamsSchema = z.object({
  id: z.string().uuid(),
});
export type ConversationIdParams = z.infer<typeof ConversationIdParamsSchema>;

export const ConversationSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

export const ConversationListResponseSchema = z.object({
  conversations: z.array(ConversationSummarySchema),
});
export type ConversationListResponse = z.infer<
  typeof ConversationListResponseSchema
>;

export const ConversationDetailSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  path: ConversationPathSchema.nullable(),
  briefDraft: BriefDraftSchema,
  complete: z.boolean(),
  messages: z.array(ChatMessageSchema).max(24),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ConversationDetail = z.infer<typeof ConversationDetailSchema>;

/** Create or replace a conversation snapshot after a chat turn. */
export const UpsertConversationInputSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(24),
  briefDraft: BriefDraftSchema.optional(),
  path: ConversationPathSchema.nullable().optional(),
  complete: z.boolean().optional(),
});
export type UpsertConversationInput = z.infer<
  typeof UpsertConversationInputSchema
>;

/**
 * Title from the opening user message. Uses code-point slice — never space
 * word boundaries (Burmese has none).
 */
export function conversationTitleFromOpening(
  raw: string,
  maxChars = 60,
): string {
  const text = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!text) return 'Conversation';
  const chars = [...text];
  if (chars.length <= maxChars) return text.slice(0, 120);
  return `${chars.slice(0, maxChars).join('')}…`.slice(0, 120);
}
