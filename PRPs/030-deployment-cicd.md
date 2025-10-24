# PRP-030: Deployment & CI/CD

## Status
🔲 Not Started

## Priority
P0 - Critical (Required for production launch)

## Objective
Configure complete deployment pipeline with Vercel for frontend/API, Railway for backend services, GitHub Actions for CI/CD, environment management, monitoring, and smoke tests for production readiness.

## Scope

### Files to Create
- `.github/workflows/ci.yml` - Continuous Integration workflow
- `.github/workflows/deploy-staging.yml` - Staging deployment workflow
- `.github/workflows/deploy-production.yml` - Production deployment workflow
- `.github/workflows/smoke-tests.yml` - Post-deployment smoke tests
- `scripts/deploy-vercel.sh` - Vercel deployment script
- `scripts/deploy-railway.sh` - Railway deployment script
- `scripts/smoke-tests.sh` - Smoke test runner
- `scripts/db-migrate.sh` - Database migration script
- `tests/smoke/health-check.test.ts` - Health check smoke tests
- `tests/smoke/api-endpoints.test.ts` - API endpoint smoke tests
- `tests/smoke/auth-flow.test.ts` - Authentication flow smoke tests
- `vercel.json` - Vercel configuration
- `railway.toml` - Railway configuration
- `.env.staging.example` - Staging environment variables template
- `.env.production.example` - Production environment variables template
- `docs/DEPLOYMENT.md` - Deployment documentation
- `docs/ROLLBACK.md` - Rollback procedures documentation

### Dependencies to Install
```bash
npm install --save-dev @vercel/node
npm install --save-dev railway
npm install --save-dev dotenv-cli
npm install --save-dev cross-env
```

## Implementation Steps

### Phase 1: Environment Configuration

1. **Set Up Environment Variables**
   - Create .env.staging for staging environment
   - Create .env.production for production environment
   - Document all required environment variables
   - Use secrets management (GitHub Secrets, Vercel Env Vars)
   - Never commit sensitive values to repository

2. **Configure Vercel Project**
   - Create Vercel project via CLI or dashboard
   - Link GitHub repository
   - Configure production and preview deployments
   - Set environment variables in Vercel dashboard
   - Configure custom domain (if applicable)
   - Set up deployment protection (require approval for production)

3. **Configure Railway Project**
   - Create Railway project for PostgreSQL
   - Create Railway project for Redis
   - Set up environment variables
   - Configure health check endpoints
   - Set up volume mounts for persistence
   - Configure auto-scaling (if needed)

### Phase 2: CI/CD Pipeline

4. **Create CI Workflow**
   - Trigger on pull requests and pushes to main/develop
   - Jobs:
     - **Lint**: ESLint, Prettier check
     - **Type Check**: TypeScript compilation
     - **Unit Tests**: Jest tests with coverage
     - **Integration Tests**: API tests
     - **Build**: Next.js production build
     - **Security Scan**: Snyk vulnerability scan
   - Require all checks to pass before merge
   - Upload test coverage to Codecov

5. **Create Staging Deployment Workflow**
   - Trigger on push to `develop` branch
   - Steps:
     - Run CI pipeline
     - Build application
     - Run database migrations (staging DB)
     - Deploy to Vercel preview deployment
     - Deploy backend to Railway (staging environment)
     - Run smoke tests against staging
     - Notify team via Slack (deployment status)
   - Auto-deploy on successful merge to develop

6. **Create Production Deployment Workflow**
   - Trigger on push to `main` branch OR manual trigger
   - Require manual approval before deployment
   - Steps:
     - Run full CI pipeline
     - Run security audit
     - Build application with production config
     - Create database backup
     - Run database migrations (production DB)
     - Deploy to Vercel production
     - Deploy backend to Railway (production environment)
     - Run comprehensive smoke tests
     - Monitor for errors (10 minutes)
     - Notify team via Slack
   - Rollback on smoke test failure

### Phase 3: Database Migrations

