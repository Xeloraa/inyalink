/**
 * Encoded hiring sequences for diagnosed shop-traffic problems.
 * The model must not invent a generic plan (signage-first, etc.).
 */
import type {
  CustomerSourceBranch,
  RoadmapStep,
  UiLocale,
} from '@inyalink/shared';

export type ProblemPlanBranch = Exclude<CustomerSourceBranch, 'regulars'>;

type Plan = {
  language: UiLocale;
  disclaimer: string;
  steps: RoadmapStep[];
};

const DISCLAIMER: Record<UiLocale, string> = {
  en: 'This is a hiring plan and cost estimate only, not a guarantee of results. It is not legal, tax, or regulatory advice.',
  my: 'ဤအစီအစဉ်သည် ငှားရမ်းရန် အကြံပြုချက်နှင့် ကုန်ကျစရိတ် ခန့်မှန်းချက်သာ ဖြစ်ပါသည်။ ရလဒ် အာမခံချက် မဟုတ်ပါ။ ဥပဒေ၊ အခွန် သို့မဟုတ် စည်းမျဉ်းဆိုင်ရာ အကြံဉာဏ်လည်း မဟုတ်ပါ။',
};

function step(
  order: number,
  title: string,
  why: string,
  category_slug: string,
  est_min_mmk: number,
  est_max_mmk: number,
): RoadmapStep {
  return { order, title, why, category_slug, est_min_mmk, est_max_mmk };
}

/** Facebook / online — same sequence as unsure, but the why names Facebook. */
const ONLINE_EN: RoadmapStep[] = [
  step(
    1,
    'TikTok setup and first content',
    "Facebook's organic reach has become much harder for businesses to rely on. Hire someone who can set up TikTok and produce a first batch of clips — that's how you test whether new people still find the shop.",
    'video-tiktok-content',
    80_000,
    300_000,
  ),
  step(
    2,
    'Move regulars to Telegram or Viber',
    'Then hire someone who can move people who already know you onto Telegram or Viber, so the shop keeps a direct relationship instead of relying entirely on a social-platform algorithm.',
    'social-media-marketing',
    80_000,
    180_000,
  ),
  step(
    3,
    'Ongoing monthly content',
    'After a first batch, the relevant professional is someone who can create and manage content every month — not a one-time campaign.',
    'social-media-marketing',
    120_000,
    200_000,
  ),
  step(
    4,
    'Photography refresh if existing photos are weak',
    "Hire a photographer for a refresh only if the photos you have now don't show the place as it actually is. Weak photos make every post look closed.",
    'photography',
    100_000,
    250_000,
  ),
];

const ONLINE_MY: RoadmapStep[] = [
  step(
    1,
    'TikTok setup နဲ့ ပထမဆုံး content',
    'Facebook ရဲ့ organic reach က စီးပွားရေးတွေ အားကိုးရခက်လာပါတယ်။ ပထမဆုံး ငှားရမှာက TikTok setup နဲ့ clip အသုတ် လုပ်ပေးမယ့်သူ — လူအသစ်တွေ ဆိုင်ကို တွေ့နိုင်သေးလား စမ်းဖို့ပါ။',
    'video-tiktok-content',
    80_000,
    300_000,
  ),
  step(
    2,
    'Regulars ကို Telegram ဒါမှမဟုတ် Viber သို့ ရွှေ့ရန်',
    'နောက်တစ်ယောက်က regulars ကို Telegram ဒါမှမဟုတ် Viber သို့ ရွှေ့ပေးမယ့်သူ — algorithm ပေါ် မမှီခိုဘဲ တိုက်ရိုက် ဆက်သွယ်ထားဖို့ပါ။',
    'social-media-marketing',
    80_000,
    180_000,
  ),
  step(
    3,
    'လစဉ် content — ပုံမှန် တင်ပေးမယ့်သူ',
    'ပထမအသုတ်ပြီးရင် ငှားရမှာက လစဉ် content ဖန်တီး/စီမံပေးမယ့်သူပါ — တစ်ခါတည်း campaign မဟုတ်ပါဘူး။',
    'social-media-marketing',
    120_000,
    200_000,
  ),
  step(
    4,
    'ဓာတ်ပုံ ပြန်ရိုက်ရန် (ပုံတွေ အားနည်းနေရင်)',
    'အခုရှိတဲ့ ပုံတွေက ဆိုင်အနေအထားကို မပြနိုင်မှ သာ ဓာတ်ပုံဆရာ ငှားပါ။ ပုံအားနည်းရင် ပို့စ်တိုင်း ပိတ်နေသလို မြင်ရပါတယ်။',
    'photography',
    100_000,
    250_000,
  ),
];

/** Walk-ins dropped — street visibility, then maps, then honest photos. */
const WALKINS_EN: RoadmapStep[] = [
  step(
    1,
    'Signage and street visibility',
    'If people used to walk in, they have to see the place from the street first. Hire a designer for signage and street visibility — not a Facebook page.',
    'graphic-design',
    80_000,
    300_000,
  ),
  step(
    2,
    'Google Maps and local listing setup',
    'Then hire someone who can set up Google Maps and a local listing with the right hours and pin, so people searching nearby can actually find you.',
    'social-media-marketing',
    60_000,
    150_000,
  ),
  step(
    3,
    'Photography that shows what the place is actually like',
    "Hire a photographer for a small shoot of the room, the counter, and what you sell — only if the current photos don't show the place as it is.",
    'photography',
    100_000,
    250_000,
  ),
];

