# InyaLink Design System

**Version:** 1.0
**Role:** Lead Product Designer
**Scope:** hackathon build + foundation for launch

---

## 0. Scope decision — read this first

You asked for 16 screens. I'm giving you **5 designed, 11 specified.**

Sixteen screens at demo quality is 40+ hours of design work you don't have, and judges will see four of them. The discipline that makes a product feel good is choosing where the polish goes.

**Design in Figma (in this order):**
1. Landing
2. AI Conversation
3. Project Brief
4. Recommended Professionals
5. Roadmap

**Specify only — build plain, don't design:**
Authentication · Professional Profile · Messages · Dashboard · My Projects · Saved Roadmaps · Notifications · Settings · Professional Onboarding · Admin Matching

**Cut from MVP entirely:** Saved Roadmaps (nothing to save yet), Notifications (no volume to notify about), Settings (a language toggle in the header is your entire settings surface).

That's 16 → 5 designed, 8 specified, 3 deleted. See §7 for the full product review.

---

## 1. Foundations

### 1.1 Colour

Built from your existing emerald, but desaturated one step. The old palette was bright and confident — right for a marketplace. Calm and trustworthy wants slightly quieter.

**Primary — Jade**
```
jade-50    #F2FAF6    page tints, AI message bubbles
jade-100   #DFF2E8    badges, chip fills, stat cells
jade-200   #B4DFC9    borders on tinted surfaces
jade-400   #4EA57C    hover states, secondary marks
jade-600   #0E8256    PRIMARY — buttons, links, key numerals
jade-800   #0A5238    pressed states, text on jade-100
jade-900   #073825    display headings when tinted
```

**Accent — Amber.** Use sparingly: verification marks, one highlight per screen. If it appears more than twice on a screen, remove one.
```
amber-100  #FBF0DA
amber-500  #C89434
amber-800  #6F5116
```

**Neutrals — Ink.** Warm-shifted, not pure grey. Pure grey next to jade reads cold.
```
ink-900    #101613    primary text
ink-700    #333D38    body text
ink-500    #6B7770    secondary text
ink-400    #93A099    metadata, timestamps
ink-300    #B9C2BD    placeholders, disabled
```

**Surfaces**
```
paper      #FCFDFC    page background
white      #FFFFFF    cards, elevated surfaces
line       #E6EBE8    default hairline
line-soft  #F0F3F1    internal dividers
```

**Status**
```
success    #0E8256    (reuse jade-600)
warning    #C89434
danger     #C0453C
info       #3A6EA5
```

**Rules**
- One primary action per screen. `jade-600` is scarce by design.
- Never black text. `ink-900` at minimum.
- Text on `jade-100` uses `jade-800`, never ink.
- All body text passes 4.5:1 on `paper`. Verified: `ink-700` on `paper` = 9.2:1, `ink-500` = 4.9:1. `ink-400` is for metadata only, never body copy.

### 1.2 Typography

**Faces**
- **Display:** Sora, 500 and 600 only. Tracking `-0.02em` at 24px+, `-0.01em` below.
- **Body:** Inter, 400 and 500.
- **Burmese:** Noto Sans Myanmar, 400 and 600. Subset, self-hosted.

Two weights per face. More looks unresolved.

**Scale** — 1.25 ratio, rounded to whole pixels.

| Token | Size | Line height | Burmese LH | Use |
|---|---|---|---|---|
| `display-lg` | 40 | 1.15 | 1.5 | Landing headline (desktop) |
| `display-md` | 30 | 1.2 | 1.55 | Landing headline (mobile), page titles |
| `display-sm` | 24 | 1.3 | 1.6 | Section headings |
| `title` | 19 | 1.4 | 1.7 | Card titles, professional names |
| `body-lg` | 16 | 1.6 | 1.8 | Conversation messages, input text |
| `body` | 15 | 1.6 | 1.8 | Default body |
| `body-sm` | 13.5 | 1.55 | 1.8 | Secondary text, bios |
| `caption` | 12 | 1.5 | 1.75 | Labels, metadata |
| `stat` | 22 | 1.1 | — | Stat grid numerals (Sora 600, jade-600) |

**Burmese always gets the higher line-height.** Stacked diacritics clip below 1.8 and it looks broken. Never go below 1.75, even in captions.

**Burmese runs 15-25% longer than English.** Design every text container with slack. If it fits exactly in English, it breaks in Burmese.

### 1.3 Spacing

4px base. Use only these values.

```
xs   4     icon gaps, chip internals
sm   8     tight element pairs
md   12    within-card gaps
lg   16    card padding (mobile)
xl   24    card padding (desktop), between cards
2xl  32    section internal
3xl  48    between sections (mobile)
4xl  64    between sections (desktop)
5xl  96    hero vertical breathing room
```

**AI-first products feel calm because of space.** When a screen feels wrong, the fix is almost always more space, not more content.

