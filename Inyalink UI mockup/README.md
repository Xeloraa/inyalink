# Handoff: InyaLink UI redesign (roles, Find talent, Messages, pro sign-up)

## Overview
Redesign of the InyaLink web app covering: role-aware navigation and landing, a full-width
"Find talent" list, a centered search dialog, a 4-step professional sign-up with admin review,
a Messenger-style Messages view, profile viewing/editing, and a role switcher for testing.

## About the design files
`InyaLink.dc.html` (+ its runtime `support.js`) is a **design reference prototype**, not
production code. Do not copy its markup into the app. The task is to **recreate these designs
inside the existing InyaLink codebase** (`apps/web`: React + Vite + TypeScript + Tailwind +
TanStack Query + React Hook Form/Zod) following `AGENTS.md` and `ARCHITECTURE.md`.

Open the file in a browser to interact with it. The **role switcher is bottom-right** — use it
to view the app as business owner, professional, and admin.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii and interaction states are intentional and should
be matched. Where the prototype conflicts with the repo's design system
(`06-design-system.md`, `tailwind.config.js`), the repo wins — map prototype values onto
existing tokens rather than adding new ones.

## Repo constraints that apply to this work
From `AGENTS.md` — these are non-negotiable and this design does not override them:
- No identity-document fields anywhere in the pro sign-up (no NRC, ID number, passport, selfie).
  Sign-up collects only: category, skills, portfolio, about.
- `apps/web` talks only to `apps/api`. No direct Supabase calls for app data.
- All user text passes `normalizeToUnicode()` at the API boundary.
- Messages are hard-deleted. Do not add `deleted_at` to `messages`.
- Zod schemas live in `packages/shared/src/schemas/` and are shared; do not duplicate.
- Burmese text: **line-height 1.8 minimum**. The prototype is in English; Burmese strings are
  longer and taller — every fixed-height row, badge and button in this design must tolerate
  ~1.4x text growth and wrap rather than clip. Copy goes through `locales/my.json` + `en.json`.
- Backend module shape: `routes / service / repo / test`, four files, no variation.
- Vertical slices: schema → migration + `schema.sql` → repo → service → route → web feature → test.

## Screen map (prototype → repo)
| Design area | Existing repo file(s) to change |
| --- | --- |
| Find talent (was Browse) | `apps/web/src/routes/Browse.tsx`, `features/professionals/` |
| My briefs (was Open briefs) | `apps/web/src/routes/ProBriefs.tsx` |
| Messages list + thread | `features/messages/`, `routes/EngagementThreads.tsx`, `routes/EngagementMessages.tsx`, `components/ChatBubble.tsx` |
| Role-aware nav + landing | `components/Header.tsx`, `components/AppShell.tsx`, `routes/Landing.tsx`, `features/landing/` |
| Professional sign-up (4 steps) | `routes/ProfessionalsJoin.tsx`, `routes/Signup.tsx` |
| Profile view overlay / edit | `routes/ProfessionalProfile.tsx`, `routes/ProfessionalsEdit.tsx` |
| Admin review queue | `features/admin/`, `routes/admin/` |
| Role gating | `components/AccessGate.tsx`, `components/RequireAuth.tsx`, `lib/auth.tsx` |

## Roles and visibility
Three roles drive everything. Gate in one place (`lib/auth.tsx` + `AccessGate`), not per component.

**Business owner** — Find talent, My briefs, Messages. Sees the "Are you a professional?"
nav CTA until they apply.
**Professional** — My work (assigned tasks + invitations), Find talent, Messages. **Never**
sees My briefs. The "Are you a professional?" CTA is gone.
**Admin** — everything above plus the review queue.

On approval the account switches to the professional view automatically and the CTA disappears.

## Screens

### 1. Find talent
Purpose: a business owner scans available professionals and starts a conversation.
Layout: single column of **full-width rows, one professional per row, stacked vertically** — not
a card grid. Row: avatar left, name + headline + location + skill chips center, actions right.
Actions per row: **Message** (primary) and **View profile** (secondary). Both are quick actions;
neither navigates away from the list except View profile, which opens the overlay (below).
Row separators are 1px `#E6EBE8`; hover raises the row background to `#F7F9F7`.
Mobile: actions drop below the text block, full-width, min 44px tall.

### 2. Search dialog
A **centered square dialog**, not a tall panel or dropdown. Available from every screen, desktop
and mobile, at the same size and position. Scrim over the page; Esc and backdrop click close it.
Focus moves into the input on open and returns to the trigger on close.

