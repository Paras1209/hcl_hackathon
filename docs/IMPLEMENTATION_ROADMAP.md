# OnboardIQ Implementation Roadmap

> **⚠️ IMPORTANT:** This document is for SOLO development or UNASSIGNED team work.
> 
> **For 4-developer parallel work (3 hours), see:**
> - **TEAM_WORK_DISTRIBUTION.md** - Full team coordination plan
> - **DEV4_YOUR_GUIDE.md** - Developer 4 (Frontend + Notifications) detailed guide

---

## Quick Start (Hour 0:00 - 0:30)

### 1. Project Setup
```bash
# Initialize project
mkdir onboardiq && cd onboardiq
git init

# Backend setup
mkdir server && cd server
npm init -y
npm install express mongoose bcrypt jsonwebtoken zod pino pino-pretty helmet cors express-rate-limit express-async-errors multer cloudinary resend node-cron fast-levenshtein papaparse dotenv

npm install -D vitest supertest nodemon eslint

# Frontend setup
cd ..
npm create vite@latest client -- --template react
cd client
npm install axios react-router-dom date-fns
```

### 2. Environment Setup
Create `server/.env`:
```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/onboardiq
JWT_SECRET=your-secret-key-here-change-in-production
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=onboardiq-documents
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=onboarding@yourdomain.com
EXTRACTION_PROVIDER=mock
FRONTEND_URL=http://localhost:5173
```

### 3. Folder Structure Setup
```bash
# Server structure
cd server
mkdir -p src/{routes,controllers,services,models,middlewares,utils,config,data,jobs,templates,tests}
mkdir output

# Client structure
cd ../client
mkdir -p src/{pages,components,api,utils,constants}
```

## Phase 1: Core Backend (Hour 0:30 - 2:00)

### Priority 1: Database & Auth (30 min)
- [ ] MongoDB connection (`config/database.js`)
- [ ] User model with roles (Mongoose schema)
- [ ] Auth middleware (JWT verification + role checks)
- [ ] Login/register endpoints
- [ ] Test: User can register, login, receive JWT

### Priority 2: Data Loading (20 min)
- [ ] CSV parser utility (`utils/csvParser.js`)
- [ ] Seed script for watchlists, occupations, existing customers
- [ ] Configuration loader (load `case_02_rules_config_V1.0.json`)
- [ ] Test: All reference data loaded to MongoDB

### Priority 3: Rules Engine (60 min) - CRITICAL
- [ ] `services/nameMatching.js` - Levenshtein + normalization
- [ ] `services/watchlistScreening.js` - Sanctions & PEP matching
- [ ] `services/rulesEngine.js` - Rules R1-R17 implementation
- [ ] Unit tests for each rule (use sample applications)
- [ ] **Test: All 60 sample applications produce expected_decision**

### Priority 4: Extraction Service (20 min)
- [ ] `services/extractionService.js` - Provider interface
- [ ] Mock provider (reads extraction_mock CSV)
- [ ] Test: Given doc_id, returns extracted fields

## Phase 2: Application Flow (Hour 2:00 - 3:15)

### Priority 5: Application Model & Endpoints (30 min)
- [ ] Application + Document models (Mongoose schemas)
- [ ] `POST /api/applications` - Submit application
- [ ] `GET /api/applications/:id` - Get application
- [ ] Cloudinary upload integration
- [ ] Test: Upload 3 docs, get application_id back

### Priority 6: Processing Pipeline (30 min)
- [ ] Extract documents (call extraction service)
- [ ] Run rules engine
- [ ] Update application status based on decision
- [ ] Audit log creation
- [ ] Test: Submitted app → EXTRACTING → AUTO_APPROVED/REVIEW/AUTO_REJECTED

### Priority 7: Email Notifications (15 min)
- [ ] `services/emailService.js` - Resend integration
- [ ] Templates: submission confirmation, final decision
- [ ] Test: Email sent on submission (check Resend logs)

## Phase 3: Maker-Checker Flow (Hour 3:15 - 4:00)

### Priority 8: Review Workbench (25 min)
- [ ] `GET /api/review/queue` - REVIEW queue (sorted by risk, time)
- [ ] `GET /api/review/:id` - Application details + documents
- [ ] `POST /api/review/:id/correct-field` - Field correction (re-run rules)
- [ ] `POST /api/review/:id/recommend` - Maker recommendation
- [ ] Test: Officer corrects field, rules re-run, recommendation recorded

