# Regression Matrix

This file is the release gate for refactor/split work.
Rule: no "single-point fix and stop". We only close when all critical items are green.

## Automated Checks

- [x] Typecheck (`npm run typecheck`)
- [x] Backend tests (`npm run test:backend`) - 6/6 passed

## Core Feature Matrix (Manual)

- [ ] Auth flow: login fail -> redirect login, no loop; register/login field rules
- [ ] Navigation routing: URL maps to tab; direct URL opens right view; unauth redirects to login
- [ ] Chat: pagination, anchor jump, unread counter bubble, auto-scroll behavior
- [ ] Notifications: list pagination, menu actions, single/multi select, mark read/delete, jump target
- [ ] Bills: unpaid/paid split render, pagination, publish/edit/pay flow, weighted split preview
- [ ] Duty: pending/done split render, pagination, assign/complete/revert/delete
- [ ] Settings: auto-save, avatar upload trigger, dorm/member/bot/security cards
- [ ] Theme: sleep mode full text contrast (no dark text on dark bg)
- [ ] I18n: no hardcoded display text in unsupported language paths
- [ ] Realtime: websocket message/notification sync and in-page auto-read rules

## Regression Policy

- Any failed item blocks closure.
- Every fix must reference at least one matrix item.
- If one item is fixed, re-run affected neighbor items before closing.