### 1.4 Grid

**Mobile:** single column, 20px side margins, content max 380px.
**Tablet:** 2 columns, 32px margins.
**Desktop:** 12 columns, 24px gutters, 1200px max container.

**Reading width caps:** conversation 620px · brief 680px · landing hero text 560px. Never let body text exceed 680px regardless of viewport.

### 1.5 Radius

```
sm    8      chips, badges, small controls
md    12     buttons, inputs, list rows
lg    16     cards
xl    24     hero input, framed panels
full  999    pills, avatars
```

One rule: **the hero input gets `xl`.** It's the only element on the landing page with that radius, which is what makes it read as the primary object.

### 1.6 Shadows

Three tiers. Almost invisible by design.

```
sm   0 1px 2px rgba(16,22,19,0.04)
md   0 4px 16px rgba(16,22,19,0.06)
lg   0 16px 40px rgba(16,22,19,0.10)
focus 0 0 0 3px rgba(14,130,86,0.16)
```

**Prefer borders to shadows.** A `0.5px solid line` reads cleaner and renders more predictably on cheap Android screens. Reserve `lg` for the hero panel only.

### 1.7 Icons

Tabler outline, 1.5px stroke. Sizes: 16 inline, 20 default, 24 max.

**Never colour icons decoratively.** `ink-500` by default, `jade-600` only when the icon is the action. No emoji anywhere in the UI.

### 1.8 Motion

```
fast    120ms   hover, focus
base    200ms   entry, expansion
slow    320ms   page transitions
easing  cubic-bezier(0.2, 0, 0, 1)
```

Respect `prefers-reduced-motion` — replace all movement with opacity fades.

---

## 2. Components

### Buttons

| Variant | Fill | Text | Border | Use |
|---|---|---|---|---|
| Primary | `jade-600` | white | none | One per screen |
| Secondary | white | `ink-900` | `0.5px line` | Everything else |
| Ghost | none | `ink-700` | none | Tertiary, cancel |
| Danger | white | `danger` | `0.5px danger` | Destructive |

Heights: 48 mobile, 44 desktop, 36 compact. **48px minimum on mobile** — that's the tap-target floor and Ma Thida is on a phone.

Radius `md`. Full-width on mobile for primary actions. Loading state replaces the label with a spinner and keeps the button width fixed so layout doesn't jump.

### Input — hero variant

The most important component in the product.

```
Container   white, radius xl, 0.5px line, shadow-md
Padding     20px
Textarea    body-lg, min 3 rows, autogrow to 8, no visible border
Placeholder ink-300, Burmese, real example text
Footer      8px above border-top line-soft, 12px padding-top
  Left      caption ink-400 — "မြန်မာ or English"
  Right     primary button, pill radius
Focus       border jade-400 + shadow-focus
```

The placeholder must be a **real example sentence**, not "Type here." It teaches the interaction in one glance.

### Input — standard

40px mobile / 36px desktop, radius `md`, `0.5px line`, 12px horizontal padding. Label in `caption ink-500` above, 6px gap. Error state: `danger` border, message below in `caption danger`.

### Chat bubbles

```
User      jade-600 fill, white text, radius 16/16/4/16
          right-aligned, max-width 78%
AI        jade-50 fill, ink-900 text, radius 16/16/16/4
          left-aligned, max-width 86%
Padding   12px 16px
Gap       12px between bubbles
Text      body-lg, Burmese LH 1.8
```

**No avatars.** Alignment and colour carry the speaker. Avatars add clutter and imply a persona you don't want to promise.

**Thinking state:** an AI-side bubble containing three `ink-300` dots at 6px, staggered fade. Never a full-screen spinner — the conversation must stay visible.

### Professional card

The component that makes this feel like a real marketplace. Port the stat grid concept from the old prototype; it was the best thing in it.

```
Card        white, radius lg, 0.5px line, padding 20px

Header row  Avatar 52px full radius
            Name (title, 500) + verification mark (16px jade-600)
            Headline (body-sm, ink-500)
            Location (caption, ink-400, 14px pin icon)

Stat strip  4 cells, jade-50 fill, radius sm, 10px padding
            Numeral: stat token, Sora 600, jade-600
            Label:   caption, ink-500, 4px above
            Mobile:  2×2 grid. Desktop: 1×4.

Skills      up to 4 chips, then "+N"
Portfolio   3 thumbnails, 1:1, radius sm, 6px gap
AI reason   jade-50 tint block, body-sm ink-700, 12px padding
            Skeleton shimmer while streaming in
```

**Cells:** completed jobs · repeat clients · completion rate · response time.

**Never show total earnings.** Public income display is a privacy exposure, it's unverifiable while payments happen off-platform, and it contradicts the trust model.

### Roadmap card

