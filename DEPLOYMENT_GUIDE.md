# OnboardIQ - Deployment Guide

**Date**: October 23, 2026  
**Status**: Ready for Production

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+ and npm 9+
- MongoDB 5.0+ (local or Atlas)
- Git

### Step 1: Clone & Install

```bash
# Clone repository
git clone <repository-url>
cd onboardiq

# Backend setup
cd server
npm install

# Frontend setup
cd ../client
npm install
cd ..
```

### Step 2: Environment Configuration

**Create server/.env:**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/onboardiq
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=mock
CLOUDINARY_API_KEY=mock
CLOUDINARY_API_SECRET=mock
RESEND_API_KEY=mock
FROM_EMAIL=onboarding@onboardiq.demo
EXTRACTION_PROVIDER=mock
CORE_BANKING_API_URL=http://localhost:5000/api/mock/core-banking
CORE_BANKING_API_KEY=mock-key-12345
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
FRONTEND_URL=http://localhost:5173
MAX_FILE_SIZE=1048576
ALLOWED_FILE_TYPES=.txt
ENABLE_CRON_JOBS=true
```

**Create client/.env.local:**
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Step 3: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
# Frontend runs on http://localhost:5173
```

### Step 4: Verify Installation

```bash
# Health check
curl http://localhost:5000/health

# Expected response:
# {"status":"UP","service":"OnboardIQ Backend","timestamp":"2026-10-23T..."}
```

✅ Local development ready!

---

## 🌍 Production Deployment

### Option 1: Railway/Render (Backend) + Vercel (Frontend)

**Backend Deployment (Railway):**

1. **Create Railway account** at https://railway.app
2. **Connect GitHub repository**
3. **Create new project** → Select repository
4. **Configure service:**
   ```
   Root directory: server
   Start command: npm start
   ```
5. **Add environment variables:**
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=<your-mongodb-atlas-uri>
   JWT_SECRET=<generate-strong-random-string>
   CLOUDINARY_CLOUD_NAME=<your-cloudinary-name>
   CLOUDINARY_API_KEY=<your-cloudinary-key>
   CLOUDINARY_API_SECRET=<your-cloudinary-secret>
   RESEND_API_KEY=<your-resend-key>
   FROM_EMAIL=onboarding@yourdomain.com
   EXTRACTION_PROVIDER=mock  # or ai for AI track
   FRONTEND_URL=<your-vercel-frontend-url>
   ```
6. **Deploy** → Railway handles it

**Frontend Deployment (Vercel):**

1. **Connect GitHub to Vercel** at https://vercel.com
2. **Import repository**
3. **Configure:**
   ```
   Root directory: client
   Build command: npm run build
   Output directory: dist
   ```
4. **Add environment variable:**
   ```
   VITE_API_BASE_URL=<your-railway-backend-url>/api
   ```
5. **Deploy** → Vercel handles it

### Option 2: Docker + Docker Compose

**Backend Dockerfile (server/Dockerfile):**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

**Frontend Dockerfile (client/Dockerfile):**
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: onboardiq
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./server
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://mongodb:27017/onboardiq
      FRONTEND_URL: http://localhost:3000
    depends_on:
      - mongodb

  frontend:
    build: ./client
    ports:
      - "3000:80"
    environment:
      VITE_API_BASE_URL: http://localhost:5000/api
    depends_on:
      - backend

volumes:
  mongo_data:
```

**Deploy with Docker:**
```bash
docker-compose up -d
```

### Option 3: Cloud Run (Google) + Firebase

**Create app.yaml (for Cloud Run):**
```yaml
runtime: nodejs18

env: standard
entrypoint: npm start

automatic_scaling:
  min_instances: 1
  max_instances: 100
```

**Deploy:**
```bash
cd server
gcloud app deploy
```

---

## 📦 Production Database

### MongoDB Atlas Setup

1. **Create account** at https://www.mongodb.com/cloud/atlas
2. **Create cluster** (M0 free tier sufficient for demo)
3. **Configure network access** → Add your IP
4. **Create database user** → Get connection string
5. **Use connection string** in `.env`:
   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/onboardiq?retryWrites=true&w=majority
   ```

### Database Initialization

```bash
# Run seed script in production
NODE_ENV=production npm run seed
```

This will:
- Load watchlists
- Load occupations
- Create demo users
- Load configuration

---

## 🔒 Security Checklist

### Before Deployment

- [ ] Generate strong JWT_SECRET (64+ chars)
- [ ] Set NODE_ENV=production
- [ ] Use HTTPS for frontend/backend
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set secure cookies (httpOnly, secure)
- [ ] Validate all inputs
- [ ] Hash passwords with bcrypt
- [ ] Use environment variables for secrets
- [ ] Enable database backups
- [ ] Set up monitoring/alerts
- [ ] Review audit logs
- [ ] Test maker-checker enforcement

### CORS Configuration

```javascript
// In production, specify exact origin
cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
})
```

### Rate Limiting

```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 📊 Monitoring & Logging

### Application Monitoring

**Recommended services:**
- **Sentry** (Error tracking)
- **DataDog** (APM)
- **New Relic** (Performance)
- **LogRocket** (Session replay)

### Set Up Sentry

```bash
npm install @sentry/node @sentry/tracing

# In server/src/index.js
const Sentry = require("@sentry/node");
Sentry.init({ dsn: process.env.SENTRY_DSN });
app.use(Sentry.Handlers.errorHandler());
```

