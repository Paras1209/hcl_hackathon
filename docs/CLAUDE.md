# CLAUDE.md

Project guide for AI assistants (Claude Code, Antigravity). Read this before every task.

## Context
- Hackathon project, team of 4 students, 5-hour limit.
- Judges score: architecture, choice-making, scalability, production-readiness.
- Product: [ONE-LINE DESCRIPTION - fill in tomorrow]
- Core entities: [e.g. User, Project, Task]

## Stack
- Client: React + Vite [+ TypeScript?]
- Server: Node.js + Express
- Database: MongoDB (Mongoose)
- Validation: Zod
- Logging: pino
- Tests: Vitest / Jest + Supertest
- Deploy: [Vercel + Render / Railway / other]

## Guiding principles
1. Simple over clever. Pick the boring, well-documented option.
2. Ship a working vertical slice first, then widen.
3. Every architectural choice must be explainable by a student in 30 seconds.
4. Do not over-engineer: no microservices, no Kafka, no Kubernetes. Modular monolith only.

## Folder structure
```
/client          React app
/server
  /src
    /routes      URL -> controller wiring only
    /controllers HTTP in/out, no business logic
    /services    business logic
    /models      Mongoose schemas
    /middlewares auth, validation, error handler, rate limit
    /utils       helpers, logger
    /config      env loading and constants
  /tests
```
Rule: routes -> controllers -> services -> models. Never skip a layer, never import upward.

## Backend conventions
- Stateless server. No in-memory session or state that breaks horizontal scaling.
- All config via environment variables, validated at startup. Never hardcode secrets.
- Every request body, query and params validated with Zod.
- Centralized error handler. Controllers throw, they do not format errors.
- Consistent response shape:
  - Success: `{ "success": true, "data": ... }`
  - Error: `{ "success": false, "error": { "code": "...", "message": "..." } }`
- Passwords hashed with bcrypt. Auth via [JWT in httpOnly cookie / other]. Role checks in middleware.
- Add DB indexes for fields used in queries. All list endpoints must be paginated.
- Middleware always on: Helmet, CORS (explicit origin), rate limiting, request logging.
- `GET /health` must always exist and return 200 when the server and DB are up.

## Frontend conventions
- Functional components and hooks only.
- API calls live in one `/client/src/api` layer, not inside components.
- Handle loading, error and empty states on every data-driven screen.
- No secrets in client code. Use `VITE_` env vars only for public values.

## Dependencies
- Do NOT add a package without a one-line justification and one alternative considered.
- Prefer what is already installed.

## Git workflow
- Branch per feature: `feat/<name>`, `fix/<name>`. Never commit straight to `main`.
- Small commits, meaningful messages (`feat: add task creation endpoint`).
- Every PR description states: what changed, why, and what alternative was considered.

## How the AI should work with us
- For any architectural decision: give 3 options with tradeoffs, recommend one, and state when the recommendation would be wrong. Wait for approval before implementing.
- Explain non-obvious code choices in 1-2 lines.
- If a decision is made, remind us to log it in DECISIONS.md.
- Ask before changing folder structure, the data model, or auth.
- Prefer editing existing files over creating new ones.
- Write at least one test for each critical-path endpoint (auth, core feature).

## Definition of done (per feature)
- Works locally and on the deployed URL.
- Input validated, errors handled, no console.log left behind.
- Test on the critical path passes, lint passes.
- README or API docs updated if behavior changed.
