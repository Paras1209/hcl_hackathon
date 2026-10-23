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

## Actual Decisions (OnboardIQ)

### D-001: MongoDB over PostgreSQL
- **Date / Owner:** [To be filled by team]
- **Decision:** MongoDB with Mongoose
- **Alternatives considered:** 
  1. PostgreSQL with Prisma - strong relational model, ACID transactions
  2. PostgreSQL with Sequelize - mature ORM, better for complex joins
- **Why:** 
  - Application data is document-centric (application + array of documents + nested audit logs)
  - Status lifecycle is linear, not heavily relational (no complex joins needed)
  - Flexible schema for rule outputs (reason_codes array, extracted fields vary by doc_type)
  - Team velocity: faster prototyping with Mongoose, no migrations during hackathon
  - Watchlist screening is string similarity, not relational joins
- **Tradeoff accepted:** 
  - No foreign key constraints (enforce maker≠checker in application logic, not DB)
  - Manual audit trail append-only enforcement (no DB-level immutability)
  - Text search on names less efficient than PostgreSQL full-text search
- **Revisit when:** 
  - Need true ACID transactions across multiple collections (currently single-document operations)
  - Relational queries become complex (e.g., "all applications where maker=X and checker=Y reviewed in last 7 days")
  - Audit trail queries slow down (would move to separate time-series DB)

### D-002: JavaScript over TypeScript
- **Date / Owner:** [To be filled by team]
- **Decision:** JavaScript (ES6+) for both frontend and backend, with JSDoc type hints for critical functions
- **Alternatives considered:**
  1. TypeScript - full type safety, better IDE support
  2. JavaScript + PropTypes (frontend only) - runtime validation
- **Why:**
  - Faster setup in 5-hour hackathon (no tsconfig, no build issues)
  - Team velocity: no type compilation errors blocking progress
  - Smaller learning curve if team members unfamiliar with TS
  - Zod already provides runtime validation for all inputs (covers 80% of type safety)
  - Can add JSDoc comments for IDE autocomplete without full TS overhead
  - Node.js runs JS natively (no transpilation for backend in dev)
- **Tradeoff accepted:**
  - No compile-time type checking (more runtime errors possible)
  - Less IDE autocomplete for internal functions
  - Harder to refactor safely (no type errors when changing function signatures)
  - Complex rules engine more error-prone without types
- **Revisit when:**
  - Project grows beyond hackathon (production = add TypeScript)
  - Team comfortable with TS (productivity regained after initial setup)
  - Refactoring becomes frequent (type safety pays off)
  - Critical bugs from type errors (e.g., passing string instead of number to rules engine)

**Mitigation strategies:**
- Use JSDoc for critical functions (rules engine, name matching, state transitions)
- Zod schemas as single source of truth for data shapes
- Comprehensive unit tests for rules engine (catch type errors at test time)
- Strict ESLint rules (no-implicit-coercion, no-mixed-types)

### D-003: Cloudinary over local filesystem/S3 for document storage
- **Date / Owner:** [To be filled by team]
- **Decision:** Store uploaded .txt files on Cloudinary (free tier: 25GB storage, 25GB bandwidth/month)
- **Alternatives considered:**
  1. Local filesystem - simplest, no external dependencies
  2. AWS S3 / Cloudflare R2 - production-ready, pay-as-you-go
  3. MongoDB GridFS - keeps everything in one database
  4. Uploadcare / ImageKit - similar free tiers
- **Why:**
  - Free tier generous for hackathon (25GB >> our ~1GB for 60+100 applications)
  - No credit card required, instant signup
  - Built-in CDN (fast document retrieval for judges testing from anywhere)
  - Automatic HTTPS, secure URLs with access control
  - Simple API (5 lines to upload, 2 to retrieve)
  - Scales horizontally by default (no shared filesystem issues)
  - SHA-256 hash stored in metadata (integrity verification)
  - Built-in transformation APIs (future: convert to PDF, add watermarks)
  - Works seamlessly on Vercel/Render (no persistent disk needed)
- **Tradeoff accepted:**
  - External dependency (if Cloudinary down, document uploads fail)
  - Requires internet connection for dev/test (cannot work fully offline)
  - Vendor lock-in to Cloudinary API (migration effort to switch providers)
  - Free tier limits (25GB traffic/month, would need paid plan at scale)
- **Revisit when:**
  - Need offline development (add local mock or use GridFS)
  - Exceed free tier limits (upgrade Cloudinary or migrate to S3)
  - Compliance requires on-premise storage (switch to self-hosted Minio)
  - Document access patterns become hot (add Redis caching layer)

