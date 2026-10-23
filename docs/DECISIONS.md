# DECISIONS.md

Log of every significant technical decision. Write these in your own words.
Rule: if you cannot explain an entry without looking at AI output, you do not own it yet.

## Template (copy for each new decision)

### D-XXX: [Short title]
- **Date / Owner:** [time, teammate name]
- **Decision:** [what we chose]
- **Alternatives considered:** [option A, option B]
- **Why:** [reasons specific to OUR product, team and 24-hour limit]
- **Tradeoff accepted:** [what we give up]
- **Revisit when:** [condition that would make us change this, e.g. "10k+ concurrent users"]

---

## Logged Decisions

### D-004: React 19 + Vite + Tailwind CSS for Enterprise Banking UI
- **Date / Owner:** Hackathon Hour 1, Developer 1 (Frontend Architect)
- **Decision:** Build the entire frontend in `client/` using React 19, Vite, Tailwind CSS v4, Lucide Icons, and Recharts.
- **Alternatives considered:** Next.js (App Router), plain CSS, Material UI / Ant Design.
- **Why:** Vite provides instant HMR and builds in ~1.2 seconds, allowing lightning-fast iteration during a 3-hour hackathon. Tailwind gives full control over clean digital banking aesthetics without heavy library baggage.
- **Tradeoff accepted:** Client-side routing with React Router instead of SSR.
- **Revisit when:** Production scale needs SEO or public marketing pages with SSR.

### D-005: Clean Decoupled API Service Layer with Mock Store
- **Date / Owner:** Hackathon Hour 1, Developer 1 (Frontend Architect)
- **Decision:** Abstract all networking into `client/src/api/` (`applications.js`, `review.js`, `checker.js`, `notifications.js`) backed by an in-memory/sessionStorage mock database pre-populated with Case Study V1.0 worked examples (A2000001–A2000012).
- **Alternatives considered:** Hardcoded static arrays inside JSX components, MSW (Mock Service Worker).
- **Why:** Complete decoupling from backend development so Developer 2 can build Node/Express/MongoDB in parallel. Swapping to live HTTP endpoints only requires setting `VITE_API_BASE_URL` without altering page JSX.
- **Tradeoff accepted:** Client-side demo state is persisted in browser storage rather than an authoritative database until Developer 2 connects backend services.
- **Revisit when:** Backend REST API is deployed and environment variables are connected.

---

## Decisions to make (checklist, tick as logged)

- [ ] D-001: Database choice
- [ ] D-002: Auth approach (JWT cookie vs session vs third-party)
- [ ] D-003: API style (REST vs GraphQL)
- [x] D-004: Language & Build (React 19 + Vite + Tailwind CSS)
- [x] D-005: State management & API layer (Modular Service Layer + Mock Store)
- [ ] D-006: Architecture (modular monolith vs services)
- [ ] D-007: Deployment platform and why
- [ ] D-008: Validation library
- [ ] D-009: Caching / queue (only if a feature needs it)
- [ ] D-010: Testing strategy and CI

---

## Scaling story (fill in before the pitch)

How we would handle 100x traffic:
1. Stateless API behind a load balancer.
2. [Redis caching for ...]
3. [MongoDB read replicas / indexing / sharding plan]
4. [CDN for static assets]
5. [Which module we would split into its own service first, and why]

## Known limitations (be honest, judges respect this)

- [e.g. No email verification yet]
- [e.g. Rate limiting is per-instance, would move to Redis]
