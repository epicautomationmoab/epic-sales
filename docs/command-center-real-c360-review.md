# Real C360 integration — review and validation checklist

Branch: prototype/command-center-real-c360-20261021 in epic-sales
Entry route: /command-center
Status: code committed, NOT deployed and NOT build/browser/production tested.

## What this changes
One new server-rendered route inside the **existing epic-sales application**. Uses its current Supabase Auth employee profile check and the actual existing CustomersClient, which opens the actual existing Customer360Modal. Current C360 /customers and all existing API endpoints, Sidebar, email/SMS, notes, Lead Sheet, follow-ups, quote, Book It and other code remain unchanged. Sales navigation links remain in epic-sales; EpicTools destinations are links to the current tools domain. No new backend service and no copy of customer records.

## What is still not integrated
- Shared sign-on across the two original domains and global logout.
- Existing sidebars' popup and polling behaviors inside the new shell: C360 New Lead Sheet global button, My Catch-Up badge, Epic Ping badges, EpicTools incoming call popup, held-over/deposit badges. These remain operational in their original pages. Their absence from this shell is a **blocker to replacing** existing navigation.
- Mobile shell adaptation and accessibility behavior, real browser verification.
- Readiness 16 enhancers directly in this workspace; linked existing Readiness is not an embedded integrated experience.
- Any Iron Jack/fleet functionality or live status aggregation.
- Confirmation-to-visit chooser/handoff; current original components are reused as-is.

## Readiness for first PR review
1. TypeScript build, Next.js route compilation, lint (if configured), desktop/mobile browser screenshots at 375px and desktop.
2. Agent/manager login and workstation deny with synthetic auth; no privilege escalation.
3. Existing customer search, exact customer modal, cross-linked calls/messages, lead sheet, follow-up, drafts, quote link, staff booking helper. **Use fixtures and stubs for mutation transports**, never send a real message or create a real booking during testing.
4. Link destination/role check for every existing-menu item and source-app host. Confirm no open redirect or token in query.
5. Monitor component-side listeners relying on global Sidebar (Lead Sheet event) and provide parity before cutover.
6. Original /customers remains functional; test no regression.
7. Formal designer review against Command Center V1 shell and mobile fit.

## Cutover gate
Do not merge, deploy or redirect staff to the new shell until functionality parity is independently verified and owner approves release. This is only a review branch and intentionally incomplete.