**Implementation notes:**
- Use `resource_type: 'raw'` for text files (not image processing)
- Store SHA-256 in Cloudinary metadata: `context: { sha256: hash }`
- Signed URLs for access control (expire in 1 hour, regenerate on audit log)
- Folder structure: `onboardiq-documents/{environment}/{doc_id}`

### D-004: Pluggable extraction provider architecture
- **Date / Owner:** [To be filled by team]
- **Decision:** Extraction service interface with configurable provider (EXTRACTION_PROVIDER=mock or ai)
- **Alternatives considered:**
  1. Mock only, skip AI track - simpler, guaranteed to work
  2. AI-only implementation - ignores the mock requirement in case study
  3. Two separate codebases - duplicate rules engine
- **Why:**
  - Case study explicitly requires mock for Core track, AI for AI track (FR-3)
  - Team can split work: one subteam builds rules engine + UI with mock, another builds AI extractor
  - Switching providers must need no code change (FR-3 requirement)
  - Can demo fallback: "if AI times out, mock provider keeps flow working"
  - Allows A/B comparison of mock vs AI accuracy on evaluation set
- **Tradeoff accepted:**
  - Extra abstraction layer (provider interface)
  - Mock files must be loaded efficiently (would cache in memory)
- **Revisit when:**
  - Only one track being submitted (simplify to single provider)
  - AI becomes mandatory (remove mock provider)

### D-005: Rules engine as pure stateless service
- **Date / Owner:** [To be filled by team]
- **Decision:** Rules engine in `rulesEngine.js` as pure function: input (application, documents, extracted fields, config) → output (decision, reason_codes, scores)
- **Alternatives considered:**
  1. Rule engine with database access - simpler to call
  2. Rules embedded in Application model methods - OOP style
  3. External rules engine library (json-rules-engine) - more flexible
- **Why:**
  - Testability: pure function, deterministic, no mocks needed
  - Case study provides exact expected outputs for 60 applications (must match exactly)
  - Configuration-driven: all thresholds from case_02_rules_config_V1.0.json
  - Can unit test each rule R1-R17 in isolation
  - Batch processing simple: map over applications array
  - Judges will test with different config (change threshold, decision changes)
- **Tradeoff accepted:**
  - Caller must load config, application, documents, watchlists (slightly more work)
  - Cannot optimize with caching inside the function (must be stateless)
- **Revisit when:**
  - Rules become so complex that a DSL is needed (json-rules-engine)
  - Need to hot-reload rules without redeployment (rules in DB)

### D-006: Maker-checker enforcement in application logic + DB index
- **Date / Owner:** [To be filled by team]
- **Decision:** Enforce maker≠checker in controller (check user ID before allowing checker action); audit trail records maker_user_id and checker_user_id
- **Alternatives considered:**
  1. Database constraint (e.g., PostgreSQL CHECK constraint) - not available in MongoDB
  2. Trust the frontend - insecure, judges will test with API calls
  3. Separate workflow table with state machine validation
- **Why:**
  - MongoDB has no CHECK constraints (must enforce in application)
  - Case study explicit: "same user receives HTTP 403" (example 11)
  - Simple to implement: `if (application.maker_user_id === req.user.id) throw 403`
  - Audit trail already captures user IDs for full transparency
- **Tradeoff accepted:**
  - Not enforced at DB level (application bug could bypass)
  - Must manually test this constraint (add to test suite)
- **Revisit when:**
  - Move to PostgreSQL (use DB constraint)
  - Workflow becomes more complex (multiple approvers, quorum voting)

### D-007: Resend for email notifications
- **Date / Owner:** [To be filled by team]
- **Decision:** Resend for transactional emails (free tier: 100 emails/day, 3k/month)
- **Alternatives considered:**
  1. SendGrid - 100 emails/day, more features but complex dashboard
  2. Mailgun - 100 emails/day trial, then paid
  3. Brevo (Sendinblue) - 300 emails/day but slower API
  4. No email notifications - skip for hackathon
- **Why:**
  - Case study pain point: "3 to 5 days to open an account" (email reduces perceived wait time)
  - Modern developer experience: simple REST API, great docs
  - Free tier sufficient for evaluation (100 apps × ~3 emails each = 300 emails well under limit)
  - No credit card required
  - React Email support for beautiful templates (optional, can use HTML strings)
  - Built-in email validation, bounce tracking
  - Judges will see "production-ready" notification system
