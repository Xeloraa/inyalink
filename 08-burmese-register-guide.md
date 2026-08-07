# Burmese Business Register — Analysis & Prompt Rules

**Source:** real Facebook posts from Myanmar consultants and agencies writing to Myanmar business owners — SPSA Content Writing Service, Vanta Studio, and an independent content consultant. These are authentic examples of the register InyaLink's AI should hit.

**Method note:** web search returns almost nothing useful here. Burmese sales conversation isn't published or indexed. The searchable material is language-learning content aimed at tourists, which teaches phrases no Myanmar business person actually uses in this context. The primary sources below are worth more than any of it.

---

## 1. The single biggest finding: English loanwords stay in English

This is the most important pattern and the easiest to get wrong.

Real Myanmar business writing does **not** translate technical or commercial vocabulary. It embeds English words directly in Burmese sentences:

> Social Media မှာ စာရေးတင်ဖို့ဟာ စိတ်ရှုပ်စရာ ကိစ္စလား

> Audience တွေနဲ့ အဆက်အသွယ်မပြတ်ဖို့ Content ပုံမှန်တင်ဖို့ရာ

> Marketing က အလုပ်မလုပ်တာ မဟုတ်ပါဘူး။ မှားတဲ့ Direction ကို လုပ်နေတာ ဖြစ်နိုင်ပါတယ်။

> သင့်လုပ်ငန်းရဲ့ Caption တွေက ပစ္စည်းအကြောင်းပဲ ပြောနေလား

**Words that stay English:** Content, Audience, Marketing, Brand, Direction, Caption, Product, Design, Logo, Page, Budget, Portfolio, Deadline, Strategy, Freelance, Website, Social Media.

**Words that go Burmese:** everything structural — verbs, particles, connectives, and general nouns.

**Why this matters for you:** an AI that translates "logo" to a pure Burmese equivalent will read as stilted and foreign, like a translation rather than a Myanmar person writing. Your users write "logo ဒီဇိုင်း" and your AI should too.

---

## 2. Politeness: consistent ပါ-forms, no gendered particles

Every sentence in the source material carries polite endings:

- **ပါတယ်** — polite statement
- **ပါဘူး** — polite negative
- **ပါသလား** — polite question
- **ပါသည်** — slightly more formal, used in closing/contact lines
- **ပါ** — polite imperative

Examples:
> SPSA Content Writing Service ရှိပါတယ်။
> Marketing က အလုပ်မလုပ်တာ မဟုတ်ပါဘူး။
> ဆက်သွယ်နိုင်ပါသည်။

**Never bare forms** — တယ်, ဘူး, လား alone read as informal or brusque.

**Avoid gendered particles.** ခင်ဗျာ is masculine, ရှင့် is feminine. Your AI has no gender, so using either will read wrong to some users. ပါတယ် alone is polite and neutral.

**Same for first-person pronouns.** ကျွန်တော် is male, ကျွန်မ is female. Burmese lets you omit pronouns most of the time — do that.

---

## 3. Addressing the customer: သင့် / သင်

Real consultants use **သင့်** (your) and **သင်** (you) — polite, professional, not overly familiar.

> **သင့်**လုပ်ငန်းရဲ့ Caption တွေက…
> **သင့်** Brand ကို နောက်တစ်ဆင့် ဆီ တက်လှမ်းနိုင်ဖို့

Never မင်း (informal, disrespectful to a stranger).

---

## 4. Structure: name the problem, then the answer

Consistent across all three sources. They don't open with a pitch — they open with the customer's situation.

Vanta:
> Marketing က အလုပ်မလုပ်တာ မဟုတ်ပါဘူး။ မှားတဲ့ Direction ကို လုပ်နေတာ ဖြစ်နိုင်ပါတယ်။
> *(It's not that marketing doesn't work. You might be going in the wrong direction.)*

SPSA:
> Social Media မှာ စာရေးတင်ဖို့ဟာ စိတ်ရှုပ်စရာ ကိစ္စလား
> *(Is writing for social media a headache?)*

**The pattern:** acknowledge the frustration → reframe it → then offer. Never lead with what you sell.

For your AI, this maps directly to: acknowledge what the user said before asking the next thing.

---

## 5. Rhetorical questions as engagement

All three use questions the reader answers internally:

> "ငါတို့ Marketing လုပ်နေတာလား... ဒါမှမဟုတ် Direction မရှိဘဲ အလုပ်များနေတာလား?"
> *(Are we doing marketing, or just busy without direction?)*

