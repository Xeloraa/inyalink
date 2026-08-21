/**
 * Seeded step-hire openings (from a roadmap step the client picked) walk a
 * short, deterministic name → style → budget/deadline sequence — the same
 * "never leave it to the model" approach as problemDiagnosisTurn, and for
 * the same reason: a scripted/demo turn that echoes back what the user
 * actually typed must never invent a figure or a date they didn't give.
 * This runs unconditionally (not just as a fallback), so this specific
 * flow has no dependency on the AI provider being up at all.
 *
 * Deliberately scoped to the exact step this is built for — other seeded
 * hires fall through to structureBrief / demo-fallback as before. This is
 * not a general hire-conversation engine.
 */
import { detectResponseLocale } from '@inyalink/burmese';
import type { BriefDraft, ChatMessage, UiLocale } from '@inyalink/shared';

export type StepHireTurn = {
  nextQuestion?: string;
  complete?: boolean;
  briefDraft: BriefDraft;
};

/** Roadmap step titles this deterministic flow handles (verbatim, from beginStepHire). */
const OPENING_TITLES = new Set(['brand နဲ့ logo']);

const NAME_Q: Record<UiLocale, string> = {
  en: "I'll arrange the logo and brand identity for you. What's your shop's name?",
  my: 'Logo နှင့် brand identity အတွက် စီစဉ်ပေးပါ့မယ်။ ဆိုင်နာမည်က ဘာလဲ ပြောပြပေးပါ။',
};

function titleCase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function styleQuestion(locale: UiLocale, name: string): string {
  return locale === 'en'
    ? `${name} — noted. For style, do you lean simple, modern, or traditional?`
    : `${name} ပေါ့ — မှတ်ထားပါပြီ။ ပုံစံကတော့ ရိုးရှင်း၊ ခေတ်မီ၊ ဒါမှမဟုတ် ရိုးရာထဲက ဘယ်ဟာကို ပိုကြိုက်ပါသလဲ။`;
}

type Style = 'simple' | 'modern' | 'traditional';

function classifyStyle(raw: string): Style | null {
  const t = raw.toLowerCase();
  if (/simple|minimal|ရိုးရှင်း/.test(t)) return 'simple';
  if (/modern|ခေတ်မီ/.test(t)) return 'modern';
  if (/traditional|ရိုးရာ/.test(t)) return 'traditional';
  return null;
}

const STYLE_LABEL: Record<Style, Record<UiLocale, string>> = {
  simple: { en: 'Simple', my: 'ရိုးရှင်း' },
  modern: { en: 'Modern', my: 'ခေတ်မီ' },
  traditional: { en: 'Traditional', my: 'ရိုးရာ' },
};

function budgetDeadlineQuestion(locale: UiLocale, styleLabel: string): string {
  return locale === 'en'
    ? `${styleLabel} style — noted. What's your budget, and when do you need it by?`
    : `${styleLabel} ပုံစံပေါ့ — မှတ်ထားပါပြီ။ ဘတ်ဂျက်နဲ့ လိုအပ်တဲ့ ရက်ကို ပြောပြပေးပါ။`;
}

/** Fold Burmese digits (၀-၉) to ASCII so number parsing works on either script. */
function foldDigits(text: string): string {
  return text.replace(/[၀-၉]/g, (ch) => String(ch.charCodeAt(0) - 0x1040));
}

/**
 * Parse a kyat figure from free text: plain digit sequences (with optional
 * commas/spaces) or the "X သိန်း" / "X lakh" unit (×100,000). Returns null
 * — never a guess — when nothing confidently parses, per the "never invent
 * a figure" rule; the caller must leave the field empty in that case.
 */