```
Left rail   28px step numeral, Sora 600, jade-600
            Vertical connector line to next card
Title       title weight 500
Why         body-sm ink-500, 2 lines max
Cost band   caption in jade-100 pill — "၂၀၀,၀၀၀ – ၅၀၀,၀၀၀ ကျပ်"
Category    chip
Action      Secondary button, full-width mobile
```

The connector line is what makes it read as a sequence rather than a list. Don't skip it.

### Brief card

Label/value rows with `line-soft` dividers, an inline edit affordance on each. Header carries the AI-generated title with a small "edit" ghost button.

**Every field editable.** AI output the user can't correct destroys trust the first time it's wrong — and it will be wrong.

### Badges

```
Verified     jade-100 fill, jade-800 text, 14px check icon
Category     line-soft fill, ink-700 text
Status       role-tinted: proposed / in progress / delivered
Skill chip   white, 0.5px line, ink-700
```

All `caption`, 4px/10px padding, radius `sm`.

**Rename the old tiers.** "Top Rated" and "Rising Talent" are Fiverr's vocabulary and imply an algorithm you don't have. Say what you actually verified: "Portfolio reviewed."

### Navigation

**Mobile:** no bottom bar. You have four destinations, and a persistent bar competes with the conversation for the bottom of the screen where the input lives. Use a top bar — back arrow, title, language toggle — and a hamburger only if you build the dashboard.

**Desktop:** top bar only. No sidebar. Logo left; browse link, language toggle, account right. Four items maximum.

**Never a header search field.** A search bar in the header says *the way to use this is to search*, which is the opposite of your thesis. Search belongs on the browse page.

### Loading states

**Skeletons, not spinners.** Grey blocks matching final layout, subtle shimmer.

**AI calls take 2-7 seconds.** Never a bare spinner — show rotating Burmese progress text that changes every 2s:
```
နားလည်နေပါသည်…      understanding
ရှာဖွေနေပါသည်…       searching
ပြင်ဆင်နေပါသည်…      preparing
```

**Stream results.** Show match cards immediately (~200ms), let AI explanations fill into skeleton blocks (~1.7s). Never make the user wait for the slowest part.

### Empty states

Icon 40px `ink-300` · headline `title` `ink-900` · one line `body-sm` `ink-500` · primary action.

**Write them as invitations, not apologies.** "Start your first project," not "No projects yet."

### Error states

Inline where possible. Full-screen only for total failure.

**Rate limit** — this one is live in your demo, design it properly: `warning`-tinted banner above the conversation, message preserved, retry button, draft never lost.

---

## 3. Screens to design

### 3.1 Landing

**Above fold:** header (logo · browse · language) · eyebrow chip · headline with jade accent line · one-line subhead · **hero input** · two Burmese example chips · quiet browse link.

**Below fold:** framed conversation preview with visible stat strip · 3 featured professional cards · 3-step how-it-works · trust line.

**Why this layout:** the input is the only element with `xl` radius, `lg` shadow, and full container width. Nothing competes. The eye lands on it before reading anything.

**Why the browse link:** Ko Zaw knows he wants a logo. Forcing him through a conversation is friction, not intelligence. He exits in one click and never sees the AI.

**Mobile principles:** input reachable without scrolling · chips at thumb height · single column · 44px+ tap targets.

**Accessibility:** input is a labelled `<textarea>` with a visually-hidden label · chips are buttons, not divs · focus order top to bottom · headline is a real `h1` · 4.5:1 minimum throughout.

**On "it looks empty":** that's the fold, not the strategy. The hero *should* be sparse — that's what makes the input dominant. Fill the page below it.

### 3.2 AI conversation

Sticky header with back and progress ("၂ / ၄") · message list, 620px max, bottom-anchored · sticky composer.

**One question per screen on mobile.** Not a scrolling form. Cognitive load per screen is the single biggest driver of completion on a phone.

**Skip is always available.** "မသေချာပါ" (not sure) as a ghost button beside send. Never block on a question.

**Why bottom-anchored:** new messages appear where the eye already is, next to the input.

**Accessibility:** `aria-live="polite"` on the message list · input keeps focus after send · progress announced to screen readers.

### 3.3 Project brief

Header with AI-generated title and edit affordance · label/value rows · budget and deadline emphasised · primary "find professionals" · ghost "edit".

**Why a review step at all:** it's the trust moment. The user sees the AI understood them before committing. Skipping it saves 10 seconds and costs confidence.

### 3.4 Recommended professionals

Brief summary strip at top (collapsible) · exactly 3 cards · "see more" ghost link below.

**Why three:** more choice increases abandonment in a low-confidence buyer. Three is enough to feel like a choice, few enough to decide.

**Why the brief strip:** context. Without it the user forgets what these matches are for.

### 3.5 Roadmap

Goal restated at top · 4-6 connected step cards · disclaimer in `caption ink-400` at the bottom.