7. **Implement Database Migration Strategy**
   - Use Prisma Migrate for migrations
   - Test migrations in staging first
   - Backup database before production migration
   - Run migrations in transaction (when possible)
   - Keep migration files in version control
   - Document breaking changes
   - Plan for zero-downtime migrations

8. **Create Migration Script**
   - Automated migration runner
   - Verify database connection before migrating
   - Run migrations in correct order
   - Validate schema after migration
   - Rollback on error
   - Log migration execution

### Phase 4: Smoke Tests

9. **Implement Health Check Tests**
   - API health endpoint (GET /api/health)
   - Database connectivity check
   - Redis connectivity check
   - External service connectivity (Monday.com, Auth0)
   - Return 200 OK if all services healthy
   - Return 503 if any service unavailable

10. **Create API Endpoint Smoke Tests**
    - Test critical API endpoints:
      - GET /api/projects (list projects)
      - GET /api/projects/[id] (get project)
      - POST /api/projects (create project)
      - GET /api/capacity/dashboard (capacity data)
      - GET /api/cashflow/projection (cash flow)
    - Verify response status codes
    - Verify response data structure
    - Test with authentication
    - Run against staging and production

11. **Create Authentication Flow Tests**
    - Test login flow (Auth0)
    - Test JWT validation
    - Test protected routes
    - Test role-based access control
    - Test session persistence
    - Test logout flow

### Phase 5: Monitoring & Alerts

12. **Set Up Error Monitoring**
    - Configure Sentry for error tracking
    - Set up error alerts (Slack, email)
    - Monitor error rate (alert if >1% of requests)
    - Track error trends
    - Set up custom error boundaries

13. **Set Up Performance Monitoring**
    - Configure Datadog APM (or Vercel Analytics)
    - Monitor API response times
    - Track database query performance
    - Monitor cache hit ratio
    - Alert on performance degradation
    - Set up custom metrics

14. **Create Deployment Notifications**
    - Slack notifications for deployments
    - Include: branch, commit, deployer, environment
    - Link to deployment URL
    - Show deployment status (pending, success, failed)
    - Tag relevant team members

### Phase 6: Vercel Deployment Protocol (CRITICAL)

15. **Implement Vercel Deployment Protocol**
    Following the protocol from CLAUDE.md:

    **Step 1: Pre-Deployment Checks**
    - [ ] Run full test suite locally: `npm run test:ci`
    - [ ] Run build locally: `npm run build`
    - [ ] Verify all environment variables set in Vercel
    - [ ] Review changes since last deployment
    - [ ] Notify team of upcoming deployment

    **Step 2: Deploy**
    - For staging: `vercel` (creates preview deployment)
    - For production: `vercel --prod`
    - Alternative: Use GitHub Actions workflow (recommended)
    - Wait for "Ready!" message in output

    **Step 3: Verify Deployment**
    - Check deployment status: `vercel ls`
    - Verify deployment URL is accessible
    - Check Vercel dashboard for build logs
    - Verify no build errors or warnings

    **Step 4: Test Functionality**
    - Visit deployed URL
    - Test critical user flows:
      - Login/authentication
      - View projects list
      - Create/edit project
      - View capacity dashboard
      - Generate report
    - Test on mobile device
    - Verify database connectivity

    **Step 5: Check Logs**
    - Run: `vercel logs [deployment-url]`
    - Monitor for runtime errors
    - Check for any warnings
    - Verify API endpoints returning correct responses
    - Monitor for at least 10 minutes

    **Step 6: Smoke Tests**
    - Run automated smoke tests: `npm run test:smoke -- --env=production`
    - Verify all tests pass
    - Check health endpoint: `curl https://[deployment-url]/api/health`
    - Verify returns 200 OK

    **Step 7: Monitor**
    - Watch error rate in Sentry (should be <1%)
    - Monitor API response times (should be <500ms P95)
    - Check database connection pool (should have available connections)
    - Monitor for at least 30 minutes post-deployment

    **NEVER report deployment as successful without:**
    - ✅ Build completed successfully (no errors)
    - ✅ Deployment is accessible via URL
    - ✅ No runtime errors in Vercel logs
    - ✅ Key functionality tested and working
    - ✅ Smoke tests passed
    - ✅ No error spike in monitoring
    - ✅ Database migrations applied successfully

    **If errors are found:**
    - 🚨 Report errors immediately with details
    - 🚨 Check build logs: `vercel logs --follow`
    - 🚨 Check runtime logs for stack traces
    - 🚨 Rollback if errors are critical
    - 🚨 Fix issues before claiming deployment success

