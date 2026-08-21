/**
 * Classify whether a free-text opening is a GOAL (roadmap) or a SERVICE
 * (brief conversation). Shape-based, bilingual — not category-specific.
 *
 * GOAL: user names an outcome or problem ("open a shop", "isn't getting
 * customers", "ဆိုင်ဖွင့်ချင်တယ်").
 * SERVICE: user names a hireable deliverable or role ("logo", "website",
 * "content writer").
 * UNRELATED: dating, homework, personal advice, etc. — warm redirect, never
 * treat as a brief (structure-brief §11). Checked only when no hire/goal signal.
 * AMBIGUOUS: neither signal is clear, or both compete — ask one question.
 */

export type InputShape = 'goal' | 'service' | 'problem' | 'unrelated' | 'ambiguous';

function fold(text: string): string {
  return text
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Hireable deliverables / roles — English + common Burmese / loanwords. */
const SERVICE_PATTERNS: RegExp[] = [
  /\blogos?\b/,
  // "brand" alone is often a business type ("clothing brand"); require hireable forms.
  /\bbranding\b/,
  /\bbrand\s+(identity|kit|design|guidelines?)\b/,
  /\bwebsites?\b/,
  /\bweb\s*sites?\b/,
  /\blanding\s*pages?\b/,
  /\b(app|mobile)\s*(ui|ux|design)\b/,
  /\bpackaging\b/,
  /\bphotographs?\b/,
  /\bphotography\b/,
  /\bphotos?\b/,
  /\bphotoshoots?\b/,
  /\bvideos?\b/,
  /\bvideography\b/,
  /\bcontent\s*writers?\b/,
  /\bcopywriters?\b/,
  /\bcopywriting\b/,
  /\bsocial\s*media\b/,
  /\b(facebook|instagram|tiktok)\s+(posts?|management|ads?)\b/,
  /\btiktoks?\b/,
  /\billustrat(?:ion|or|e)\b/,
  /\btranslators?\b/,
  /\btranslation\b/,
  /\b(seo|sem)\b/,
  /\bmenus?\b/,
  /\bflyers?\b/,
  /\bposters?\b/,
  /\bbusiness\s*cards?\b/,
  /\blooking\s+for\s+(a|an)\s+\w+/,
  /\bneed(?:s)?\s+(a|an)\s+\w+/,
  /\bhire\s+(a|an)\s+\w+/,
  // Burmese / mixed — deliverable nouns, not bare "လိုချင်"
  /လိုဂို/,
  /logo/,
  /ဝဘ်ဆိုက်|ဝက်ဘ်ဆိုက်|ဝဘ်ဆိုဒ်|website/,
  /ဓာတ်ပုံ/,
  /ဗီဒီယို|video/,
  /ကော်ပီ\s*ရေး|content\s*writer/,
  /လိုဂို\s*ဒီဇိုင်း|brand\s*ဒီဇိုင်း|ပက်ကေ့ချ်\s*ဒီဇိုင်း/,
  /ဘာသာပြန်/,
  /မီနူး|menu/,
  /ပိုစတာ|poster/,
  /ဖလိုင်ယာ|flyer/,
  /လူငှား|ငှားချင်/,
];

/**
 * Launches / outcomes — starting or growing a business. Excludes decline
 * problems (those are PROBLEM_PATTERNS below, which get diagnostic
 * questions instead of a straight-to-roadmap classification).
 * Intentionally excludes bare "ဆိုင်" / "shop" so "cafe logo" stays service.
 */
const GOAL_PATTERNS: RegExp[] = [
  /\bopen(?:ing)?\s+(a|an|my|our)?\s*\w*/,
  /\bstart(?:ing)?\s+(a|an|my|our)?\s*\w*/,
  /\blaunch(?:ing)?\s+(a|an|my|our)?\s*\w*/,
  /\bset\s+up\s+(a|an|my|our)?\s*\w*/,
  /\brun\s+(a|an|my|our)\s+\w+/,
  /\bgrow(?:ing)?\s+(my|our|the)\b/,
  /\bexpand(?:ing)?\s+(my|our|the)\b/,
  /\bwhat\s+do\s+i\s+need\b/,
  /\bhow\s+do\s+i\s+(open|start|launch|set\s*up)\b/,
  /\bwhere\s+(should|do)\s+i\s+start\b/,
  /\bwhat\s+steps\b/,
  /\broadmap\b/,
  /\bplan\s+for\b/,
  // Burmese
  /ဖွင့်ချင်/,
  /ဆိုင်ဖွင့်/,
  /စတင်ချင်|စပြီးလုပ်ချင်|လုပ်ချင်တယ်/,
  /ဘာတွေ\s*လိုအပ်/,
  /လမ်းညွှန်|အစီအစဉ်/,
];

/**
 * A decline or breakdown in an existing business — sales, foot traffic, or a
 * channel that used to work. These get diagnostic questions (where did
 * customers come from, when did it change) before any roadmap, never a
 * straight-to-plan classification — the cause determines the hire, and
 * guessing it produces a plan that doesn't follow from what they said.
 */
const PROBLEM_PATTERNS: RegExp[] = [
  /\b(isn'?t|aren'?t|is\s+not|are\s+not|not)\s+getting\s+(?:enough\s+)?(customers|clients|sales|traffic)\b/,
  /\bno\s+(customers|clients|sales|foot\s*traffic)\b/,
  /\blow\s+(sales|traffic|footfall)\b/,
  /\bstruggling\s+with\b/,
  /\bsales?\s+(?:is|are|have)?\s*(?:gone|going)?\s*down\b/,
  /\bsales?\s+(?:have\s+)?dropped\b/,
  /\b(facebook|instagram|tiktok|page|social\s*media)\s+(?:isn'?t|is\s+not|stopped|not)\s+working\b/,
  /\bwalk-?ins?\s+(?:have\s+)?(dropped|stopped|slowed|down|decreased)\b/,
  /\bregulars?\s+(?:have\s+)?(stopped|aren'?t|are\s+not|not)\s+(coming|returning|come\s+back)\b/,
  // Burmese
  /အရောင်း\s*(မကောင်း|မတက်|ကျ)/,
  /ဖောက်သည်\s*(မရ|မရှိ|နည်း)/,
  /customers?\s*(မရ|မရှိ)/i,
  /ဆိုင်မှာ\s*(customer|ဖောက်သည်)/i,
  // Burmese sentences keep English platform names in Latin script (register
  // rule) — "Facebook အလုပ်မဖြစ်တော့ဘူး", "Facebook က မရတော့ဘူး".
  /(facebook|instagram|tiktok|page)\s*(?:က|မှာ)?\s*(?:အလုပ်\s*)?(?:မဖြစ်|မရ)/i,
];

/**
 * Clearly off-platform asks — dating, homework, trivia, medical/relationship
 * counselling. Must not fall through to ambiguous (which asks hire-vs-plan).
 * Only applied when no service/goal signal fired.
 */
const UNRELATED_PATTERNS: RegExp[] = [
  // Dating / relationships
  /\bgirlfriends?\b/,
  /\bboyfriends?\b/,
  /\bwife\b/,
  /\bhusbands?\b/,
  /\blooking\s+for\s+(love|a\s+date|someone\s+to\s+date)\b/,
  /\bfind\s+(love|a\s+date|a\s+partner\s+to\s+date)\b/,
  /\bwant\s+a\s+(girlfriend|boyfriend|wife|husband)\b/,
  /\bneed\s+a\s+(girlfriend|boyfriend|wife|husband)\b/,
  /\bhow\s+(do|can)\s+i\s+(get|find)\s+a\s+(girlfriend|boyfriend)\b/,
  /\bdating\s+(advice|tips|app|apps)\b/,
  /\brelationship\s+advice\b/,
  /\bmarry\s+me\b/,
  /\bask\s+(her|him)\s+out\b/,
  // Homework / school / general knowledge
  /\b(do|write|finish|help\s+with)\s+(my\s+)?homework\b/,
  /\b(write|help\s+with)\s+(my\s+)?(essay|assignment|thesis)\b/,
  /\bwhat\s+is\s+the\s+capital\s+of\b/,
  /\bwho\s+(invented|discovered|wrote)\b/,
  /\bsolve\s+(this\s+)?(math|equation)\b/,
  // Medical / personal counselling (not business)
  /\bdiagnose\b/,
  /\b(my\s+)?symptoms?\b/,
  /\bmental\s+health\s+advice\b/,
  /\btherapy\s+for\s+(me|myself|depression|anxiety)\b/,
  // General trivia / entertainment — clearly not a hire or a business goal.
  /\bweather\b/,
  /\btell\s+me\s+a\s+joke\b/,
  /\bwhat\s+time\s+is\s+it\b/,
  /\bwrite\s+(me\s+)?a\s+(poem|song|story)\b/,
  // Burmese — dating / personal
  /ချစ်သူ/,
  /မိန်းမယူ|ယောက်ျားယူ/,
  /အိမ်ထောင်/,
  /အချစ်ရေး/,
  // Burmese — homework / school
  /အိမ်စာ/,
  /စာမေးပွဲ/,
  /အက်ဆေး/,
  /\bessay\b/,
  // Burmese — trivia / entertainment
  /ရာသီဥတု/,
  /ပျော်စရာပြော/,
  /ဘယ်နာရီရှိပြီလဲ/,
  /ကဗျာရေးပေး|သီချင်းရေးပေး/,
];

/** User declined to answer / has no idea — stop probing, hand off to roadmap. */
const DONT_KNOW_PATTERNS: RegExp[] = [
  /\bi don'?t know\b/,
  /\bdon'?t know\b/,
  /\bno idea\b/,
  /\bhaven'?t thought\b/,
  /\bhave not thought\b/,
  /\bno clue\b/,
  /\bidk\b/,
  /\bno\s+idea\s+where\b/,
  /\bwhere\s+(should|do)\s+i\s+start\b/,
  /\blike i said\b/,
  /\bi have no idea\b/,
  /မသိပါ|ဘာမှ\s*မသိ|ဘာမှန်းမသိ/,
  /မစဉ်းစားရသေး/,
  /မတွေးရသေး/,
  /ဘယ်က\s*စရမလဲ|ဘယ်က\s*စမလဲ/,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/**
 * Classify opening text. Prefer an explicit deliverable over a vague
 * business noun; when both goal/problem and service signals fire, return
 * ambiguous. A problem (decline in an existing business) takes priority
 * over a goal signal when both fire, since it needs diagnostic questions
 * first, not a straight-to-roadmap plan. Unrelated (dating, homework, …)
 * only when no hire/goal/problem signal — so "logo for my girlfriend's
 * cafe" stays service.
 */
export function classifyInputShape(raw: string): InputShape {
  const text = fold(raw);
  if (!text) return 'ambiguous';

  const service = matchesAny(text, SERVICE_PATTERNS);
  const problem = matchesAny(text, PROBLEM_PATTERNS);
  const goal = matchesAny(text, GOAL_PATTERNS);

  if (service && (problem || goal)) return 'ambiguous';
  if (service) return 'service';
  if (problem) return 'problem';
  if (goal) return 'goal';
  if (matchesAny(text, UNRELATED_PATTERNS)) return 'unrelated';
  return 'ambiguous';
}

export type CustomerSourceBranch = 'online' | 'walkins' | 'regulars' | 'unsure';

const ONLINE_SOURCE_PATTERNS: RegExp[] = [
  /\b(facebook|instagram|tiktok|online|social\s*media|page)\b/,
  /(facebook|instagram|tiktok|page)/i,
];

const WALKIN_SOURCE_PATTERNS: RegExp[] = [
  /\bwalk-?ins?\b/,
  /\bwalk(?:ing)?\s+in\b/,
  /\b(foot\s*traffic|passers?-?by)\b/,
  /\boff the street\b/,
  /လမ်းသွား/,
  /လမ်းကနေ/,
  /လမ်းပေါ်/,
  /ဆိုင်ကို\s*ဝင်/,
  /ဝင်လာ/,
  /ဝင်တာ/,
];

const REGULAR_SOURCE_PATTERNS: RegExp[] = [
  /\bregulars?\b/,
  /\b(repeat|returning|loyal)\s+customers?\b/,
  /မှန်မှန်\s*လာ/,
  /အမြဲ\s*လာ/,
];

const SKIP_OR_UNSURE_PATTERNS: RegExp[] = [
  /\bskip this\b/,
  /\bnot sure\b/,
  /မသေချာ/,
  /ကျော်မယ်|ကျော်မည်/,
];

const VISIBILITY_PATTERNS: RegExp[] = [
  /\bvisib/,
  /\b(facebook|tiktok|instagram|marketing|ads?)\b/,
  /\bnew customers?\b/,
  /\bonline\b/,
  /\byes\b/,
  /\bsure\b/,
  /\bok(?:ay)?\b/,
  /အသစ်/,
  /ကြော်ငြာ/,
  /ဟုတ်ကဲ့|ဟုတ်ပါတယ်|ဟုတ်ပါ/,
];

/**
 * Classify the answer to "where did customers usually come from" into one
 * of the four diagnostic branches. Checked in this order because an answer
 * can mention more than one source ("mostly Facebook and some walk-ins") —
 * online takes priority since it's the more specific, actionable signal;
 * "don't know" is the catch-all only when nothing else matches.
 */
export function classifyCustomerSourceAnswer(raw: string): CustomerSourceBranch {
  const text = fold(raw);
  if (!text || signalsDontKnow(text) || matchesAny(text, SKIP_OR_UNSURE_PATTERNS)) {
    return 'unsure';
  }
  if (matchesAny(text, ONLINE_SOURCE_PATTERNS)) return 'online';
  if (matchesAny(text, WALKIN_SOURCE_PATTERNS)) return 'walkins';
  if (matchesAny(text, REGULAR_SOURCE_PATTERNS)) return 'regulars';
  return 'unsure';
}

/**
 * After the regulars honesty turn: they asked for visibility / new
 * customers instead of pretending the product is a marketing hire.
 */
export function signalsWantsVisibility(raw: string): boolean {
  const text = fold(raw);
  if (!text) return false;
  return matchesAny(text, VISIBILITY_PATTERNS);
}

/** True when the user is declining / has no answer — switch to roadmap. */
export function signalsDontKnow(raw: string): boolean {
  const text = fold(raw);
  if (!text) return false;
  return matchesAny(text, DONT_KNOW_PATTERNS);
}

/**
 * Interpret the user's answer to the single routing clarify question.
 * Don't-know / plan signals → goal (roadmap). Explicit hire → service.
 */
export function classifyClarifyReply(raw: string): 'goal' | 'service' {
  if (signalsDontKnow(raw)) return 'goal';
  const text = fold(raw);
  // Soft "not sure" on the routing question → plan, not a invented hire.
  if (/\bnot sure\b/.test(text) || /မသေချာ/.test(text)) return 'goal';
  const planSignals: RegExp[] = [
    /\bplan\b/,
    /\broadmap\b/,
    /\bsteps?\b/,
    /\bbigger\s+goal\b/,
    /\bwhole\s+(thing|business|project)\b/,
    /အစီအစဉ်/,
    /လမ်းညွှန်/,
    /အဆင့်/,
    /ဘာလိုအပ်မှန်း/,
    /ရည်မှန်းချက်/,
    /ဆိုင်ဖွင့်|ဖွင့်ချင်/,
  ];
  const hireSignals: RegExp[] = [
    /\bhire\b/,
    /\bspecific\b/,
    /\bjob\b/,
    /\bone\s+thing\b/,
    /\blogos?\b/,
    /\bwebsites?\b/,
    /တစ်ခု/,
    /ငှား/,
    /လိုဂို|logo|ဝဘ်|website|ဓာတ်ပုံ/,
    /အလုပ်/,
  ];
  if (matchesAny(text, planSignals) && !matchesAny(text, hireSignals)) {
    return 'goal';
  }
  if (matchesAny(text, hireSignals)) return 'service';
  if (matchesAny(text, planSignals)) return 'goal';
  // Still vague after one question — roadmap is safer than inventing a hire.
  return 'goal';
}

/** Map Myanmar + fullwidth digits to ASCII so bare "၄" / "４" match step 4. */
function foldDigits(text: string): string {
  return text.replace(/[၀-၉０-９]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x1040 && code <= 0x1049) return String(code - 0x1040);
    if (code >= 0xff10 && code <= 0xff19) return String(code - 0xff10);
    return ch;
  });
}

/**
 * Match a follow-up message to a roadmap step (by number, ordinal, or title).
 * Used after a plan renders so "step 2" / the step title starts a hire brief.
 */
export function matchRoadmapStep<T extends { order: number; title: string; category_slug: string }>(
  raw: string,
  steps: T[],
): T | null {
  const text = foldDigits(fold(raw));
  if (!text || steps.length === 0) return null;

  const byOrder = (order: number): T | null =>
    steps.find((s) => s.order === order) ?? null;

  // Bare step number: "4", "4.", "4)" — most common reply after a roadmap.
  const bare = text.match(/^([1-6])(?:[.．。)]|၊)?$/);
  if (bare?.[1]) return byOrder(Number(bare[1]));

  const digit = text.match(
    /(?:^|[^\d])(?:step|number|#|အဆင့်)?\s*([1-6])(?:[^\d]|$)/i,
  );
  if (digit?.[1]) return byOrder(Number(digit[1]));

  const ordinals: Array<[RegExp, number]> = [
    [/\b(first|1st)\b/, 1],
    [/\b(second|2nd)\b/, 2],
    [/\b(third|3rd)\b/, 3],
    [/\b(fourth|4th)\b/, 4],
    [/\b(fifth|5th)\b/, 5],
    [/\b(sixth|6th)\b/, 6],
    [/ပထမ/, 1],
    [/ဒုတိယ/, 2],
    [/တတိယ/, 3],
    [/စတုတ္ထ/, 4],
  ];
  for (const [re, order] of ordinals) {
    if (re.test(text)) return byOrder(order);
  }

  let best: T | null = null;
  let bestLen = 0;
  for (const step of steps) {
    const title = fold(step.title);
    const cat = fold(step.category_slug.replace(/-/g, ' '));
    if (title.length >= 3 && text.includes(title) && title.length > bestLen) {
      best = step;
      bestLen = title.length;
    }
    if (cat.length >= 4 && text.includes(cat) && cat.length > bestLen) {
      best = step;
      bestLen = cat.length;
    }
    // Significant title tokens (≥4 code points) — Burmese-safe.
    for (const token of title.split(/[\s/|,·•]+/).filter((w) => [...w].length >= 4)) {
      if (text.includes(token) && token.length > bestLen) {
        best = step;
        bestLen = token.length;
      }
    }
  }
  return best;
}
