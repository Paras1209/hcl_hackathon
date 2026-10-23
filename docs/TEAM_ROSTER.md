# OnboardIQ Team Roster & Quick Links

## 👥 Your Team (3-Hour Hackathon)

| Developer | Name | Role | Your Guide | Priority |
|-----------|------|------|------------|----------|
| **Dev 1** | **Himanshu** | Rules Engine & Application Flow | TEAM_WORK_DISTRIBUTION.md | ⭐⭐⭐ CRITICAL PATH |
| **Dev 2** | **Vaibhav** | Models, Auth & Storage | TEAM_WORK_DISTRIBUTION.md | ⭐⭐⭐ FOUNDATION |
| **Dev 3** | **Paras (YOU)** | Workflow & Maker-Checker | **DEV3_YOUR_GUIDE.md** | ⭐⭐⭐ BUSINESS LOGIC |
| **Dev 4** | **Rishabh** | Frontend & Notifications | DEV4_YOUR_GUIDE.md | ⭐⭐ USER EXPERIENCE |

---

## 🎯 Paras - Your Quick Reference (Dev 3)

### Your Mission
Build the **workflow system** that connects the rules engine (Himanshu) to the frontend (Rishabh). You own:
- Status lifecycle state machine
- Maker-checker validation (CRITICAL!)
- Review & checker endpoints
- Dashboard aggregation
- Mock core banking API

### Your Files (YOU OWN THESE)
```
server/src/
  ├── services/
  │   ├── workflowService.js        ⭐ YOUR MAIN FILE
  │   └── makerCheckerService.js    ⭐ CRITICAL
  ├── controllers/
  │   ├── reviewController.js
  │   ├── checkerController.js
  │   └── dashboardController.js
  ├── modules/workflow/
  │   ├── statusMachine.js          ⭐ START HERE
  │   ├── validation.js
  │   └── coreBankingMock.js
  └── routes/
      ├── reviewRoutes.js
      ├── checkerRoutes.js
      └── dashboardRoutes.js
```