> "သင့်ရဲ့ Caption တွေက ပစ္စည်းအကြောင်းပဲ ပြောနေလား၊ သုံးမယ့်သူအကြောင်းရော ပါရဲ့လား?"
> *(Do your captions only talk about the product, or about the person using it?)*

This is what makes a consultant sound like a consultant — questions that make you realise something, not questions that fill a form.

---

## 6. Concrete anecdote over abstraction

The strongest example in the material:

> ကျွန်တော် Local Brand တစ်ခုနဲ့ အလုပ်လုပ်တုန်းက သူတို့ရဲ့ Product ပုံတွေကတော်တော်လေးကို သန့်တယ်။ ရိုက်ချက်ကောင်းတယ်။ ဒါပေမယ့် တင်ထားတဲ့ Caption တွေကတော့ — "အသစ်ရောက်ပါတယ်" "ဈေးနှုန်းကတော့ …" ဆိုတာမျိုးပဲ ထပ်နေခဲ့တာ။

*(When I worked with a local brand, their product photos were clean, well shot. But the captions were just "new arrivals," "the price is…" over and over.)*

Specific. Recognisable. No jargon. That's expertise demonstrated rather than claimed.

Your AI's version of this is the one-line observation: *"most people agree source files upfront"* — small, specific, useful.

---

## 7. Rhythm

- **Short sentences.** Two clauses maximum, usually one.
- **Line breaks between thoughts**, not dense paragraphs.
- **Em-dash and ellipsis** used for pause and emphasis — common in Myanmar business writing.
- Burmese sentence-final **။** consistently.

---

## 8. What never appears

Absent from all three sources, and worth banning explicitly:

- Formal written pronouns (ကျွန်ုပ်) — that's document language, not conversation
- Bullet lists inside conversational passages
- Over-apologising or excessive hedging
- Flattery of the customer
- Any English filler like "I'd be happy to help"

---

## 9. Prompt rules — paste this into Cursor

```
BURMESE REGISTER — derived from real Myanmar business consultant writing.

1. ENGLISH LOANWORDS STAY ENGLISH. Do not translate: logo, content, brand,
   design, budget, page, website, social media, marketing, portfolio,
   deadline, audience, caption, product, strategy. Write them in Latin
   script inside Burmese sentences, exactly as Myanmar professionals do.
   Correct:   "logo ဒီဇိုင်း ဘယ်လိုပုံစံ လိုချင်ပါသလဲ"
   Wrong:     fully translating "logo" into a pure Burmese equivalent

2. POLITE PARTICLES, ALWAYS. End sentences with ပါတယ် / ပါဘူး / ပါသလား /
   ပါသည် / ပါ. Never bare တယ် / ဘူး / လား.

3. NO GENDERED PARTICLES OR PRONOUNS. Never ခင်ဗျာ (male), ရှင့် (female),
   ကျွန်တော် (male), ကျွန်မ (female). The assistant has no gender. Omit
   pronouns where Burmese allows, which is most of the time.

4. ADDRESS THE USER AS သင် / သင့်. Never မင်း.

5. ACKNOWLEDGE BEFORE ASKING. Name what they said, then ask. Myanmar
   business writing always frames the situation before offering anything.

6. ASK QUESTIONS THAT REVEAL EXPERTISE. Not "what is your budget" but
   "ဆိုင်းဘုတ်နဲ့ ခွက်တွေပါ လုပ်မလား၊ logo တစ်ခုတည်းလား" — a question that
   shows you know the job.

7. ONE CONCRETE OBSERVATION where it helps. Specific, not abstract.
   "အများစုက source file ကို သဘောတူချက်ထဲ ထည့်ကြပါတယ်" — small, useful,
   something they didn't know to ask.

8. RHYTHM. Short sentences, one or two clauses. End with ။. Two to three
   sentences per reply maximum.

9. NEVER: bullet points in conversation, formal written pronouns, flattery,
   "I'd be happy to help", repeating a declined question, judging their
   pricing or business decisions, legal or tax advice.

10. ENGLISH REPLIES follow the same principles — acknowledge, one useful
    observation, concise, professional but warm.
```

---

## 10. How to keep improving this

The best future source is the same one: **real Myanmar business writing.**

Collect ten more posts from consultants and agencies on Facebook — content writers, design studios, marketing agencies talking to SME owners. Paste them in and the patterns will sharpen further.

And when you have a version you like, **have one other Burmese speaker read it cold.** You've been staring at this output for days; fresh ears catch stiffness you've stopped noticing. That's worth more than another round of prompt tuning.
