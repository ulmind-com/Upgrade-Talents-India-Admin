# Upgrade Talents India — Admin Control Room

The business control panel for the **Eventora API**. Next.js 15 · React 19 · TypeScript · Tailwind v4 · Recharts.

> The backend is **not modified**. Every screen calls the existing FastAPI admin endpoints.

## Run

```bash
npm install
npm run dev     # http://localhost:3001
```

`.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Sign in at `/login` with the super-admin account. If no admin exists yet, the backend
exposes `POST /api/admin/bootstrap`, which creates one from `SUPER_ADMIN_EMAIL` /
`SUPER_ADMIN_PASSWORD` in the backend environment.

## Screens → client requirement → endpoints

| Screen | Doc section | Endpoints |
|---|---|---|
| Dashboard | §16 Dashboard | aggregates events, users, tickets, competitions, courses, orders, announcements |
| Events | §16 Events | `GET/POST/PUT/DELETE /api/admin/events`, `PATCH …/publish`, `…/visibility`, `…/reorder` |
| Tickets | §16 Tickets | `GET/POST/PUT/DELETE /api/admin/tickets` (per event) |
| Gate Check-in | §13, §20 | `POST /api/admin/tickets/verify`, `…/check-in`, `POST /api/admin/vip-passes/verify` |
| VIP Passes | §13 VIP Pass & Special Access | full `/api/admin/…/vip-*` surface: configs, capacity, analytics, issue, revoke, bookings, check-in log |
| Competitions | §7, §8 | `/api/admin/advanced-competitions/*` incl. session open/close, judging lock, recalculate, approve & publish results |
| Judges | §16 Judges | `/api/admin/judges/*` incl. invitations and assignments |
| Volunteers | §20 | `/api/admin/volunteers/*` |
| Certificates | §12 Certificate & Badge | `/api/admin/certificates/*` incl. PDF download and revoke |
| Badges | §12 | `/api/admin/badges/*` incl. reconcile |
| Courses / Workshops | §11 | `/api/admin/courses/*`, `/api/admin/workshops/*` |
| Merchandise | §14 Event Merchandise | products, orders with status updates, inventory, analytics |
| Rewards & Referrals | §10 | referral + coin configs, referral list, coin ledger, expiry job |
| Users | §5, §16 Users | list, delete, recycle bin, restore, force delete, profile summary |
| Notifications | §15 | announcements: draft → schedule → publish → cancel |
| Website Content | **§24 Fully Dynamic Website** | brand, contact, social, banners, testimonials, live events, contest promo, app promo, important links |
| Audit Log | §19, §20 | `GET /api/admin/audit-logs` |
| Settings | §9 Voting System | `GET/PUT /api/admin/voting-settings` (voting power per channel) |

### §24 — nothing is hard-coded

Brand name, logo, tagline, homepage headline, events, banners, testimonials, courses,
contest promos, app promotion, contact details and footer links are all edited here and
read by the public site from the same API. Draft → publish → unpublish → reorder is
supported wherever the backend exposes it.

## Architecture

- [`src/lib/api.ts`](src/lib/api.ts) — one typed function per endpoint, plus `toRows()`
  which normalises the different list shapes (`[]`, `{items}`, `{data}`, …) the backend returns.
- [`src/components/Kit.tsx`](src/components/Kit.tsx) — `DataTable`, `Modal`, `Field`,
  `Toggle`, `useResource`, `useConfirm`, loading/error/empty states.
- [`src/components/Crud.tsx`](src/components/Crud.tsx) — config-driven list + create/edit/delete,
  so a resource screen is a column list, a field list and a `toBody` mapper.
- [`src/components/Shell.tsx`](src/components/Shell.tsx) — sidebar, quick-jump search, theme toggle, session.

## Accessibility & UX

- Every table is keyboard navigable with a visible focus ring; icon-only buttons carry `aria-label`.
- Form errors are linked with `aria-describedby`; toasts use a polite live region and never steal focus.
- Destructive actions (delete, revoke, force-delete, lock judging, publish results) go through a confirm dialog.
- Light and dark themes are both token-driven and contrast-checked; the choice persists per browser.
- Respects `prefers-reduced-motion`.