const WALKINS_MY: RoadmapStep[] = [
  step(
    1,
    'Signage နဲ့ လမ်းပေါ်က မြင်သာမှု',
    'လမ်းကနေ ဝင်တဲ့သူတွေက ဆိုင်ကို လမ်းပေါ်က အရင် မြင်ရပါမယ်။ ပထမဆုံး ငှားရမှာက signage လုပ်ပေးမယ့် designer ပါ — page မဟုတ်ပါဘူး။',
    'graphic-design',
    80_000,
    300_000,
  ),
  step(
    2,
    'Google Maps နဲ့ local listing တည်ဆောက်ရန်',
    'နောက်တစ်ယောက်က Google Maps နဲ့ local listing တည်ဆောက်ပေးမယ့်သူ — ဖွင့်ချိန်နဲ့ တည်နေရာ မှန်အောင် လုပ်ပေးဖို့ပါ။',
    'social-media-marketing',
    60_000,
    150_000,
  ),
  step(
    3,
    'ဆိုင်အနေအထားကို ပြတဲ့ ဓာတ်ပုံ',
    'အခုပုံတွေက ဆိုင်အနေအထားကို မပြနိုင်မှ ဓာတ်ပုံဆရာ ငှားပါ။ အခန်း၊ ကောင်တာ၊ ရောင်းတဲ့ ပစ္စည်းကို ပြတဲ့ ပုံအသုတ်လေး ဆိုရင် လုံလောက်ပါတယ်။',
    'photography',
    100_000,
    250_000,
  ),
];

/**
 * Cause unknown — same social-presence sequence as Facebook, without
 * claiming Facebook was the door that closed.
 */
const UNSURE_EN: RoadmapStep[] = [
  step(
    1,
    'TikTok setup and first content',
    "When it isn't clear which door closed, a first batch of short-form clips is a cheap way to test whether new people can still find the shop. Hire someone who can set up TikTok and produce that first content.",
    'video-tiktok-content',
    80_000,
    300_000,
  ),
  step(
    2,
    'Move regulars to Telegram or Viber',
    'Then hire someone who can move people who already know you onto Telegram or Viber, so the shop keeps a direct relationship instead of relying entirely on a social-platform algorithm.',
    'social-media-marketing',
    80_000,
    180_000,
  ),
  step(
    3,
    'Ongoing monthly content',
    'After a first batch, the relevant professional is someone who can create and manage content every month — not a one-time campaign.',
    'social-media-marketing',
    120_000,
    200_000,
  ),
  step(
    4,
    'Photography refresh if existing photos are weak',
    "Hire a photographer for a refresh only if the photos you have now don't show the place as it actually is. Weak photos make every post look closed.",
    'photography',
    100_000,
    250_000,
  ),
];

const UNSURE_MY: RoadmapStep[] = [
  step(
    1,
    'TikTok setup နဲ့ ပထမဆုံး content',
    'ဘယ်လမ်းကြောင်း ပိတ်သွားမှန်း မသိသေးရင် လူအသစ်တွေ အွန်လိုင်းမှာ တွေ့နိုင်သေးလား စမ်းရအလွယ်ဆုံးပါ။ ငှားရမှာက TikTok setup နဲ့ ပထမဆုံး clip လုပ်ပေးမယ့်သူပါ။',
    'video-tiktok-content',
    80_000,
    300_000,
  ),
  step(
    2,
    'Regulars ကို Telegram ဒါမှမဟုတ် Viber သို့ ရွှေ့ရန်',
    'နောက်တစ်ယောက်က regulars ကို Telegram ဒါမှမဟုတ် Viber သို့ ရွှေ့ပေးမယ့်သူ — algorithm ပေါ် မမှီခိုဘဲ တိုက်ရိုက် ဆက်သွယ်ထားဖို့ပါ။',
    'social-media-marketing',
    80_000,
    180_000,
  ),
  step(
    3,
    'လစဉ် content — ပုံမှန် တင်ပေးမယ့်သူ',
    'ပထမအသုတ်ပြီးရင် ငှားရမှာက လစဉ် content ဖန်တီး/စီမံပေးမယ့်သူပါ — တစ်ခါတည်း campaign မဟုတ်ပါဘူး။',
    'social-media-marketing',
    120_000,
    200_000,
  ),
  step(
    4,
    'ဓာတ်ပုံ ပြန်ရိုက်ရန် (ပုံတွေ အားနည်းနေရင်)',
    'အခုရှိတဲ့ ပုံတွေက ဆိုင်အနေအထားကို မပြနိုင်မှ သာ ဓာတ်ပုံဆရာ ငှားပါ။ ပုံအားနည်းရင် ပို့စ်တိုင်း ပိတ်နေသလို မြင်ရပါတယ်။',
    'photography',
    100_000,
    250_000,
  ),
];

const PLANS: Record<ProblemPlanBranch, Record<UiLocale, RoadmapStep[]>> = {
  online: { en: ONLINE_EN, my: ONLINE_MY },
  walkins: { en: WALKINS_EN, my: WALKINS_MY },
  unsure: { en: UNSURE_EN, my: UNSURE_MY },
};

export function encodedProblemRoadmap(
  branch: ProblemPlanBranch,
  locale: UiLocale,
): Plan {
  return {
    language: locale,
    disclaimer: DISCLAIMER[locale],
    steps: PLANS[branch][locale],
  };
}