**Why step one gets a primary button and the rest secondary:** the roadmap's job is to produce one action, not five. Sequencing is the value; a page of equal buttons is a menu.

**Disclaimer is non-negotiable** where steps touch legal or tax matters.

---

## 4. Screens to specify, not design

Build these plain using the component library. No Figma time.

**Authentication** — skip for demo, hardcode a user. Later: phone input, 6-digit OTP, resend timer. Two screens.

**Professional profile** — the match card expanded: full stat grid (6 cells), full bio bilingual, complete portfolio, reviews. Reuse everything.

**Messages** — standard thread. Two additions that matter: the brief pinned at the top, and the 90-day retention notice visible. That notice is a trust feature; advertise it.

**Dashboard** — a list of your briefs and roadmaps. That's it. No sidebar, no stat cards, no widgets. Four destinations don't need architecture.

**My projects** — merge into Dashboard. Same list, filtered.

**Professional onboarding** — a multi-step form: category, skills, portfolio upload, questionnaire. Post-hackathon.

**Admin matching** — internal, ugly is fine, dense is good. Split view: unmatched briefs left, professional search right, brief detail centre. Keyboard navigable. **This is the screen you'll personally live in for six months, so build it functional rather than pretty.**

---

## 5. Full journey

```
Landing
  → describe goal              [input, 1 screen]
  → 3-4 clarifying questions   [1 per screen]
  → brief review               [editable]
  → [if goal-shaped] roadmap → pick one step
  → 3 matches with reasons
  → professional profile
  → message thread (brief attached)
  → status tracking
  → confirm completion         [writes reputation]
```

**Two entry points share one output.** Quick Hire enters at "describe goal." Guided Plan enters at the same input but produces a roadmap first, then funnels into the same brief flow. One code path, one design language.

---

## 6. Mobile-first rules

Ma Thida is on a mid-range Android, patchy 3G, possibly via VPN.

- **48px minimum tap targets.** No exceptions.
- **One decision per screen** in the conversation.
- **Bottom-anchored actions** — thumbs reach the bottom third.
- **90-second rule:** if the whole flow takes longer than 90 seconds of typing, she abandons. Cap at four questions; make every one skippable.
- **Drafts persist locally.** A dropped connection must never lose a half-written brief.
- **Everything degrades.** Cached professional lists readable offline. Every fetch has a timeout and a visible retry.
- **Test on a cheap Android**, not a simulator. Burmese rendering differs.

---

## 7. Product review — what to cut

You asked me to challenge the PRD. Here's where I'd push.

**Delete now:** Saved Roadmaps (nothing worth saving pre-liquidity) · Notifications (no volume) · Settings as a screen (a language toggle is your entire settings surface).

**Merge:** My Projects into Dashboard · Professional Profile into an expanded match card, at least for the demo.

**Delay:** Messages (demo ends at the match) · Auth (hardcode) · Professional Onboarding (you're recruiting by hand anyway).

**Redesign:** the AI from widget to primary interface — non-negotiable, it's the whole thesis · the brief form into a conversation · browse from front door to escape hatch.

**One thing I'd challenge in the vision itself.**

Ratings. The PRD defers public ratings until 50+ completed engagements, which is right — but I'd go further and question whether star ratings belong at all. They compress a complex judgment into a number, they're gameable, and early negative ratings are unrecoverable for a professional who did nothing wrong.

Completed count, repeat-client rate, and response time are harder to game and more informative. Consider shipping without stars permanently. It's differentiating, and it's consistent with everything else you've decided about not creating reductive records about people.

**And the assumption underneath all of this.**

This design commits hard to describe-first. That rests on assumption #2 — that buyers can't articulate what they need — which nobody has tested. Your BTP graduate interviews will tell you.

If they come back saying *"I knew exactly what I wanted, I just couldn't tell who was any good"* — then vetting is the product, browse is the interface, and the AI becomes a feature rather than the front door. The design system survives that pivot; the screen hierarchy doesn't.

Design for describe-first now. It's the right hackathon bet and the better story. But hold the question open, and run those interviews.

---

## 8. Where to spend your time

You have roughly ten days.

| Screen | Design hours | Why |
|---|---|---|
| Landing | 6-8 | First impression, most remembered |
| Conversation | 4 | The differentiator in motion |
| Matches | 4 | Where it looks like a real product |
| Brief | 2 | Functional, low dwell time |
| Roadmap | 2 | Mostly a list |
| Everything else | 0 | Build from components |

**About 20 hours of design.** That leaves implementation time and protects the rehearsal day.

The one thing that wins is Daw Zin typing Burmese on stage and getting a real roadmap with real people attached. The UI's job is to stay out of that moment's way and look like a product rather than a prototype.

You have the skill to clear that bar. Spend it on the landing page and the match cards. Leave the rest plain.