### Priority 9: Checker Workflow (20 min)
- [ ] `GET /api/checker/queue` - PENDING_CHECKER queue
- [ ] `POST /api/checker/:id/decide` - Checker decision
- [ ] Maker≠checker validation (403 if same user)
- [ ] Mock core-banking API (generate customer_id, account_number)
- [ ] Test: Maker recommends, checker approves, account created

## Phase 4: Frontend (Hour 4:00 - 4:45)

### Priority 10: Auth & Layout (15 min)
- [ ] Login/register pages
- [ ] Protected route wrapper
- [ ] Navigation (role-based menu)
- [ ] Test: Login redirects to correct dashboard

### Priority 11: Applicant Flow (20 min)
- [ ] Application form (Aadhaar last 4 only!)
- [ ] Document upload (multi-file with type selection)
- [ ] Status tracking page
- [ ] Test: Submit application, see status updates

### Priority 12: Officer Workbenches (10 min)
- [ ] Review queue (KYC Officer)
- [ ] Document viewer + field correction UI
- [ ] Checker queue (Compliance Officer)
- [ ] Test: Officer sees REVIEW queue, can correct fields

## Phase 5: Polish & Testing (Hour 4:45 - 5:00)

### Priority 13: Dashboard & Batch (10 min)
- [ ] Dashboard stats (Compliance Officer)
- [ ] Batch processing endpoint (`POST /api/batch/process`)
- [ ] Test: Batch produces decisions_output.csv

### Priority 14: Final Checks (5 min)
- [ ] All 10 worked examples (A2000001-A2000010) pass
- [ ] Security: 12-digit Aadhaar rejected
- [ ] Security: Maker≠checker enforced
- [ ] Audit: Document views logged
- [ ] Deploy frontend to Vercel, backend to Render

## Time Allocation Summary

| Phase | Time | Priority | Fallback |
|-------|------|----------|----------|
| Setup | 30 min | - | - |
| Core Backend | 90 min | P1-P4 | Skip extraction tests |
| Application Flow | 75 min | P5-P7 | Skip email notifications |
| Maker-Checker | 45 min | P8-P9 | Skip field correction |
| Frontend | 45 min | P10-P12 | Basic UI only |
| Polish | 15 min | P13-P14 | Skip dashboard |
| **Total** | **300 min (5h)** | | |

## Critical Success Criteria (Must Pass)

1. ✅ **All 60 sample applications match expected outputs**
   - Run batch command on `case_02_applications_sample_V1.0.csv`
   - Compare `decisions_output.csv` with expected columns
   - Every row must match: decision, reason_codes, name_match_score, risk_category

2. ✅ **Worked examples 1-10 reproduce exactly**
   - Application A2000001 (example 1): [expected outcome from case study]
   - Application A2000009 (example 9): Field correction changes decision
   - Application A2000010 (example 10): HIGH risk → PENDING_CHECKER
   - Application A2000011 (example 11): Same user as maker gets 403

3. ✅ **Security constraints enforced**
   - 12-digit Aadhaar input rejected with error message
   - PAN masked as ZZKXXXXX4Q in lists
   - Maker≠checker enforced (HTTP 403)
   - Document views audited

4. ✅ **Status lifecycle correct**
   - SUBMITTED → EXTRACTING → decision branch
   - REVIEW → IN_REVIEW → PENDING_CHECKER → final
   - No invalid transitions

5. ✅ **Audit trail complete**
   - Append-only (no updates/deletes)
   - Every status change logged
   - Every document view logged
   - Field corrections logged (before/after)

## Presentation Prep (After Hour 5:00)

### Demo Script (3 minutes):
1. **Slide 1: Problem** - 3 days to open account, 6% errors, no audit trail
2. **Slide 2: Solution** - OnboardIQ: intelligent KYC with maker-checker
3. **Live Demo:**
   - Submit clean application → AUTO_APPROVED in seconds
   - Submit problematic application → IN_REVIEW queue
   - Officer corrects field → rules re-run → recommend approval
   - Checker approves → account created
   - Show dashboard: STP rate, top reason codes
   - Show audit trail: every action logged
4. **Slide 3: Architecture** - Stateless, scalable, production-ready
5. **Slide 4: Scaling** - 100x traffic plan (Redis, read replicas, microservices)
6. **Q&A** - Have DECISIONS.md ready