### 3. My briefs (was "Open briefs")
Business owner and admin only. Professionals must not see the route or the nav item — gate the
route, don't just hide the link.

### 4. Professional sign-up — 4 linear steps
Steps, in order: **1 Category → 2 Skills → 3 Portfolio → 4 About.**
Linear: one step per screen, Back/Continue, progress indicator showing 4 steps.
Submission creates a pending application in the **admin review queue**; the user lands on a
"pending review" state, not the professional view.
No identity documents at any step (see constraints).
Validation: React Hook Form + Zod resolver, schema in `packages/shared/src/schemas/`.

### 5. Admin review queue
List of pending applications with approve / reject. Approval flips the account's role, which
switches their nav and landing on next load and removes the pro CTA.

### 6. Messages (Messenger-style)
Two panes. **Left:** conversation list — avatar, name, last-message snippet (one line, ellipsis),
timestamp, unread count badge. Selected conversation is highlighted. **Right:** the thread —
bubbles, own messages right-aligned in green, others left-aligned on light grey, composer pinned
to the bottom.
Bubble radii from the prototype: own `16px 16px 4px 16px`, other `16px 16px 16px 4px`
(a second, larger pair exists at 18px/6px — pick one and use it consistently).
**Mobile:** panes stack — list, then thread as a full-screen view with a back affordance.
In the main nav for all three roles.

### 7. Profile view overlay
Opens over the current page at roughly **80% of the viewport**, centered, scrim behind. Shows
full profile info, portfolio items, and a **Message** button. Closing returns to the underlying
list with scroll position intact.

### 8. Profile editing
Editable fields: **name, headline, location, about**. Avatar is the simple green avatar
(initial on a green fill) — the prototype deliberately restored this over a photo/upload.

## Interactions
- Row hover: background to `#F7F9F7`, no transform.
- Dialog/overlay: scrim + centered box; Esc closes; backdrop click closes; focus trapped while open.
- Sign-up: forward only on valid step; Back preserves entered values.
- Unread badge clears on thread open.
- Role switcher (bottom-right) is a **prototype-only** testing device. Do not ship it.
- Transitions in the prototype are short and subtle (~150-200ms, ease-out). Keep motion cheap —
  users are on slow mobile connections.

## State
- `role`: `'owner' | 'professional' | 'admin'` — drives nav, landing, route gating.
- `applicationStatus`: `none | pending | approved | rejected` — drives the pro CTA and the
  post-submit screen.
- Sign-up wizard: `step` (1-4) + accumulated form values.
- Messages: `selectedConversationId`, per-conversation unread count.
- Overlay: `viewedProfileId | null`.
Server state via TanStack Query, keyed per feature; no new global store (`AGENTS.md`).

## Design tokens (from the prototype)
Greens: `#0E8256` primary, `#0A5238` dark, `#073825`/`#04241A` deepest, `#4FD08C` bright accent,
`#83C9A6`, `#B4DFC9`, `#C7E6D6`, `#D5EBDF`, `#DFF2E8`, `#E1F0E8`, `#F2FAF6` tints.
Neutrals: `#101613` text, `#333D38`, `#6B7770` secondary text, `#93A099` muted, `#B9C2BD` borders,
`#E6EBE8`/`#E7EDE9`/`#EBF0EC` lines, `#F0F3F1`, `#F4F6F4`, `#F7F9F7`, `#FBFDFC`/`#FCFDFC`, `#FFFFFF`.
Status: warning `#B98A1F` on `#FBF0DA` with text `#6F5116`; error/destructive `#C0453C`.
Type: **Manrope** for UI (repo ships Fraunces + Noto Sans Myanmar — reconcile with
`06-design-system.md` before adding a font); `ui-monospace, Menlo, monospace` for code-ish values.
Radii: 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 38, 999 (pill). Chips and avatars are 999.
Hit targets: 44px minimum on mobile.

## Assets
No new images. The prototype uses the green initial avatar drawn in markup. Repo already has
`public/images/avatars/` and `public/images/portfolio/` — use those.

## Files in this bundle
- `InyaLink.dc.html` — the interactive prototype (open in a browser; role switcher bottom-right)
- `support.js` — runtime required by the prototype

## Open question for the team
Should the professional identity carry a separate display name from the business-owner account,
or stay linked to one name? This affects the profile schema and the sign-up step 4 copy.