### Phase 7: Rollback Procedures

16. **Create Rollback Plan**
    - **Vercel Rollback**:
      - Via dashboard: Select previous deployment, click "Promote to Production"
      - Via CLI: `vercel rollback [deployment-url]`
      - Verify rollback successful
    - **Railway Rollback**:
      - Via dashboard: Select previous deployment, click "Redeploy"
      - Via CLI: `railway rollback`
    - **Database Rollback**:
      - Restore from backup
      - Run down migrations (if applicable)
      - Verify data integrity

17. **Document Rollback Procedures**
    - Step-by-step rollback guide
    - Contact information for escalation
    - Decision criteria for rollback
    - Post-rollback verification steps

## Acceptance Criteria

### CI/CD Pipeline
- [ ] CI workflow runs on every PR and push to main/develop
- [ ] All CI checks (lint, test, build) must pass before merge
- [ ] Staging deployment triggers automatically on merge to develop
- [ ] Production deployment requires manual approval
- [ ] Failed deployments trigger alerts
- [ ] Deployment notifications sent to Slack

### Vercel Deployment
- [ ] Vercel project configured with GitHub integration
- [ ] Environment variables set for staging and production
- [ ] Custom domain configured (if applicable)
- [ ] Production deployments protected (require approval)
- [ ] Deployment logs accessible via CLI and dashboard

### Railway Deployment
- [ ] PostgreSQL and Redis deployed to Railway
- [ ] Environment variables configured
- [ ] Health checks configured
- [ ] Auto-scaling enabled (if needed)
- [ ] Backups configured (daily for PostgreSQL)

### Database Migrations
- [ ] Migrations run automatically in CI/CD pipeline
- [ ] Migrations tested in staging before production
- [ ] Database backup created before production migration
- [ ] Rollback procedure documented and tested

### Smoke Tests
- [ ] Health check endpoint returns 200 OK
- [ ] Critical API endpoints return correct responses
- [ ] Authentication flow works end-to-end
- [ ] Smoke tests run automatically post-deployment
- [ ] Deployment fails if smoke tests fail

### Monitoring
- [ ] Error monitoring configured (Sentry)
- [ ] Performance monitoring configured (Datadog/Vercel Analytics)
- [ ] Alerts configured for errors and performance issues
- [ ] Deployment notifications working (Slack)
- [ ] Logs accessible and searchable

### Vercel Deployment Protocol
- [ ] Protocol documented and followed for all deployments
- [ ] Build completion verified before reporting success
- [ ] Deployment accessibility confirmed
- [ ] Runtime logs checked for errors
- [ ] Key functionality tested
- [ ] Smoke tests passed
- [ ] No error spikes in monitoring

### Documentation
- [ ] DEPLOYMENT.md created with full deployment guide
- [ ] ROLLBACK.md created with rollback procedures
- [ ] Environment variables documented
- [ ] Troubleshooting guide created

## Validation Steps

