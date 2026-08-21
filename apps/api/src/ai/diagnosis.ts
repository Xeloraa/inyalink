/**
 * Problem-shaped openings: ask where customers came from, wait, then
 * either an encoded roadmap or an honest regulars reply. Deterministic —
 * the model does not invent a hire-vs-plan question or a generic plan.
 */
import type { ChatMessage, UiLocale } from '@inyalink/shared';
import {
  classifyCustomerSourceAnswer,
  classifyInputShape,
  signalsDontKnow,
  signalsWantsVisibility,
  type CustomerSourceBranch,
} from '@inyalink/shared';

export type DiagnosisTurn = {
  nextQuestion: string;
  redirectTo?: 'roadmap';
  customerSource?: CustomerSourceBranch;
};

const REGULAR_MARK_EN = "I can't tell why regulars stopped";
const REGULAR_MARK_MY = 'Regulars ပြန်မလာတာ ဘာကြောင့်လဲ';

const SOURCE_Q: Record<UiLocale, string> = {
  en: 'When a shop goes quiet, the split that matters is where customers used to come from — that helps determine what kind of professional is actually worth hiring. Were most people finding you on Facebook, walking in off the street, or coming back as regulars?',
  my: 'ဆိုင်မှာ customer ပျောက်သွားရင် အရင်က ဘယ်ကနေ လာခဲ့သလဲဆိုတာက ဘယ်သူငှားရမလဲကို ဆုံးဖြတ်ဖို့ အရေးကြီးပါတယ်။ Facebook ကနေ တွေ့တာများပါသလား၊ လမ်းကနေ ဝင်တာများပါသလား၊ ဒါမှမဟုတ် မှန်မှန်လာတဲ့ regulars တွေပါသလား။',
};

function namedOnline(raw: string, locale: UiLocale): string {
  if (/tiktok/i.test(raw)) return 'TikTok';
  if (/instagram/i.test(raw)) return 'Instagram';
  return locale === 'my' ? 'Facebook' : 'Facebook';
}

function whenQuestion(
  locale: UiLocale,
  source: Exclude<CustomerSourceBranch, 'unsure'>,
  answer: string,
): string {
  if (source === 'online') {
    const channel = namedOnline(answer, locale);
    return locale === 'en'
      ? `${channel} was the main door. Roughly when did it start slowing down?`
      : `${channel} က ပင်မလမ်းကြောင်း ဖြစ်ခဲ့ပါတယ်။ ဘယ်အချိန်လောက်က စပြီး နှေးသွားတာပါလဲ။`;
  }
  if (source === 'walkins') {
    return locale === 'en'
      ? 'Walk-ins are a street problem, not a page problem, so the hire is different. When did you start noticing fewer people coming in off the street?'
      : 'လမ်းကနေ ဝင်တဲ့ customer ကျတာက page မရတာနဲ့ မတူပါဘူး၊ ငှားရမယ့်သူလည်း မတူပါဘူး။ လမ်းကနေ လူနည်းလာတာကို ဘယ်တုန်းက စသတိထားမိတာပါလဲ။';
  }
  return locale === 'en'
    ? "If they were mostly regulars, I can't tell from that alone why they stopped. When did you notice they weren't returning?"
    : 'Regulars များခဲ့တယ်ဆိုရင် ဘာကြောင့် ပြန်မလာတာလဲ ဒီအချက်တစ်ခုတည်းနဲ့ မပြောနိုင်ပါဘူး။ ဘယ်အချိန်လောက်က စပြီး ပြန်မလာတာပါလဲ။';
}

function echoWhen(raw: string): string | null {
  const t = raw.trim().replace(/[.。!?။]+$/u, '');
  if (!t) return null;
  if (signalsDontKnow(t) || /skip this/i.test(t) || /ကျော်/.test(t) || /မသေချာ/.test(t)) {
    return null;
  }
  if ([...t].length > 80) return null;
  return t;
}

function capEcho(text: string, locale: UiLocale): string {
  if (locale !== 'en') return text;
  const [first, ...rest] = [...text];
  if (!first) return text;
  return `${first.toUpperCase()}${rest.join('')}`;
}

