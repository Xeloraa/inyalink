import { CHAT_BUBBLE_OTHER, CHAT_BUBBLE_OWN } from './chatUi';

type ChatBubbleProps = {
  role: 'user' | 'assistant';
  children: string;
};

/**
 * Conversation bubble — hugs content; alignment + colour carry the speaker.
 * Spec: 06-design-system.md § Chat bubbles.
 * User: right, max 78%. AI: left, max 86%. Both w-fit (never full-width stretch).
 */
export function ChatBubble({ role, children }: ChatBubbleProps) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <p
        className={`font-myanmar w-fit px-lg py-md text-body-lg leading-burmese [overflow-wrap:anywhere] ${
          isUser
            ? `max-w-[78%] ${CHAT_BUBBLE_OWN}`
            : `max-w-[86%] ${CHAT_BUBBLE_OTHER}`
        }`}
      >
        {children}
      </p>
    </div>
  );
}

/** Three ink-300 dots in an AI-side bubble — staggered fade. */
export function ThinkingBubble() {
  return (
    <div className="flex justify-start" role="status" aria-live="polite">
      <span className="sr-only">…</span>
      <span
        className={`inline-flex gap-[5px] px-lg py-lg ${CHAT_BUBBLE_OTHER}`}
        aria-hidden
      >
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="animate-dot h-1.5 w-1.5 rounded-full bg-ink-300"
            style={{ animationDelay: `${dot * 300}ms` }}
          />
        ))}
      </span>
    </div>
  );
}
