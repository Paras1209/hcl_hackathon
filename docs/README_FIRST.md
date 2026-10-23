# 🚀 OnboardIQ - Start Here

Welcome to OnboardIQ: Intelligent KYC Onboarding System for Banking

## 📚 Documentation Structure

### For Team of 4 (3-Hour Hackathon) 👥
**START HERE:**
1. **TEAM_WORK_DISTRIBUTION.md** ⭐ - Work distribution for parallel development
2. **DEV4_YOUR_GUIDE.md** - Detailed guide for Developer 4 (Frontend + Notifications)

**Reference Documents:**
- **case_studies.md** - Problem statement (source of truth for requirements)
- **CLAUDE.md** - Project architecture and AI assistant guide
- **DECISIONS.md** - Architectural decisions log
- **QUICK_REFERENCE.md** - API endpoints, algorithms, commands

### For Solo or Unassigned Work ⚡
- **IMPLEMENTATION_ROADMAP.md** - 5-hour phased implementation plan

---

## 🎯 Quick Context

**Project:** OnboardIQ - KYC (Know Your Customer) automation for banking
**Goal:** Reduce account opening time from 3 days to minutes
**Core Features:**
- Document upload & OCR extraction
- 17 business rules (R1-R17) for KYC validation
- Name matching (Levenshtein distance)
- Watchlist screening (Sanctions + PEP)
- Maker-checker workflow (dual approval)
- Email notifications
- Complete audit trail

**Tech Stack:**
- Frontend: React + Vite (JavaScript)
- Backend: Node.js + Express (JavaScript)
- Database: MongoDB
- File Storage: Cloudinary (free tier: 25GB)
- Email: Resend (free tier: 100/day)
- Background Jobs: node-cron

---

## 👥 Team Work Distribution (3 Hours)

### Developer 1 - Core Application Flow & Rules Engine
**Critical Path - Start First**
- Rules engine (R1-R17) ⭐ MOST IMPORTANT
- Name matching (Levenshtein)
- Watchlist screening
- Mock extraction provider
- Application submission endpoints

**Files:** `services/rules*`, `services/nameMatching.js`, `services/watchlistScreening.js`, `controllers/applicationController.js`

### Developer 2 - Auth, Models & Document Storage
**Foundation - Everyone Depends on This**
- All Mongoose models (Application, Document, User, etc.)
- Authentication (JWT + role-based access)
- Cloudinary file storage
- Seed script (load watchlists, config, occupations)
- Audit service

**Files:** `models/`, `middleware/`, `services/cloudinaryService.js`, `controllers/authController.js`

### Developer 3 - Workflow, Review & Checker
**Business Logic - Maker-Checker Flow**
- Status lifecycle state machine
- Workflow service (status transitions)
- Maker-checker validation
- Review & checker endpoints
- Dashboard aggregation
- Mock core-banking API

**Files:** `services/workflowService.js`, `modules/workflow/`, `controllers/reviewController.js`, `controllers/checkerController.js`

### Developer 4 - Frontend + Notifications (YOU)
**User Experience - Parallel Development**
- React frontend (all pages)
- Application form (Aadhaar validation!)
- Status tracking
- Review & checker UIs
- Email notifications (Resend)
- Background jobs (resubmission expiry)

**Files:** `client/` (entire folder), `services/emailService.js`, `jobs/`, `templates/`

---

## ⚡ 3-Hour Timeline (Parallel)

### Hour 0:15-1:00 - Foundation Phase
**All devs work independently:**
- Dev 1: Rules engine + name matching (pure logic, no DB)
- Dev 2: Models + auth + seed script
- Dev 3: Workflow logic (pure functions)
- Dev 4: React setup + auth pages + API client

**Sync at 1:00:** Models ready, rules engine tested, auth working