```bash
# PHASE 1: Local Setup
# 1. Install deployment tools
npm install --save-dev @vercel/node railway dotenv-cli cross-env

# 2. Install Vercel CLI
npm install -g vercel

# 3. Install Railway CLI
npm install -g railway

# 4. Login to Vercel
vercel login

# 5. Login to Railway
railway login

# PHASE 2: Configure Vercel
# 6. Link project to Vercel
vercel link

# 7. Set environment variables in Vercel
vercel env pull .env.local
# Manually add production secrets via Vercel dashboard

# 8. Test Vercel deployment (preview)
vercel
# Wait for "Ready!" message
# Visit preview URL
# Verify app loads correctly

# PHASE 3: Configure Railway
# 9. Create Railway project
railway init

# 10. Create PostgreSQL service
railway add -s postgresql

# 11. Create Redis service
railway add -s redis

# 12. Get Railway connection strings
railway variables
# Add to Vercel environment variables

# PHASE 4: Test CI/CD Pipeline
# 13. Create feature branch
git checkout -b test/ci-pipeline

# 14. Push to GitHub
git push -u origin test/ci-pipeline

# 15. Create Pull Request
# Verify CI workflow runs
# Check all jobs pass (lint, test, build)

# PHASE 5: Test Staging Deployment
# 16. Merge PR to develop branch
git checkout develop
git merge test/ci-pipeline
git push origin develop

# 17. Verify staging deployment workflow runs
# Check GitHub Actions tab
# Verify deployment succeeds

# 18. Run smoke tests against staging
npm run test:smoke -- --env=staging
# All tests should pass

# PHASE 6: Test Production Deployment (CRITICAL)
# 19. Create release branch
git checkout -b release/v1.0.0

# 20. Merge to main
git checkout main
git merge release/v1.0.0

# 21. CRITICAL: Follow Vercel Deployment Protocol
# Step 1: Pre-deployment checks
npm run test:ci
npm run build
# Verify all pass

# Step 2: Deploy to production
vercel --prod
# Or trigger via GitHub Actions (recommended)

# Step 3: Verify deployment
vercel ls
# Verify latest deployment is "READY"

# Step 4: Test functionality
# Visit production URL
# Test login: https://[production-url]/login
# Test projects: https://[production-url]/projects
# Test capacity: https://[production-url]/capacity
# Test on mobile device

# Step 5: Check logs
vercel logs [deployment-url] --follow
# Monitor for 10 minutes
# Verify no errors

# Step 6: Run smoke tests
npm run test:smoke -- --env=production
# Verify all pass

curl https://[production-url]/api/health
# Should return 200 OK with all services healthy

# Step 7: Monitor
# Check Sentry dashboard for errors
# Check Vercel Analytics for performance
# Monitor for 30 minutes

# PHASE 7: Test Rollback
# 22. Test Vercel rollback (if needed)
vercel rollback
# Or via Vercel dashboard

# 23. Verify rollback successful
vercel ls
# Verify previous deployment promoted

# PHASE 8: Database Migrations
# 24. Test migration in staging
railway run --environment staging npx prisma migrate deploy

# 25. Backup production database
railway run --environment production pg_dump > backup.sql

# 26. Run migration in production
railway run --environment production npx prisma migrate deploy

# PHASE 9: Monitoring
# 27. Verify error monitoring
# Trigger test error
# Verify Sentry captures error
# Verify Slack alert sent

# 28. Verify performance monitoring
# Make several API requests
# Check Vercel Analytics dashboard
# Verify metrics collected

# PHASE 10: Documentation
# 29. Review DEPLOYMENT.md
cat docs/DEPLOYMENT.md
# Verify all steps documented

# 30. Review ROLLBACK.md
cat docs/ROLLBACK.md
# Verify rollback procedures documented

# FINAL VALIDATION
# 31. End-to-end deployment test
# Complete full deployment cycle:
#   - Create feature branch
#   - Make changes
#   - Push and create PR
#   - Verify CI passes
#   - Merge to develop
#   - Verify staging deployment
#   - Run smoke tests on staging
#   - Merge to main
#   - **FOLLOW VERCEL DEPLOYMENT PROTOCOL**
#   - Approve production deployment
#   - Verify production deployment
#   - Run smoke tests on production
#   - Monitor for errors
#   - **ONLY REPORT SUCCESS AFTER ALL CHECKS PASS**
```