- **Tradeoff accepted:**
  - External dependency (emails fail if Resend down, but app still works)
  - Free tier cap (would need paid plan for real 3k apps/month)
  - Synchronous email sending blocks request (should be async queue at scale)
  - No SMS notifications (would need Twilio/SNS integration)
- **Revisit when:**
  - Exceed 100 emails/day (upgrade Resend or add queue to batch sends)
  - Need SMS notifications (add Twilio)
  - Email delivery critical (add retry queue with Bull/BullMQ)
  - Template management becomes complex (use React Email or MJML)

**Email triggers (priority order for 5-hour hackathon):**
1. **MUST HAVE:**
   - Application submitted (confirmation)
   - Resubmission requested (with instructions)
   - Final decision: approved/rejected (with reason)
2. **SHOULD HAVE:**
   - Day 6 resubmission reminder (1 day left)
   - Application expired (no resubmission)
3. **NICE TO HAVE:**
   - Status change notifications (in review, pending checker)
   - Officer assignment notifications

### D-008: node-cron for background jobs
- **Date / Owner:** [To be filled by team]
- **Decision:** node-cron for scheduled tasks (resubmission expiry, reminders)
- **Alternatives considered:**
  1. Bull + Redis queue - production-grade, persistent
  2. Agenda + MongoDB - persistent jobs, more features
  3. Native setInterval - simplest but not persistent
  4. External cron service (EasyCron, cron-job.org) - separate infrastructure
- **Why:**
  - Lightweight (zero dependencies beyond node-cron package)
  - Sufficient for 2 critical jobs: resubmission expiry (daily), day 6 reminder (daily)
  - No Redis needed (one less service to deploy)
  - Cron syntax familiar to everyone (`0 0 * * *` = midnight)
  - Works in single-instance deployment (Render/Railway)
- **Tradeoff accepted:**
  - Not persistent (jobs lost if server restarts at wrong time)
  - Single-instance only (multiple instances would run jobs N times)
  - No job history or retry logic
  - Cannot inspect job queue or manually trigger