### Your 3-Hour Plan
| Time | Task | Deliverable |
|------|------|-------------|
| **0:15-1:00** | Build pure logic (no DB) | State machine + maker-checker validation |
| **1:00-2:00** | Build endpoints (use Vaibhav's models) | Review & checker APIs working |
| **2:00-3:00** | Dashboard + finalize | STP rate, maker≠checker enforced |

### Critical Requirements (WILL BE TESTED)
1. ✅ Maker≠checker: Same user gets HTTP 403
2. ✅ HIGH risk → PENDING_CHECKER (not auto-approved)
3. ✅ Status transitions follow state machine
4. ✅ Account created on approval (customer_id + account_number)
5. ✅ Dashboard shows STP rate correctly

### Your Dependencies
- **Hour 1:00:** Need Vaibhav's models (Application, Document)
- **Hour 1:30:** Need Himanshu's rules engine output format
- **Hour 2:00:** Rishabh will start calling your APIs

---

## 📞 Team Communication

### Discord/Slack Channels (Setup these now!)
- **#blockers** - "Paras: Need Application model schema ASAP"
- **#contracts** - "Paras: Review endpoint returns this: {...}"
- **#status** - "Paras: Review endpoints ready for testing"
- **#integration** - "Paras testing with Vaibhav's models ✅"

### Response Time
⏰ **< 5 minutes** during work hours (this is critical!)

### Who to Ask for Help
- **Models not ready?** → Ask Vaibhav
- **Rules engine format unclear?** → Ask Himanshu
- **Frontend can't call your API?** → Help Rishabh (check CORS, response format)
- **Authentication failing?** → Ask Vaibhav

---

## ⏱️ Sync Points (ALL TEAM)

### Sync 1: Hour 0:00-0:15 (Team Meeting - 15 min)
**Location:** All together (in-person or video call)
**Agenda:**
1. Review TEAM_WORK_DISTRIBUTION.md together
2. Confirm contracts (API shapes, data formats)
3. Assign Git branches:
   - `dev1/himanshu-rules-engine`
   - `dev2/vaibhav-foundation`
   - `dev3/paras-workflow` (YOU)
   - `dev4/rishabh-frontend`
4. Confirm Discord/Slack channels setup
5. Start timer! ⏰

### Sync 2: Hour 1:00 (Quick Standup - 5 min)
**On Slack or quick call**
- **Himanshu:** "Rules engine passing 60 sample tests ✅"
- **Vaibhav:** "Models ready, auth middleware working ✅"
- **Paras (YOU):** "State machine done, ready for integration ✅"
- **Rishabh:** "Auth pages done, starting application form ✅"

**Action:** Everyone can now integrate!

### Sync 3: Hour 2:00 (Quick Standup - 5 min)
**On Slack or quick call**
- **Himanshu:** "Application submission endpoint working ✅"
- **Vaibhav:** "Documents uploading to Cloudinary ✅"
- **Paras (YOU):** "Review & checker endpoints ready ✅"
- **Rishabh:** "Application form submitting successfully ✅"

**Action:** Test end-to-end flow!

### Sync 4: Hour 2:45 (Triage Meeting - 5 min)
**Quick call to prioritize**
- What's working? ✅
- What's blocking? 🚫
- What can we skip? ❌
- Focus for final 15 minutes? 🎯

---

## 🚨 Emergency Protocols

### If Paras (YOU) Blocked
**Scenario:** Vaibhav's models not ready at Hour 1:00
**Solution:** 
1. Continue building pure logic functions (they don't need DB)
2. Mock the models with plain JavaScript objects
3. Write unit tests with mocked data
4. Integrate models later when ready

**Scenario:** Not sure about rules engine output format
**Solution:**
1. Check TEAM_WORK_DISTRIBUTION.md "Shared Contracts" section
2. Ask Himanshu on #contracts channel
3. Use this format (from contract):
```javascript
{
  decision: 'APPROVE' | 'REVIEW' | 'REJECT',
  reason_codes: ['CODE1', 'CODE2'],
  name_match_score: 0.8500,
  risk_category: 'LOW' | 'MEDIUM' | 'HIGH',
  rekyc_due_date: '2028-10-23'
}
```

### If Another Developer Blocked
**All hands protocol:** If critical path (Himanshu or Vaibhav) stuck at Hour 1:30:
1. Paras & Rishabh: Help debug the blocker
2. One person drives, others review/suggest
3. Get blocker resolved ASAP, then return to your work

---

## 📋 Testing Checklist (Your Responsibility)

### Hour 1:00 - Pure Logic Tests
```bash
cd server
npm test -- workflow.test.js

Expected: All state machine tests pass
```

### Hour 2:00 - API Tests (Postman)
```bash
# Review queue
GET http://localhost:5000/api/review/queue

# Officer recommend
POST http://localhost:5000/api/review/A2000010/recommend
Body: { "recommendation": "APPROVE", "comment": "Documents verified" }

# Checker decide (same user - should FAIL with 403)
POST http://localhost:5000/api/checker/A2000010/decide
Body: { "decision": "APPROVE", "comment": "Approved" }
```

### Hour 3:00 - Integration Tests
- [ ] Submit application → goes to IN_REVIEW
- [ ] Officer recommends → goes to PENDING_CHECKER
- [ ] Same officer tries to approve → HTTP 403 ✅
- [ ] Different compliance officer approves → APPROVED with account_id ✅
- [ ] Dashboard shows correct STP rate

---

## 🎯 Your Success = Team Success

**Remember:** Your workflow system is the **glue** that connects everything:
- Himanshu's rules engine → Your routing logic
- Your APIs → Rishabh's frontend
- Vaibhav's models → Your business logic

**If your maker-checker validation works perfectly, the team wins! 🏆**

---

## 📞 Quick Contacts

| Who | Role | When to Contact |
|-----|------|-----------------|
| **Himanshu** | Dev 1 | Rules engine format, extraction service |
| **Vaibhav** | Dev 2 | Model schemas, auth middleware, audit service |
| **Paras** | Dev 3 | **YOU** - Others contact you for workflow APIs |
| **Rishabh** | Dev 4 | API response format, frontend integration issues |

---

## 🚀 Let's Build This!

**Your mantra:** "Maker-checker must be different users. Always. No exceptions. 403."

**Your goal:** Enable compliant, auditable, dual-approval workflow for banking KYC.

**Your superpower:** You connect the rules engine to the real world. Make it seamless!

**You've got this, Paras! 💪**

---

## 📚 Essential Reading Order (for YOU)

1. **DEV3_YOUR_GUIDE.md** (20 min) ← Your detailed implementation guide with ALL code
2. **case_studies.md** Section 6.1.1 (5 min) ← Status lifecycle diagram
3. **QUICK_REFERENCE.md** (5 min) ← API contracts, testing commands
4. Keep **DEV3_YOUR_GUIDE.md** open while coding (copy-paste ready code!)

**Don't read everything! Focus on YOUR guide and start coding at Hour 0:15!**

Good luck! 🎉