### Key Talking Points:
- **Accuracy**: All 60 test cases pass, rules engine exact match
- **Security**: Maker-checker enforced, Aadhaar protected, full audit trail
- **Scalability**: Stateless design, pluggable extraction, ready for horizontal scaling
- **Production-ready**: Cloudinary (CDN), Resend (notifications), configuration-driven rules
- **Compliance**: Every decision explainable, watchlist screening 100%, dual approval for high-risk

## Troubleshooting Guide

### If behind schedule at Hour 3:00:
- **Skip**: Email notifications, field correction, dashboard
- **Keep**: Rules engine, maker-checker, basic UI
- **Fallback**: Use Postman for demo instead of full UI

### If behind schedule at Hour 4:00:
- **Skip**: Frontend entirely
- **Keep**: Backend fully functional
- **Demo**: Use Postman collection + batch processing CSV output

### If rules engine failing:
- **Debug**: Test one rule at a time with known applications
- **Check**: Configuration loaded correctly (thresholds)
- **Verify**: Name normalization (token sort, title removal)
- **Validate**: Levenshtein distance calculation (use online calculator)

### If evaluation set different from sample:
- **Don't panic**: Core track only needs mock extraction to work
- **Verify**: Batch processing pipeline works end-to-end
- **Check**: Edge cases in evaluation (prompt injection should classify as OTHER)

## Post-Hackathon Improvements (if continuing)

### Week 1: AI Track
- [ ] Implement AI extraction provider
- [ ] Document classification (TF-IDF or LLM)
- [ ] Field extraction (regex + NER or LLM with JSON schema)
- [ ] Accuracy measurement against truth file
- [ ] Confidence calibration report

### Week 2: Production Readiness
- [ ] Add comprehensive test suite (80%+ coverage)
- [ ] Implement async extraction queue (Bull + Redis)
- [ ] Add monitoring (Sentry error tracking, Datadog APM)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add database backups and restore procedure

### Week 3: UX Polish
- [ ] Mobile responsive design
- [ ] Dark mode
- [ ] Loading skeletons
- [ ] Toast notifications
- [ ] Form auto-save
- [ ] Document preview (if PDFs added)

### Week 4: Advanced Features
- [ ] Real-time updates (WebSocket)
- [ ] Officer auto-assignment
- [ ] Advanced search/filters
- [ ] Export to PDF reports
- [ ] Re-KYC automation
- [ ] Compliance audit reports

## Resources

### Documentation:
- Cloudinary SDK: https://cloudinary.com/documentation/node_integration
- Resend API: https://resend.com/docs/send-with-nodejs
- Mongoose: https://mongoosejs.com/docs/guide.html
- Zod validation: https://zod.dev/

### Free Tiers:
- MongoDB Atlas: 512MB free forever
- Cloudinary: 25GB storage + 25GB bandwidth/month
- Resend: 100 emails/day (3k/month)
- Vercel: Unlimited deployments
- Render: 750 hours/month free (enough for demo)

### Testing Accounts (create these):
1. Applicant: `applicant@test.com` / `password123`
2. KYC Officer: `officer@test.com` / `password123`
3. Compliance Officer: `compliance@test.com` / `password123`

### Sample Applications (use these for demo):
- A2000001: Clean approval (LOW risk)
- A2000004: Name mismatch score 0.7647 (example 4)
- A2000006: Sanctions match SAN0002 (example 6)
- A2000007: PEP match PEP0001 (example 7)
- A2000009: Field correction changes decision (example 9)
- A2000010: HIGH risk needs checker (example 10)
- A2000011: Maker-checker enforcement (example 11)

## Final Checklist Before Submission

- [ ] All 60 sample applications produce correct decisions
- [ ] Worked examples 1-10 reproduce exactly
- [ ] Batch command generates decisions_output.csv
- [ ] Security: 12-digit Aadhaar rejected
- [ ] Security: Maker≠checker enforced (403)
- [ ] Audit: Document views logged
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Render
- [ ] README.md updated with setup instructions
- [ ] DECISIONS.md filled with all architectural choices
- [ ] Demo video recorded (optional but impressive)
- [ ] Presentation slides ready (3-5 slides max)
- [ ] GitHub repository public or shared with judges
- [ ] .env.example file provided (without secrets)
- [ ] Postman collection exported (for API testing)

---

**Remember**: The goal is a working vertical slice, not perfect code. Ship features in priority order, test critical paths, and have a backup demo plan. Good luck! 🚀