function planLeadIn(
  locale: UiLocale,
  source: Exclude<CustomerSourceBranch, 'regulars'>,
  whenRaw: string,
): string {
  const when = echoWhen(whenRaw);
  const echoed = when ? capEcho(when, locale) : null;

  if (source === 'walkins') {
    return locale === 'en'
      ? echoed
        ? `${echoed} — if walk-ins dropped, people have to find the place from the street and from a map search. Here's who to hire for that, in order.`
        : 'If walk-ins dropped, people have to find the place from the street and from a map search. Here is who to hire for that, in order.'
      : echoed
        ? `${echoed} ဆိုရင် — လမ်းကနေ ဝင်သူနည်းသွားရင် လမ်းပေါ်က မြင်ရတာနဲ့ map မှာ ရှာလို့ရတာက အရေးကြီးပါတယ်။ အဲ့ဒီအတွက် ငှားရမယ့် အစီအစဉ်ပါ။`
        : 'လမ်းကနေ ဝင်သူနည်းသွားရင် လမ်းပေါ်က မြင်ရတာနဲ့ map မှာ ရှာလို့ရတာက အရေးကြီးပါတယ်။ အဲ့ဒီအတွက် ငှားရမယ့် အစီအစဉ်ပါ။';
  }

  if (source === 'unsure') {
    return locale === 'en'
      ? "If it isn't clear which door closed, the cheapest thing to test is whether new people can still find the shop online. Here's who to hire for that, in order."
      : 'ဘယ်လမ်းကြောင်း ပိတ်သွားမှန်း မသိသေးရင် လူအသစ်တွေ ဆိုင်ကို အွန်လိုင်းမှာ တွေ့နိုင်သေးလား စမ်းရအလွယ်ဆုံးပါ။ အဲ့ဒီအတွက် ငှားရမယ့် အစီအစဉ်ပါ။';
  }

  return locale === 'en'
    ? echoed
      ? `${echoed} — Facebook's organic reach has become much harder for businesses to rely on. Here's who to hire so the shop isn't stuck on one platform: someone for TikTok and first content, then a direct channel for people who already know you.`
      : "Facebook's organic reach has become much harder for businesses to rely on. Here's who to hire so the shop isn't stuck on one platform: someone for TikTok and first content, then a direct channel for people who already know you."
    : echoed
      ? `${echoed} ဆိုရင် — Facebook ရဲ့ organic reach က စီးပွားရေးတွေ အားကိုးရခက်လာပါတယ်။ Platform တစ်ခုတည်းပေါ် မမှီခိုအောင် ငှားရမယ့်သူက TikTok နဲ့ ပထမဆုံး content လုပ်ပေးမယ့်သူ၊ ပြီးရင် regulars အတွက် တိုက်ရိုက် လမ်းကြောင်းပါ။`
      : 'Facebook ရဲ့ organic reach က စီးပွားရေးတွေ အားကိုးရခက်လာပါတယ်။ Platform တစ်ခုတည်းပေါ် မမှီခိုအောင် ငှားရမယ့်သူက TikTok နဲ့ ပထမဆုံး content လုပ်ပေးမယ့်သူ၊ ပြီးရင် regulars အတွက် တိုက်ရိုက် လမ်းကြောင်းပါ။';
}

function regularsClose(locale: UiLocale): string {
  return locale === 'en'
    ? `${REGULAR_MARK_EN} coming from what's here. To get closer I'd need whether the product, the hours, or the neighbourhood changed — that takes someone who knows the shop. I shouldn't sell you a logo or a page for that. If you want help being easier to find for new people instead, say so.`
    : `${REGULAR_MARK_MY} ဆိုတာ ဒီမှာ မပြောနိုင်ပါဘူး — ပစ္စည်း၊ ဖွင့်ချိန်၊ ဒါမှမဟုတ် ရပ်ကွက် ပြောင်းသွားလား ဆိုတာ ထပ်သိမှ ပိုနီးစပ်ပါတယ်။ အဲ့ဒါက ဆိုင်ကို သိတဲ့သူ လိုပါတယ်၊ logo ဒါမှမဟုတ် page ရောင်းပြီး ဖြေရှင်းလို့ မရပါဘူး။ လူအသစ်တွေ ရှာရ ပိုလွယ်အောင် visibility ကူညီပေးစေချင်ရင် ပြောပါ။`;
}

function visibilityAck(locale: UiLocale): string {
  return locale === 'en'
    ? "Visibility for new people is a different job from why regulars left. Here's a hiring sequence that starts with social presence, the cheapest thing to test."
    : 'လူအသစ်တွေ ရှာရလွယ်အောင် လုပ်တာက regulars ဘာလို့ ရပ်သွားလဲ ဆိုတာနဲ့ မတူပါဘူး။ စမ်းရအလွယ်ဆုံး social presence က စတဲ့ ငှားရမ်းအစီအစဉ်ပါ။';
}

function lastWasRegularsClose(assistants: ChatMessage[]): boolean {
  const last = assistants[assistants.length - 1]?.content ?? '';
  return last.includes(REGULAR_MARK_EN) || last.includes(REGULAR_MARK_MY);
}

function conclude(
  locale: UiLocale,
  source: CustomerSourceBranch,
  whenRaw: string,
): DiagnosisTurn {
  if (source === 'regulars') {
    return { nextQuestion: regularsClose(locale) };
  }
  return {
    nextQuestion: planLeadIn(locale, source, whenRaw),
    redirectTo: 'roadmap',
    customerSource: source,
  };
}

/**
 * Next diagnosis turn, or null when this transcript is not a problem
 * diagnosis (so converse can proceed as a service brief / fallback).
 */
export function problemDiagnosisTurn(
  messages: ChatMessage[],
  locale: UiLocale,
): DiagnosisTurn | null {
  const users = messages.filter((m) => m.role === 'user');
  const assistants = messages.filter((m) => m.role === 'assistant');
  const opening = users[0]?.content;
  if (!opening || classifyInputShape(opening) !== 'problem') return null;

  const asked = assistants.length;
  const openingSource = classifyCustomerSourceAnswer(opening);
  const latest = users[users.length - 1]?.content ?? '';

  if (asked >= 1 && lastWasRegularsClose(assistants)) {
    if (signalsWantsVisibility(latest)) {
      return {
        nextQuestion: visibilityAck(locale),
        redirectTo: 'roadmap',
        customerSource: 'unsure',
      };
    }
    return null;
  }

  if (asked === 0) {
    if (openingSource !== 'unsure') {
      return { nextQuestion: whenQuestion(locale, openingSource, opening) };
    }
    return { nextQuestion: SOURCE_Q[locale] };
  }

  if (asked === 1) {
    if (openingSource !== 'unsure') {
      return conclude(locale, openingSource, latest);
    }
    const source = classifyCustomerSourceAnswer(latest);
    if (source === 'unsure') {
      return conclude(locale, 'unsure', latest);
    }
    return { nextQuestion: whenQuestion(locale, source, latest) };
  }

  if (asked === 2) {
    const source = classifyCustomerSourceAnswer(users[1]?.content ?? '');
    return conclude(locale, source, latest);
  }

  return null;
}
