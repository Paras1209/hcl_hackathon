# 📮 OnboardIQ - Dev 2 Backend Postman Testing Guide

Base URL: `http://localhost:5000`

---

## 🔧 Setup in Postman

### Environment Variables (create a Postman Environment)
| Variable | Value |
|---|---|
| `BASE_URL` | `http://localhost:5000` |
| `TOKEN` | *(auto-set after login)* |

### Auto-set token after login (add to Login request → Tests tab):
```javascript
if (pm.response.code === 200) {
  pm.environment.set("TOKEN", pm.response.json().data.token);
}
```

### Add Auth Header to protected requests:
- **Authorization** → Type: `Bearer Token` → Token: `{{TOKEN}}`

---

## ✅ 1. Health Check

### `GET /health`
**No auth required**

```
GET {{BASE_URL}}/health
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "uptime": 12.34,
    "timestamp": "2026-10-23T08:00:00.000Z"
  }
}
```

---

## 👤 2. Authentication Routes (`/api/auth`)

### 2.1 Register User

#### `POST /api/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Body (Applicant):**
```json
{
  "email": "john.doe@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "APPLICANT"
}
```

**Body (KYC Officer):**
```json
{
  "email": "officer@bank.com",
  "password": "password123",
  "full_name": "Ramesh Officer",
  "role": "KYC_OFFICER"
}
```

**Body (Compliance Officer):**
```json
{
  "email": "compliance@bank.com",
  "password": "password123",
  "full_name": "Sunita Checker",
  "role": "COMPLIANCE_OFFICER"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "user_id": "USR17298823...",
      "email": "john.doe@example.com",
      "full_name": "John Doe",
      "role": "APPLICANT",
      "is_active": true
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Error - Email already taken (409):**
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_TAKEN",
    "message": "Email already registered"
  }
}
```

---

### 2.2 Login

#### `POST /api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "applicant@test.com",
  "password": "password123"
}
```

*(After running seed: `npm run seed`)*

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": "USR_APPLICANT_01",
      "email": "applicant@test.com",
      "full_name": "Test Applicant",
      "role": "APPLICANT"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Postman Test Script (add to Tests tab to auto-save token):**
```javascript
if (pm.response.code === 200) {
  const token = pm.response.json().data.token;
  pm.environment.set("TOKEN", token);
  console.log("Token saved:", token.substring(0, 20) + "...");
}
```

**Error - Wrong credentials (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

### 2.3 Get Current User (Me)

#### `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer {{TOKEN}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": "USR_APPLICANT_01",
      "email": "applicant@test.com",
      "full_name": "Test Applicant",
      "role": "APPLICANT"
    }
  }
}
```

**Error - No token (401):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

---

### 2.4 Logout

#### `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer {{TOKEN}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## 📄 3. Document Routes (`/api/documents`)

### 3.1 Upload a Document

#### `POST /api/documents/upload/:applicationId`

> ⚠️ **Note:** Application ID must exist first (created by Dev 1's POST /api/applications)

**Headers:**
```
Authorization: Bearer {{TOKEN}}
```

**Body (form-data):**
| Key | Type | Value |
|---|---|---|
| `document` | File | *(select a .txt file)* |
| `declared_doc_type` | Text | `PAN_CARD` |

**Valid `declared_doc_type` values:**
- `PAN_CARD`
- `AADHAAR_CARD`
- `ELECTRICITY_BILL`
- `BANK_STATEMENT`
- `DRIVING_LICENCE`

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "doc_id": "DOC17298823...",
    "file_name": "pan_card.txt",
    "declared_doc_type": "PAN_CARD",
    "file_hash": "a1b2c3d4e5f6...",
    "file_size": 1024,
    "uploaded_at": "2026-10-23T08:00:00.000Z"
  }
}
```

**Error - Wrong file type (400):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Only .txt files are allowed. Got: .pdf"
  }
}
```

---

### 3.2 Get Document (with Audit Log)

#### `GET /api/documents/:doc_id`

**Headers:**
```
Authorization: Bearer {{TOKEN}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "doc_id": "DOC17298823...",
    "file_name": "pan_card.txt",
    "declared_doc_type": "PAN_CARD",
    "classified_doc_type": "PAN_CARD",
    "file_hash": "a1b2c3d4e5f6...",
    "cloudinary_url": "https://res.cloudinary.com/...",
    "extracted_fields": [
      {
        "field_name": "name",
        "value": "JOHN DOE",
        "confidence": 0.95,
        "source": "EXTRACTION"
      }
    ],
    "uploaded_at": "2026-10-23T08:00:00.000Z"
  }
}
```