### Database Backups

**MongoDB Atlas** automatically:
- ✅ Daily snapshots
- ✅ 24-hour retention (free tier)
- ✅ Point-in-time recovery

**Manual backup:**
```bash
mongodump --uri "mongodb://..." --out ./backup
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

**Create .github/workflows/deploy.yml:**

```yaml
name: Deploy OnboardIQ

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install backend
        run: cd server && npm install
      
      - name: Test backend
        run: cd server && npm test
      
      - name: Install frontend
        run: cd client && npm install
      
      - name: Build frontend
        run: cd client && npm run build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy backend to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm install -g @railway/cli
          railway up
      
      - name: Deploy frontend to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: |
          npm install -g vercel
          vercel deploy --prod --token $VERCEL_TOKEN
```

---

## 🧪 Testing in Production

### Smoke Tests

```bash
# Health check
curl https://api.onboardiq.com/health

# Auth test
curl -X POST https://api.onboardiq.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Application test
curl https://api.onboardiq.com/api/applications/A2000001 \
  -H "Authorization: Bearer <token>"
```

### Load Testing

```bash
npm install -g artillery

# Create load-test.yml
endpoints:
  - url: https://api.onboardiq.com
    scenarios:
      - name: "Application Review"
        flow:
          - get:
              url: /api/review/queue
              headers:
                Authorization: Bearer token

# Run test
artillery run load-test.yml
```

---

## 📈 Scaling to 100x

### Phase 1: Database Optimization
- [ ] Add indexes on frequently queried fields
- [ ] Enable read replicas for queries
- [ ] Partition large collections

### Phase 2: Caching Layer
- [ ] Add Redis for session storage
- [ ] Cache dashboard metrics
- [ ] Cache watchlist queries

### Phase 3: Microservices
- [ ] Separate rules engine service
- [ ] Separate extraction service
- [ ] Message queue for async tasks

### Phase 4: Infrastructure
- [ ] Load balancer (Nginx, HAProxy)
- [ ] Auto-scaling groups
- [ ] CDN for frontend
- [ ] Database replication

### Phase 5: Advanced Features
- [ ] Real-time updates (WebSocket)
- [ ] Message queues (Bull, RabbitMQ)
- [ ] Background jobs (node-cron → Agenda)
- [ ] Advanced monitoring (ELK stack)

---

## 🆘 Troubleshooting

### Backend Won't Start
```bash
# Check port
lsof -i :5000

# Check MongoDB connection
mongoose connection
```

### Frontend Can't Reach Backend
```bash
# Check CORS configuration
curl -i -X OPTIONS http://localhost:5000/api/applications

# Check environment variable
echo $VITE_API_BASE_URL
```

### Batch Processing Fails
```bash
# Verify CSV files exist
ls -la case_02_*.csv

# Run with verbose logging
NODE_DEBUG=* npm run batch
```

---

## 📚 Useful Commands

### Backend
```bash
npm run dev              # Development with nodemon
npm start               # Production
npm test                # Run tests
npm run seed            # Seed database
npm run batch           # Batch process applications
```

### Frontend
```bash
npm run dev             # Development server
npm run build           # Production build
npm run preview         # Preview build
npm run lint            # Run linter
```

### Database
```bash
# Connect to local MongoDB
mongo mongodb://localhost:27017/onboardiq

# Connect to MongoDB Atlas
mongosh "mongodb+srv://..."

# Export data
mongoexport -c collection_name -o output.json

# Import data
mongoimport -c collection_name input.json
```

---

## 🎯 Success Metrics

**After Deployment, Monitor:**
- ✅ API response time (target: <200ms)
- ✅ Error rate (target: <0.1%)
- ✅ STP rate (target: >70%)
- ✅ Database connections (monitor for leaks)
- ✅ Memory usage (target: <500MB)
- ✅ CPU usage (target: <30%)
- ✅ Request throughput (monitor for bottlenecks)
- ✅ Batch processing time (target: <30s for 100 apps)

---

## 🚨 Disaster Recovery

### Backup Strategy
- Daily MongoDB backups
- GitHub repository as code backup
- Environment variables stored separately
- Database snapshots in multiple regions

### Recovery Procedures
1. **Database corruption**: Restore from snapshot
2. **Code issues**: Rollback to previous commit
3. **Secret compromise**: Rotate JWT_SECRET
4. **DDoS attack**: Enable CloudFlare protection
5. **Data loss**: Restore from backup

---

## 📞 Support & Escalation

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Cannot connect to DB" | MongoDB not running | `mongod` or check Atlas |
| "403 Unauthorized" | Missing/invalid JWT | Login again, check token |
| "Maker-checker violation" | Same user | Use different officer account |
| "File upload fails" | Size limit or type | Ensure .txt <1MB |
| "Rules engine slow" | N+1 queries | Add database indexes |

---

## ✅ Pre-Launch Checklist

- [ ] All environment variables set
- [ ] Database backups configured
- [ ] SSL/HTTPS enabled
- [ ] Authentication working
- [ ] Maker-checker enforcement active
- [ ] Audit trail logging
- [ ] Error monitoring active
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Security headers set
- [ ] Database optimization done
- [ ] Load testing passed
- [ ] Disaster recovery plan in place

---

**Deployment Guide Complete**

Ready to launch OnboardIQ to production! 🚀

