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

## Example (delete before submission)

### D-000: MongoDB over PostgreSQL
- **Date / Owner:** Fri 10:30, Ravi
- **Decision:** Use MongoDB with Mongoose.
- **Alternatives considered:** PostgreSQL with Prisma, Firebase.
- **Why:** Team already knows MERN, schema will change often during the hackathon, documents map naturally to our nested data.
- **Tradeoff accepted:** Weaker relational integrity and joins; we enforce rules in the service layer.
- **Revisit when:** Data becomes heavily relational or we need multi-row transactions at scale.

---

## Decisions to make (checklist, tick as logged)

- [ ] D-001: Database choice
- [ ] D-002: Auth approach (JWT cookie vs session vs third-party)
- [ ] D-003: API style (REST vs GraphQL)
- [ ] D-004: Language (JavaScript vs TypeScript)
- [ ] D-005: State management on client
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