## Expected Output

```
✓ CI/CD pipeline fully configured
✓ Vercel project configured for frontend/API
✓ Railway services configured for PostgreSQL and Redis
✓ Environment variables set for staging and production
✓ Staging deployment automated on develop branch
✓ Production deployment protected with approval
✓ Database migrations automated
✓ Smoke tests passing in staging and production
✓ Error monitoring configured (Sentry)
✓ Performance monitoring configured
✓ Deployment notifications working (Slack)
✓ Rollback procedures documented and tested
✓ Vercel Deployment Protocol documented and followed
✓ All deployments verified with no runtime errors
✓ DEPLOYMENT.md and ROLLBACK.md created
```

## Environment Variables Required

### Vercel (Frontend/API)
```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Auth0
AUTH0_SECRET=...
AUTH0_BASE_URL=https://[your-domain]
AUTH0_ISSUER_BASE_URL=https://[tenant].auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_AUDIENCE=...

# Monday.com
MONDAY_API_KEY=...

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_REGION=...

# Sentry
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...

# Datadog
DATADOG_API_KEY=...
DATADOG_APP_KEY=...

# Email (Sendgrid)
SENDGRID_API_KEY=...

# Slack (for notifications)
SLACK_WEBHOOK_URL=...
```

### Railway (PostgreSQL/Redis)
```bash
# Automatically provided by Railway
PGHOST=...
PGPORT=5432
PGUSER=postgres
PGPASSWORD=...
PGDATABASE=railway
DATABASE_URL=postgresql://...

REDIS_HOST=...
REDIS_PORT=6379
REDIS_PASSWORD=...
REDIS_URL=redis://...
```

## Related PRPs
- Depends on: ALL previous PRPs (this is the final deployment)
- Blocks: NONE (this is the last PRP)
- Critical dependency: PRP-029 (Security Hardening)

## Estimated Time
14-16 hours

## Notes

### Vercel-Specific Considerations
- Vercel has serverless function timeout limits (10s on Hobby, 60s on Pro)
- Large reports or data exports may need to be moved to background jobs
- Use Vercel Edge Middleware for performance-critical routes
- Vercel automatically handles SSL/TLS certificates
- Use Vercel Analytics for performance monitoring (or Datadog)
- Preview deployments created for every PR automatically
- Production deployments can be protected with password

### Railway-Specific Considerations
- Railway provides PostgreSQL and Redis as managed services
- Automatic backups for PostgreSQL (configurable retention)
- Redis persistence can be enabled (RDB or AOF)
- Railway provides usage-based pricing (monitor costs)
- Health checks ensure services restart on failure
- Railway CLI allows running commands against deployed services

### Database Migration Best Practices
- **Always test in staging first**
- **Always backup before production migration**
- Use Prisma Shadow Database for development
- Avoid breaking schema changes (e.g., dropping columns)
- Plan for zero-downtime migrations:
  - Add new column (nullable)
  - Deploy code to populate new column
  - Backfill old data
  - Deploy code to use new column
  - Remove old column in next deployment
- Keep migrations small and incremental
- Document any manual steps required

### Monitoring Thresholds
- **Error Rate**: Alert if >1% of requests fail
- **API Response Time**: Alert if P95 >500ms
- **Database Connections**: Alert if pool >80% utilized
- **Cache Hit Ratio**: Alert if <70%
- **Disk Usage**: Alert if >80% on PostgreSQL
- **Memory Usage**: Alert if >80% on any service

### Deployment Checklist
Before every production deployment:
- [ ] All tests passing
- [ ] Security scan passing (no high/critical vulnerabilities)
- [ ] Performance tests passing
- [ ] Database migration plan documented
- [ ] Rollback plan ready
- [ ] Team notified of deployment
- [ ] Off-hours deployment scheduled (if major changes)
- [ ] Monitoring dashboards open
- [ ] Smoke tests ready to run
- [ ] **Vercel Deployment Protocol checklist ready**