**Error - Applicant accessing another's document (403):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied"
  }
}
```

---

### 3.3 Get Extracted Fields (Officers Only)

#### `GET /api/documents/:doc_id/extracted`

**Headers:**
```
Authorization: Bearer {{TOKEN}}   ← Must be officer token
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "doc_id": "DOC17298823...",
    "classified_doc_type": "PAN_CARD",
    "doc_type_confidence": 0.97,
    "extracted_fields": [
      { "field_name": "name", "value": "JOHN DOE", "confidence": 0.95, "source": "EXTRACTION" },
      { "field_name": "pan", "value": "ABCPJ1234D", "confidence": 0.99, "source": "EXTRACTION" }
    ],
    "processed_at": "2026-10-23T08:01:00.000Z"
  }
}
```

**Error - Applicant trying to access (403):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Required role: KYC_OFFICER or COMPLIANCE_OFFICER"
  }
}
```

---

## 📋 4. Audit Routes (`/api/audit`)

### 4.1 Get Audit Trail for an Application

#### `GET /api/audit/:application_id`

**Headers:**
```
Authorization: Bearer {{TOKEN}}   ← Must be officer token
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "audit_trail": [
      {
        "audit_id": "AUD17298823...",
        "application_id": "A2000001",
        "user_id": { "full_name": "John Doe", "email": "john@test.com", "role": "APPLICANT" },
        "event_type": "STATUS_CHANGE",
        "old_value": "SUBMITTED",
        "new_value": "EXTRACTING",
        "timestamp": "2026-10-23T08:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

---

### 4.2 Get All Audit Logs (Compliance Officer Only)

#### `GET /api/audit?from=2026-01-01&to=2026-12-31&event_type=STATUS_CHANGE&page=1&limit=20`

**Headers:**
```
Authorization: Bearer {{TOKEN}}   ← Compliance Officer token only
```

**Query Parameters:**
| Param | Description | Example |
|---|---|---|
| `from` | Start date filter | `2026-01-01` |
| `to` | End date filter | `2026-12-31` |
| `event_type` | Filter by event | `STATUS_CHANGE`, `DOCUMENT_VIEW` |
| `page` | Page number | `1` |
| `limit` | Results per page | `50` |

---

## 🚫 5. Validation Error Tests

### Test: 12-Digit Aadhaar Rejected

Try registering with a body containing `aadhaar_last4: "123456789012"` — must be rejected.

### Test: Invalid PAN Format

**POST /api/auth/register** with body:
```json
{
  "email": "test@test.com",
  "password": "password123",
  "full_name": "Test User",
  "role": "APPLICANT"
}
```
*(PAN validation is on application submission, not registration)*

**POST /api/applications** with body:
```json
{
  "pan_number": "123ABCDEF",
  "aadhaar_last4": "12345"
}
```

**Expected Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": [
      { "field": "pan_number", "message": "PAN must be in format ABCDE1234F" },
      { "field": "aadhaar_last4", "message": "Only last 4 digits of Aadhaar are accepted" }
    ]
  }
}
```

### Test: No Token (401)

Make any protected request without Authorization header:
```
GET {{BASE_URL}}/api/auth/me
```

**Expected (401):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### Test: Applicant Accessing Officer Route (403)

Login as applicant, then try:
```
GET {{BASE_URL}}/api/audit
```

**Expected (403):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Required role: COMPLIANCE_OFFICER"
  }
}
```

---

## 🌱 6. Seed & Quick Start Commands

```powershell
# 1. Start MongoDB (if running locally)
mongod

# 2. Seed the database (run once)
cd server
npm run seed

# 3. Start server in dev mode
npm run dev

# Seeded test accounts:
# applicant@test.com  / password123  (APPLICANT)
# officer@test.com    / password123  (KYC_OFFICER)
# officer2@test.com   / password123  (KYC_OFFICER)
# compliance@test.com / password123  (COMPLIANCE_OFFICER)
```

---

## 📂 Postman Collection Structure

```
OnboardIQ - Dev 2
├── 🟢 Health Check
│   └── GET /health
├── 🔐 Auth
│   ├── POST /api/auth/register (Applicant)
│   ├── POST /api/auth/register (KYC Officer)
│   ├── POST /api/auth/register (Compliance Officer)
│   ├── POST /api/auth/login ← auto-saves TOKEN
│   ├── GET  /api/auth/me
│   └── POST /api/auth/logout
├── 📄 Documents
│   ├── POST /api/documents/upload/:applicationId
│   ├── GET  /api/documents/:doc_id
│   └── GET  /api/documents/:doc_id/extracted
└── 📋 Audit
    ├── GET /api/audit/:application_id
    └── GET /api/audit (with query params)
```

---

## ⚡ Quick Test Flow

1. **Run seed:** `npm run seed`
2. **Login** as `applicant@test.com` → token auto-saved
3. **GET /health** → should return `"status": "ok"`
4. **GET /api/auth/me** → returns current user
5. **Login** as `officer@test.com` → token updated
6. **GET /api/auth/me** → now shows KYC_OFFICER role
7. **GET /api/audit** → 403 (compliance only)
8. **Login** as `compliance@test.com` → token updated
9. **GET /api/audit** → 200 (audit logs)