### Hour 1:00-2:00 - Integration Phase
**Start connecting pieces:**
- Dev 1: Application endpoints (use Dev 2's models)
- Dev 2: Document endpoints + Cloudinary
- Dev 3: Review/checker endpoints
- Dev 4: Application form + document upload

**Sync at 2:00:** Can submit application end-to-end

### Hour 2:00-3:00 - Finalization
**Polish and test:**
- Dev 1: Batch processing + CSV output
- Dev 2: Dashboard aggregation + security
- Dev 3: Maker-checker enforcement + mock banking API
- Dev 4: Email notifications + review/checker UIs

**Sync at 2:45:** Quick standup, prioritize remaining work

### Hour 3:00 - Demo Prep
- Test all 60 sample applications
- Verify worked examples (especially 9, 10, 11)
- Deploy frontend + backend
- Record demo video

---

## 🎯 Critical Success Criteria

**MUST HAVE (will be tested by judges):**
1. ✅ All 60 sample applications match expected decisions
2. ✅ Rules engine produces exact reason codes
3. ✅ Aadhaar validation: ONLY 4 digits accepted
4. ✅ Maker≠checker enforced (HTTP 403)
5. ✅ Document views logged in audit trail
6. ✅ PAN masked in exports
7. ✅ Worked examples 1, 9, 10, 11 reproduce exactly

**SHOULD HAVE:**
8. ⚠️ Email notifications on key events
9. ⚠️ Dashboard with compliance metrics
10. ⚠️ Batch processing generates decisions_output.csv

**NICE TO HAVE:**
11. ❌ Background jobs (resubmission expiry)
12. ❌ Field correction by officer
13. ❌ Re-KYC date calculation

---

## 🚨 Quick Start Commands

### Setup (First Time)
```bash
# Backend
cd server
npm install express mongoose bcrypt jsonwebtoken zod pino helmet cors express-rate-limit multer cloudinary resend node-cron fast-levenshtein papaparse dotenv
npm install -D vitest supertest nodemon

# Frontend
cd client
npm create vite@latest . -- --template react
npm install axios react-router-dom date-fns

# Environment
cp server/.env.example server/.env
# Edit .env with your Cloudinary + Resend keys
```

### Development
```bash
# Terminal 1: MongoDB
mongod --dbpath ./data/db

# Terminal 2: Backend
cd server
npm run dev

# Terminal 3: Frontend
cd client
npm run dev

# Terminal 4: Seed Database (first time)
cd server
npm run seed
```

### Testing
```bash
# Unit tests (each developer)
cd server
npm test

# Integration tests (Dev 4)
npm run test:integration

# Manual test with sample data
curl -X POST http://localhost:5000/api/batch/process \
  -F "applications=@case_02_applications_sample_V1.0.csv"
```

---

## 🔑 Environment Variables

**Required (get free accounts):**
```bash
# Cloudinary (https://cloudinary.com/users/register_free)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Resend (https://resend.com/signup)
RESEND_API_KEY=re_your_key_here
FROM_EMAIL=onboarding@yourdomain.com

# MongoDB
MONGODB_URI=mongodb://localhost:27017/onboardiq

# JWT
JWT_SECRET=your-super-secret-key-change-this

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

---

## 📖 Document Quick Guide

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **TEAM_WORK_DISTRIBUTION.md** | Team coordination, file ownership, 3-hour timeline | Before starting work (all devs) |
| **DEV4_YOUR_GUIDE.md** | Detailed Dev 4 guide with code examples | If you're Developer 4 |
| **case_studies.md** | Problem statement, requirements, rules R1-R17 | When implementing any feature |
| **CLAUDE.md** | Architecture, models, conventions | Reference during coding |
| **DECISIONS.md** | Why we chose what we chose | When questioning tech choices |
| **QUICK_REFERENCE.md** | APIs, commands, algorithms, testing | Quick lookups during coding |
| **IMPLEMENTATION_ROADMAP.md** | 5-hour solo plan | If working alone or unassigned |

---

## 🎬 Demo Flow (for Presentation)

### Scenario 1: Clean Approval (30 seconds)
1. Login as applicant
2. Fill application form (use A2000001 data from sample CSV)
3. Upload 3 documents
4. Submit → Show status: EXTRACTING → AUTO_APPROVED
5. Show email confirmation in inbox
6. Show account details (customer_id, account_number)

### Scenario 2: Maker-Checker (60 seconds)
1. Submit application with minor name mismatch (A2000010)
2. Show status: IN_REVIEW (HIGH risk)
3. Login as KYC Officer
4. Review application, view documents side-by-side
5. Recommend APPROVE
6. Login as Compliance Officer
7. Approve in checker queue
8. Show status: APPROVED + account created

### Scenario 3: Security Checks (30 seconds)
1. Try to enter 12-digit Aadhaar → Rejected with error
2. Show PAN masked in dashboard export
3. Same officer tries to approve own recommendation → HTTP 403
4. Show audit trail: every document view logged

---

## ⚠️ Common Pitfalls

1. **Aadhaar Validation:** Accept ONLY 4 digits, reject 12-digit input
2. **Rules Engine:** ALL rules R1-R17 must match exactly (test with 60 samples)
3. **Maker-Checker:** Enforce maker≠checker (same user gets 403)
4. **Audit Trail:** Append-only (no updates/deletes)
5. **File Conflicts:** Stay in your assigned folders!
6. **Time Management:** If behind at Hour 2, CUT SCOPE (see TEAM_WORK_DISTRIBUTION.md)

---

## 🆘 Need Help?

### Technical Issues
- **Rules engine not matching expected:** Check config thresholds, test one rule at a time
- **Auth not working:** Check JWT_SECRET in .env, verify cookies enabled
- **File upload failing:** Check Cloudinary credentials, file size <1MB
- **Email not sending:** Check Resend API key, check logs
- **Merge conflicts:** Use file ownership in TEAM_WORK_DISTRIBUTION.md

### Team Communication
Use Discord/Slack channels:
- `#blockers` - "Need Application model schema ASAP"
- `#contracts` - "Rules engine returns this shape: {...}"
- `#status` - "Auth middleware ready"
- `#integration` - "Testing endpoints"

Response time: **< 5 minutes during work hours**

---

## ✅ Pre-Demo Checklist (Hour 2:55)

- [ ] All 60 applications produce correct decisions
- [ ] Worked examples 1, 9, 10, 11 pass
- [ ] 12-digit Aadhaar rejected
- [ ] Maker≠checker enforced (403)
- [ ] Document views audited
- [ ] PAN masked in exports
- [ ] Frontend deployed (Vercel)
- [ ] Backend deployed (Render/Railway)
- [ ] Health check returns 200
- [ ] Demo video recorded (backup)
- [ ] Postman collection ready

---

## 🎯 Success Metrics (from Case Study)

| Metric | Baseline | Target |
|--------|----------|--------|
| Time to open clean account | 3 days | <10 minutes |
| Manual handling rate | 100% | 30-40% (REVIEW only) |
| Data entry errors | 6% | <1% |
| Screening coverage | Inconsistent | 100% |
| Audit trail | Manual | 100% automated |

---

**Ready to build? Let's go! 🚀**

**Start with:** TEAM_WORK_DISTRIBUTION.md (all devs) or DEV4_YOUR_GUIDE.md (if you're Dev 4)

**Remember:** Communication > Code. Over-communicate on Slack. Ask questions early. Test often. Have fun!