### Post-Deployment Checklist
After every production deployment:
- [ ] Smoke tests passed
- [ ] No error spikes in Sentry
- [ ] API response times normal
- [ ] Database performance normal
- [ ] Cache working correctly
- [ ] Real-time features working (WebSocket)
- [ ] Mobile app working
- [ ] Team notified of successful deployment
- [ ] Deployment documented in changelog
- [ ] **All Vercel Deployment Protocol steps completed**

## Rollback Plan

### When to Rollback
- Critical errors affecting >10% of users
- Data corruption detected
- Security vulnerability introduced
- Performance degradation >50%
- Core functionality broken

### Vercel Rollback Procedure
```bash
# Option 1: Via Vercel Dashboard
# 1. Go to Vercel dashboard
# 2. Click on project
# 3. Go to "Deployments" tab
# 4. Find previous working deployment
# 5. Click "..." menu
# 6. Click "Promote to Production"
# 7. Verify rollback successful

# Option 2: Via Vercel CLI
vercel rollback [previous-deployment-url]

# Option 3: Redeploy previous commit
git revert [bad-commit-hash]
git push origin main
# Triggers new deployment with previous code
```

### Railway Rollback Procedure
```bash
# Via Railway Dashboard
# 1. Go to Railway dashboard
# 2. Select service
# 3. Go to "Deployments" tab
# 4. Click on previous deployment
# 5. Click "Redeploy"

# Via Railway CLI
railway rollback
```

### Database Rollback Procedure
```bash
# Option 1: Restore from backup
railway run --environment production psql < backup.sql

# Option 2: Run down migration (if applicable)
npx prisma migrate resolve --rolled-back [migration_name]

# Verify data integrity after rollback
railway run --environment production psql -c "SELECT COUNT(*) FROM projects;"
```

### Post-Rollback Steps
1. Verify application is working correctly
2. Run smoke tests against rolled-back version
3. Check error monitoring (errors should stop)
4. Notify team of rollback
5. Create incident report
6. Plan fix for issues that caused rollback
7. Test fix thoroughly in staging before re-deploying

## Troubleshooting Common Issues

### Build Fails on Vercel
- Check build logs in Vercel dashboard
- Verify all dependencies in package.json
- Check TypeScript errors
- Verify environment variables set correctly
- Try building locally first: `npm run build`

### Database Connection Fails
- Verify DATABASE_URL environment variable
- Check Railway PostgreSQL is running
- Verify connection pool settings
- Check IP whitelist (if applicable)
- Test connection with: `railway run npx prisma db push`

### Smoke Tests Fail
- Check which specific test failed
- Review logs for that endpoint
- Test endpoint manually with curl
- Verify environment variables
- Check database has necessary seed data

### High Error Rate After Deployment
- Check Sentry for error details
- Review Vercel logs for stack traces
- Rollback if errors are critical
- Fix issue and redeploy

### Performance Degradation
- Check Vercel Analytics for slow endpoints
- Review database query performance
- Check Redis cache hit ratio
- Verify no N+1 query issues
- Consider adding indexes

## Final Notes

This PRP is the culmination of all previous PRPs. It brings together the entire application and makes it production-ready.

**CRITICAL REMINDER**: The Vercel Deployment Protocol from CLAUDE.md MUST be followed for every deployment. Never report a deployment as successful without completing all verification steps.

Success criteria for this PRP:
- ✅ Application deployed to production
- ✅ All services healthy and monitored
- ✅ CI/CD pipeline automated
- ✅ Rollback procedures tested
- ✅ **Vercel Deployment Protocol followed and documented**
- ✅ Team trained on deployment process
- ✅ Documentation complete

Only when all of the above are true can this PRP be marked as complete.

## Support Contacts

- **Vercel Support**: support@vercel.com
- **Railway Support**: team@railway.app
- **On-Call Engineer**: [Phone number]
- **Team Slack**: #pph-capacity-tool

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
