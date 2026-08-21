/**
 * Seeded step-hire openings (from any roadmap step the client picked) walk
 * a short, deterministic name → [style, for a graphic-design step] →
 * budget/deadline sequence — the same "never leave it to the model"
 * approach as problemDiagnosisTurn, and for the same reason: a turn that
 * confirms what the user typed must never invent a figure or a date they
 * didn't give. This runs unconditionally (not just as a fallback), so
 * every step-hire conversation has no dependency on the AI provider being
 * up at all.
 *
 * Deliberately generic across categories rather than matched on exact step
 * title text: generateRoadmap produces fresh wording on every live call, so
 * matching one hardcoded phrase only covered a single lucky rehearsal — any
 * roadmap step the user actually picks must work the same way.
 */
import { detectResponseLocale } from '@inyalink/burmese';
import type { BriefDraft, ChatMessage, UiLocale } from '@inyalink/shared';

export type StepHireTurn = {
  nextQuestion?: string;
  complete?: boolean;
  briefDraft: BriefDraft;
};

function nameQuestion(locale: UiLocale, stepTitle: string | undefined): string {
  const step = stepTitle?.trim();
  if (locale === 'en') {
    return step
      ? `I'll arrange "${step}" for you. What's your shop's name?`
      : "I'll arrange this for you. What's your shop's name?";
  }
  return step
    ? `${step} အတွက် စီစဉ်ပေးပါ့မယ်။ ဆိုင်နာမည်က ဘာလဲ ပြောပြပေးပါ။`
    : 'ဒါကို စီစဉ်ပေးပါ့မယ်။ ဆိုင်နာမည်က ဘာလဲ ပြောပြပေးပါ။';
}

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

function budgetDeadlineQuestion(
  locale: UiLocale,
  leadIn: string | null,
): string {
  if (locale === 'en') {
    return leadIn
      ? `${leadIn} — noted. What's your budget, and when do you need it by?`
      : "Noted. What's your budget, and when do you need it by?";
  }
  return leadIn
    ? `${leadIn} ပေါ့ — မှတ်ထားပါပြီ။ ဘတ်ဂျက်နဲ့ လိုအပ်တဲ့ ရက်ကို ပြောပြပေးပါ။`
    : 'မှတ်ထားပါပြီ။ ဘတ်ဂျက်နဲ့ လိုအပ်တဲ့ ရက်ကို ပြောပြပေးပါ။';
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

const NAME_LABEL: Record<UiLocale, string> = { en: 'shop name', my: 'ဆိုင်နာမည်' };
const STYLE_REQ_LABEL: Record<UiLocale, string> = { en: 'style', my: 'ပုံစံ' };

export function stepHireTurn(
  messages: ChatMessage[],
  _locale: UiLocale,
  seedDraft: BriefDraft,
): StepHireTurn | null {
  // Only seeded step-hires (beginStepHire always sets a category); a
  // freeform "I need a logo" opening has no seed and keeps using
  // structureBrief / the demo-fallback fixtures as before.
  if (!seedDraft.category) return null;

  const users = messages.filter((m) => m.role === 'user');
  const assistants = messages.filter((m) => m.role === 'assistant');
  const opening = users[0]?.content.trim();
  if (!opening) return null;

  // Locale is sticky to the opening, not re-detected per turn: a short
  // answer like a proper noun ("Daw Mya Cafe") or a bare number is often
  // typed in Latin script even mid-Burmese-conversation, and must not flip
  // the whole reply language.
  const locale = detectResponseLocale(opening);
  const asked = assistants.length;
  const isDesignStep = seedDraft.category === 'graphic-design';

  if (asked === 0) {
    return { nextQuestion: nameQuestion(locale, seedDraft.title), briefDraft: seedDraft };
  }

  const name = titleCase(users[1]?.content ?? '');
  const nameReq = `${NAME_LABEL[locale]}: ${name}`;

  if (asked === 1) {
    if (isDesignStep) {
      return {
        nextQuestion: styleQuestion(locale, name),
        briefDraft: { ...seedDraft, requirements: [nameReq] },
      };
    }
    return {
      nextQuestion: budgetDeadlineQuestion(locale, name),
      briefDraft: { ...seedDraft, requirements: [nameReq] },
    };
  }

  if (isDesignStep) {
    const style = classifyStyle(users[2]?.content ?? '');
    const styleLabel = style ? STYLE_LABEL[style][locale] : (users[2]?.content ?? '').trim();
    const styleReq = `${STYLE_REQ_LABEL[locale]}: ${styleLabel}`;

    if (asked === 2) {
      return {
        nextQuestion: budgetDeadlineQuestion(locale, styleLabel),
        briefDraft: { ...seedDraft, requirements: [nameReq, styleReq] },
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
          requirements: [nameReq, styleReq],
          ...(budget !== null ? { budget_min_mmk: budget, budget_max_mmk: budget } : {}),
          ...(deadline !== null ? { deadline } : {}),
          ai_confidence: budget !== null && deadline !== null ? 0.9 : 0.5,
          needs_human_review: budget === null || deadline === null,
        },
      };
    }
    return null;
  }

  // Non-design steps skip the style question: name -> budget/deadline -> done.
  if (asked === 2) {
    const latest = users[2]?.content ?? '';
    const budget = parseBudgetMmk(latest);
    const deadline = parseDeadline(latest, new Date());
    return {
      complete: true,
      briefDraft: {
        ...seedDraft,
        requirements: [nameReq],
        ...(budget !== null ? { budget_min_mmk: budget, budget_max_mmk: budget } : {}),
        ...(deadline !== null ? { deadline } : {}),
        ai_confidence: budget !== null && deadline !== null ? 0.9 : 0.5,
        needs_human_review: budget === null || deadline === null,
      },
    };
  }

  return null;
}
