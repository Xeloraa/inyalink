/**
 * Classify whether a free-text opening is a GOAL (roadmap) or a SERVICE
 * (brief conversation). Shape-based, bilingual — not category-specific.
 *
 * GOAL: user names an outcome or problem ("open a shop", "isn't getting
 * customers", "ဆိုင်ဖွင့်ချင်တယ်").
 * SERVICE: user names a hireable deliverable or role ("logo", "website",
 * "content writer").
 * AMBIGUOUS: neither signal is clear, or both compete — ask one question.
 */

export type InputShape = 'goal' | 'service' | 'ambiguous';

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
  /\b(facebook|instagram|tiktok)\s+(posts?|page|management|ads?)\b/,
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
 * Outcomes and problems — launches, growth, sales issues.
 * Intentionally excludes bare "ဆိုင်" / "shop" so "cafe logo" stays service.
 */
const GOAL_PATTERNS: RegExp[] = [
  /\bopen(?:ing)?\s+(a|an|my|our)?\s*\w*/,
  /\bstart(?:ing)?\s+(a|an|my|our)?\s*\w*/,
  /\blaunch(?:ing)?\s+(a|an|my|our)?\s*\w*/,
  /\bset\s*up\s+(a|an|my|our)?\s*\w*/,
  /\brun\s+(a|an|my|our)\s+\w+/,
  /\bgrow(?:ing)?\s+(my|our|the)\b/,
  /\bexpand(?:ing)?\s+(my|our|the)\b/,
  /\bisn'?t\s+getting\s+(customers|clients|sales|traffic)\b/,
  /\baren'?t\s+getting\s+(customers|clients|sales|traffic)\b/,
  /\bno\s+(customers|clients|sales|foot\s*traffic)\b/,
  /\blow\s+(sales|traffic|footfall)\b/,
  /\bstruggling\s+with\b/,
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
  /အရောင်း\s*(မကောင်း|မတက်|ကျ)/,
  /ဖောက်သည်\s*(မရ|မရှိ|နည်း)/,
  /customers?\s*(မရ|မရှိ)/i,
  /လမ်းညွှန်|အစီအစဉ်/,
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
 * business noun; when both goal and service signals fire, return ambiguous.
 */
export function classifyInputShape(raw: string): InputShape {
  const text = fold(raw);
  if (!text) return 'ambiguous';

  const service = matchesAny(text, SERVICE_PATTERNS);
  const goal = matchesAny(text, GOAL_PATTERNS);

  if (service && goal) return 'ambiguous';
  if (service) return 'service';
  if (goal) return 'goal';
  return 'ambiguous';
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