- **Revisit when:**
  - Multi-instance deployment (move to Bull + Redis with locking)
  - Need job persistence (use Agenda with MongoDB)
  - Job failures need tracking (add monitoring + retry logic)
  - Complex scheduling (use Agenda's job chaining)

**Critical jobs:**
```javascript
// Job 1: Daily at midnight - expire resubmissions after 7 days
cron.schedule('0 0 * * *', expireResubmissions);

// Job 2: Daily at 9am - send day 6 reminders
cron.schedule('0 9 * * *', sendResubmissionReminders);

// Optional Job 3: Hourly - alert on checker queue SLA breach
cron.schedule('0 * * * *', checkCheckerQueueSLA);
```

### D-012: Frontend Architecture & UI System (React 19 + Vite + Tailwind CSS v4)
- **Date / Owner:** Hackathon Hour 1, Developer 1 (Rishabh Munakhiya - Frontend Architect)
- **Decision:** Build the complete frontend under `client/` using React 19, Vite, Tailwind CSS v4, Lucide Icons, and Recharts, styled with an institutional "Financial Intelligence Terminal" design system and a clean, light banking login experience.
- **Alternatives considered:** Next.js (App Router), plain CSS, Material UI / Ant Design.
- **Why:** Vite delivers instant HMR and builds in ~1.2s, crucial for high velocity. Tailwind v4 gives exact control over digital banking design tokens without bulky third-party component libraries.
- **Tradeoff accepted:** Client-side routing with React Router instead of SSR.
- **Revisit when:** Production scale requires server-side rendering for public marketing pages.

### D-013: Modular Service Layer & Preloaded Mock Store (Axios + SessionStorage)
- **Date / Owner:** Hackathon Hour 1, Developer 1 (Rishabh Munakhiya - Frontend Architect)
- **Decision:** Decouple all frontend API networking into `client/src/api/` (`applications.js`, `review.js`, `checker.js`, `notifications.js`, `auth.js`) backed by an in-memory/sessionStorage mock database pre-populated with Case Study V1.0 worked examples (A2000001–A2000012).
- **Alternatives considered:** Hardcoded static data inside JSX components, MSW (Mock Service Worker).
- **Why:** Full independence allows Developer 1 (frontend) and Developer 2 (backend) to work concurrently. Switching from mock to live backend only requires setting `VITE_API_BASE_URL`.
- **Tradeoff accepted:** Client-side demo state is stored in browser storage until live backend endpoints are targeted.
- **Revisit when:** Backend REST API is live and environment variables are connected.

---

## Decisions to make (checklist, tick as logged)

- [x] D-001: Database choice (MongoDB vs PostgreSQL) ✅
- [x] D-002: Language (JavaScript vs TypeScript) ✅
- [x] D-003: File storage (Cloudinary vs S3 vs local) ✅
- [x] D-004: Extraction service architecture (pluggable provider) ✅
- [x] D-005: Rules engine design (stateless, pure function) ✅
- [x] D-006: Maker-checker enforcement (application logic) ✅
- [x] D-007: Email service (Resend vs SendGrid) ✅
- [x] D-008: Background jobs (node-cron vs Bull) ✅
- [ ] D-009: Auth strategy (JWT cookie specifics, session duration)
- [ ] D-010: Validation approach (Zod schema organization)
- [ ] D-011: Error handling strategy (error codes, user-facing messages)
- [x] D-012: Frontend state management & UI system (Context API + Tailwind v4) ✅
- [x] D-013: API client architecture (Axios service layer + mock store) ✅
- [ ] D-014: CSV parsing library (csv-parser vs papaparse vs fast-csv)
- [ ] D-015: Levenshtein library (fast-levenshtein vs natural vs talisman)
- [ ] D-016: Testing strategy (unit vs integration split, mocking approach)
- [ ] D-017: Deployment config (environment variables, build scripts)
- [ ] D-018: AI track: Classification method (if applicable)
- [ ] D-019: AI track: Extraction method (if applicable)
- [ ] D-020: Logging strategy (what to log, log levels, PII redaction)

---

## Scaling story (fill in before the pitch)

How we would handle 100x traffic (from 3,000 to 300,000 accounts/month):
1. **Stateless API behind load balancer** (already designed stateless, rules engine is pure).

2. **Redis layer:**
   - Rate limiting (currently per-instance, would centralize with redis-rate-limit)
   - Session storage if needed (JWT sufficient for now)
   - Caching watchlist data (sanctions/PEP lists with 24h TTL, reload from DB)
   - Configuration cache (rule thresholds, occupation risk levels)
   - Distributed locks for cron jobs (prevent duplicate runs across instances)

3. **MongoDB scaling:**
   - Indexes already on application_id, status, application_date
   - Add compound index on (status, risk_category, created_at) for review queue
   - Read replicas for dashboard queries (analytics don't need strong consistency)
   - Sharding strategy: partition by application_date (monthly shards) after 10M+ applications
   - Archive old applications (move CLOSED_EXPIRED older than 1 year to cold storage)

4. **File storage (Cloudinary):**
   - Free tier (25GB) → Paid tier ($89/mo for 100GB, unlimited bandwidth)
   - Add Redis caching for frequently accessed documents (e.g., officer reviewing same doc)
   - Signed URLs with 1-hour expiry (regenerate on each access, audit logged)
   - Enable Cloudinary's CDN edge caching (automatic with secure URLs)
   - Backup strategy: daily export public_ids + metadata to S3 (disaster recovery)

5. **Email notifications (Resend):**
   - Free tier (100/day) → Growth tier ($20/mo for 50k emails)
   - Currently synchronous (blocks request for ~200ms)
   - At scale: async queue with Bull + Redis
   - Queue priority: critical (rejections, approvals) > normal (reminders) > low (status updates)
   - Batch similar emails (e.g., "10 new reviews assigned" instead of 10 separate emails)
   - Add SMS notifications via Twilio for HIGH risk cases (compliance requirement)

6. **Extraction service:**
   - Currently synchronous (10s timeout per document)
   - At scale: async queue (Bull/BullMQ) for extraction jobs
   - Webhook callback to update application when extraction completes
   - Separate worker pool for AI extraction (GPU instances, auto-scaling)
   - Implement extraction result caching (same document uploaded twice = reuse extraction)

7. **Background jobs:**
   - Currently node-cron (single instance)
   - At scale: Agenda (MongoDB-backed) or Bull (Redis-backed) with distributed locks
   - Job history and retry logic (exponential backoff)
   - Monitoring dashboard (job success rate, execution time, failure alerts)

8. **Services to split into microservices (in order):**
   - **extractionService** → separate microservice (most compute-intensive, GPU for AI, scales independently)
   - **watchlistScreening** → separate service with its own DB (compliance team updates lists daily)
   - **emailService** → dedicated notification service (handles all async communications)

9. **Maker-checker optimization:**
   - Currently pulls review queue on page load
   - At scale: WebSocket or Server-Sent Events for real-time queue updates
   - Priority queue in Redis ZSET sorted by (risk_score × wait_time)
   - Auto-assign cases to officers (load balancing based on current workload)

10. **Database query optimization:**
    - Implement aggregation pipelines for dashboard (pre-compute daily)
    - Materialized views for complex reports (refresh hourly)
    - Move audit logs to TimescaleDB or ClickHouse (time-series optimized)
    - Implement change data capture (CDC) to stream events to analytics DB

**Infrastructure at 300k applications/month:**
- API servers: 4-6 instances (2 vCPU, 4GB RAM each) behind load balancer
- MongoDB: 3-node replica set (primary + 2 secondaries), 16GB RAM each
- Redis: 2-node primary/replica, 4GB RAM
- Worker nodes: 2-4 instances for background jobs + extraction
- Cloudinary: Paid tier ($89-200/month depending on usage)
- Resend: Growth tier ($20-40/month)
- Total cost estimate: ~$500-800/month (vs $0 for hackathon demo)

## Known limitations (be honest, judges respect this)

- **Email notifications not queued:** Currently sends emails synchronously (blocks request ~200ms). At scale: async queue with Bull/Redis.
- **Rate limiting per-instance:** Would move to Redis-backed rate limiter (currently uses in-memory store that doesn't share across instances).
- **Synchronous extraction:** 10-second timeout per document blocks the request. At scale: async queue + webhook callback.
- **In-memory watchlist loading:** Currently loads CSV files on server startup. At scale: Redis cache with background refresh job + DB storage.
- **No document versioning:** Resubmission overwrites previous documents. Production would keep version history with timestamps.
- **Basic name matching:** Levenshtein distance only. Production would add phonetic matching (Soundex/Metaphone) for transliterated Indian names.
- **Mock core-banking API:** Real integration would handle:
  - Account creation failures and rollback
  - Idempotency keys (prevent duplicate accounts on retry)
  - Async account opening with confirmation
  - Balance initialization, debit card ordering
- **No re-KYC automation:** rekyc_due_date is calculated but not acted upon. Production needs:
  - Scheduled job to flag accounts 30 days before re-KYC
  - Automated email campaigns for document re-upload
  - Account restrictions if re-KYC overdue
- **Cloudinary free tier:** 25GB bandwidth/month. Production needs paid tier or migration to S3 with CloudFront CDN.
- **Resend free tier:** 100 emails/day. Production needs Growth tier ($20/mo for 50k emails) + SMS integration (Twilio).
- **Audit trail in main DB:** At scale: move to time-series DB (TimescaleDB, ClickHouse) for better query performance on millions of audit records.
- **No AI model versioning:** If AI track implemented, would need:
  - MLflow or model registry to track which extraction model version processed which application
  - A/B testing framework to compare model versions
  - Fallback to previous model if accuracy drops
- **Compliance dashboard real-time queries:** Currently queries DB on each load. At scale: 
  - Materialized views refreshed hourly
  - Separate analytics DB (read replica with aggregation tables)
  - Real-time metrics via Redis counters
- **Single-instance cron jobs:** node-cron runs on one instance. At scale:
  - Agenda (MongoDB) or Bull (Redis) with distributed locks
  - Job monitoring and alerting (Sentry, Datadog)
- **No geo-redundancy:** Single-region deployment. Production needs:
  - Multi-region MongoDB cluster (Atlas Global Clusters)
  - Cloudinary multi-CDN setup
  - Load balancer with geo-routing
- **No disaster recovery plan:** Production needs:
  - Daily MongoDB backups to S3
  - Cloudinary public_id export for document recovery
  - Database point-in-time recovery (MongoDB Oplog)
  - Tested restore procedure (RPO: 24h, RTO: 4h)
- **No monitoring/observability:** Production needs:
  - APM (New Relic, Datadog, or open-source: Prometheus + Grafana)
  - Error tracking (Sentry)
  - Log aggregation (ELK stack or Datadog Logs)
  - Uptime monitoring (UptimeRobot, Pingdom)
  - Custom dashboards: SLA compliance, extraction accuracy, approval rates
- **No compliance audit reports:** Production needs:
  - Scheduled PDF reports for auditors (weekly/monthly)
  - Compliance metrics: screening coverage, dual-approval rate, data access logs
  - Regulatory filing support (RBI returns, AML/CFT reports)