function parseBudgetMmk(raw: string): number | null {
  const text = foldDigits(raw);
  const lakh = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:သိန်း|lakh|လက်ခ)/i);
  if (lakh?.[1]) return Math.round(parseFloat(lakh[1]) * 100_000);

  const digits = text.match(/([0-9][0-9,\s]{3,}[0-9])/);
  if (digits?.[1]) {
    const n = parseInt(digits[1].replace(/[,\s]/g, ''), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, 'ဇန်နဝါရီ': 1,
  feb: 2, february: 2, 'ဖေဖော်ဝါရီ': 2,
  mar: 3, march: 3, 'မတ်': 3,
  apr: 4, april: 4, 'ဧပြီ': 4,
  may: 5, 'မေ': 5,
  jun: 6, june: 6, 'ဇွန်': 6,
  jul: 7, july: 7, 'ဇူလိုင်': 7,
  aug: 8, august: 8, 'သြဂုတ်': 8,
  sep: 9, sept: 9, september: 9, 'စက်တင်ဘာ': 9,
  oct: 10, october: 10, 'အောက်တိုဘာ': 10,
  nov: 11, november: 11, 'နိုဝင်ဘာ': 11,
  dec: 12, december: 12, 'ဒီဇင်ဘာ': 12,
};

/**
 * Parse an absolute month+day into its next occurrence (this year if still
 * upcoming, otherwise next year). Returns null — never a guess — when
 * nothing confidently parses.
 */
function parseDeadline(raw: string, today: Date): string | null {
  const text = foldDigits(raw.toLowerCase());
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  for (const [name, month] of Object.entries(MONTHS)) {
    const m = text.match(new RegExp(`${name}\\D{0,3}([0-9]{1,2})`, 'i'));
    const day = m?.[1] ? parseInt(m[1], 10) : NaN;
    if (day >= 1 && day <= 31) {
      let year = today.getUTCFullYear();
      if (Date.UTC(year, month - 1, day) < today.getTime()) year += 1;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return null;
}

export function stepHireTurn(
  messages: ChatMessage[],
  _locale: UiLocale,
  seedDraft: BriefDraft,
): StepHireTurn | null {
  const users = messages.filter((m) => m.role === 'user');
  const assistants = messages.filter((m) => m.role === 'assistant');
  const opening = users[0]?.content.trim();
  if (!opening || !OPENING_TITLES.has(opening)) return null;

  // Locale is sticky to the opening, not re-detected per turn: a short
  // answer like a proper noun ("Daw Mya Cafe") or a bare number is often
  // typed in Latin script even mid-Burmese-conversation, and must not flip
  // the whole reply language.
  const locale = detectResponseLocale(opening);

  const asked = assistants.length;

  if (asked === 0) {
    return { nextQuestion: NAME_Q[locale], briefDraft: seedDraft };
  }

  const name = titleCase(users[1]?.content ?? '');

  if (asked === 1) {
    return {
      nextQuestion: styleQuestion(locale, name),
      briefDraft: { ...seedDraft, title: `${name} logo` },
    };
  }

  const style = classifyStyle(users[2]?.content ?? '');
  const styleLabel = style ? STYLE_LABEL[style][locale] : (users[2]?.content ?? '').trim();

  if (asked === 2) {
    return {
      nextQuestion: budgetDeadlineQuestion(locale, styleLabel),
      briefDraft: {
        ...seedDraft,
        title: `${name} logo`,
        requirements: [`style: ${styleLabel}`],
      },
    };
  }

  if (asked === 3) {
    const latest = users[3]?.content ?? '';
    const budget = parseBudgetMmk(latest);
    const deadline = parseDeadline(latest, new Date());
    return {
      complete: true,
      briefDraft: {
        ...seedDraft,
        title: `${name} logo`,
        requirements: [`style: ${styleLabel}`],
        ...(budget !== null ? { budget_min_mmk: budget, budget_max_mmk: budget } : {}),
        ...(deadline !== null ? { deadline } : {}),
        ai_confidence: budget !== null && deadline !== null ? 0.9 : 0.5,
        needs_human_review: budget === null || deadline === null,
      },
    };
  }

  return null;
}
