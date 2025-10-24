# Project Configuration & Dev Guide

## Tech Stack

| Layer     | Lib / Service     | Version  |
| --------- | ----------------- | -------- |
| Frontend  | Next.js           | 14.2.5   |
| UI        | Tailwind + shadcn | 3.4      |
| State     | Zustand + React Query | 4.5, 5.0 |
| Backend   | Node.js + Express | 20 LTS, 4.19 |
| Runtime   | Node              | 20 LTS   |
| DB        | PostgreSQL        | 16       |
| ORM       | Prisma            | 5.16     |
| Cache     | Redis             | 7.2      |
| Real-time | Socket.io         | 4.7      |
| Auth      | Auth0             | RBAC     |
| API       | Monday.com SDK    | 0.5.0    |
| Test      | Jest + Playwright | latest   |
| CI        | GitHub Actions    | —        |
| Container | Docker            | 24.x     |
| Deploy    | Vercel + Railway  | —        |

## Local Dev

1. `npm install`
2. `docker compose up -d` (starts PostgreSQL, Redis, pgAdmin, Mailhog, MinIO)
3. `npx prisma migrate dev` (run migrations)
4. `npx prisma db seed` (optional: seed data)
5. `npm run dev` (starts Next.js dev server)
6. Visit [http://localhost:3000](http://localhost:3000)

## Folder Structure

```
/
 ├─ src/
 │   ├─ app/               # Next.js 14 App Router
 │   │   ├─ api/          # API routes
 │   │   ├─ (auth)/       # Auth pages
 │   │   ├─ projects/     # Project pages
 │   │   ├─ capacity/     # Capacity pages
 │   │   └─ reports/      # Report pages
 │   ├─ components/
 │   │   ├─ layout/       # Layout components
 │   │   ├─ projects/     # Project components
 │   │   ├─ capacity/     # Capacity components
 │   │   ├─ charts/       # Chart components
 │   │   └─ ui/           # shadcn/ui components
 │   ├─ lib/
 │   │   ├─ prisma/       # Database client
 │   │   ├─ monday/       # Monday integration
 │   │   └─ auth/         # Auth utilities
 │   ├─ services/
 │   │   ├─ capacity/     # Capacity services
 │   │   ├─ scheduling/   # Scheduling logic
 │   │   ├─ financial/    # Financial services
 │   │   ├─ alerts/       # Alert system
 │   │   └─ reports/      # Report generation
 │   ├─ hooks/            # Custom React hooks
 │   ├─ store/            # Zustand stores
 │   └─ types/            # TypeScript types
 ├─ tests/
 │   ├─ unit/             # Unit tests
 │   ├─ integration/      # Integration tests
 │   ├─ e2e/              # End-to-end tests (Playwright)
 │   └─ fixtures/         # Test data
 ├─ prisma/
 │   ├─ schema.prisma     # Database schema
 │   ├─ migrations/       # Migration history
 │   └─ seed.ts           # Seed script
 ├─ public/
 │   ├─ icons/            # PWA icons
 │   └─ templates/        # Excel templates
 ├─ PRPs/                 # Progressive Refinement Plan tickets
 └─ docs/                 # Documentation
```

## Testing

| Type        | Tool      | Command               |
| ----------- | --------- | --------------------- |
| Unit        | Jest      | `npm test`            |
| Integration | Jest      | `npm run test:ci`     |
| E2E         | Playwright | `npm run test:e2e`   |
| All         | —         | `npm run test:all`   |
| Coverage    | —         | `npm run test:ci`    |

**Coverage Target**: 80% minimum

CI runs all tests on every PR.

## Git Workflow

* `main` = production
* `develop` = staging
* feature branches → PR → checks → squash merge
* Tags `vX.Y.Z` trigger production deploy

## CI/CD

* **PR**: lint, test, build
* **Merge to develop**: deploy to staging (Vercel preview)
* **Merge to main**: deploy to production (Vercel + Railway)
* **Artifacts**: Docker images for backend

## Monitoring

* **Sentry**: Error tracking
* **Datadog**: APM and metrics
* **Custom Metrics**: Capacity utilization, sync success rates
* **Alerts**: Slack webhook for critical issues

## Logging

* JSON structured logs
* Trace context propagation
* Log levels: debug, info, warn, error
* Audit logs for all mutations

## Security Best Practices

* **Auth**: Auth0 with RBAC (5 roles)
* **Rate Limiting**: 1000 req/hour per user
* **Encryption**: TLS 1.3, AES-256 at rest
* **Validation**: Zod schemas for all inputs
* **Sanitization**: DOMPurify for user content
* **CORS**: Restricted to approved domains
* **MFA**: Required for Owners, optional for Managers

## Performance Guidelines

* **Page Load**: < 2 seconds (P95)
* **API Response**: < 500ms (P95)
* **Caching**: Redis (15min project cache, 5min capacity)
* **Database**: Connection pooling (20 connections)
* **CDN**: Cloudflare for static assets
* **Lazy Loading**: Code splitting for routes
* **Virtualization**: React Window for large lists

## Vercel Deployment Protocol

**CRITICAL**: When deploying changes to Vercel, you MUST follow this protocol:

1. **Deploy**: Run `npm run deploy:staging` or `npm run deploy:production`
2. **Wait**: Allow deployment to complete (watch for "Ready!" message)
3. **Verify**: Check deployment status with `vercel ls`
4. **Test**: Visit the deployed URL and verify functionality
5. **Check Logs**: Run `vercel logs [deployment-url]` to check for runtime errors
6. **Confirm**: Only report "deployment successful" after verifying no errors exist

**Never report a deployment as functional without:**
- Confirming the build completed successfully
- Checking the deployment is accessible
- Verifying no runtime errors in Vercel logs
- Testing key functionality works as expected

**If errors are found:**
- Report the specific errors immediately
- Check build logs with `vercel logs --follow`
- Fix issues before claiming deployment success

## Monday.com Integration

* **Sync Interval**: Every 3 hours (configurable)
* **Manual Sync**: Available via UI button
* **Webhooks**: Real-time updates for project changes
* **Conflict Resolution**: Configurable (Monday wins | System wins | Manual)
* **Field Mapping**: Defined in `src/lib/monday/mappings.ts`

## Database

* **Migrations**: Prisma migrate (automatic in CI/CD)
* **Backups**: Daily automated, 30-day retention
* **Seeding**: `npm run prisma:seed`
* **Studio**: `npm run prisma:studio` for GUI

## Environment Variables

See `.env.example` for required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `AUTH0_*`: Auth0 configuration
- `MONDAY_API_KEY`: Monday.com API key
- `AWS_*`: S3 bucket for file storage
- `SENTRY_DSN`: Error tracking
- `DATADOG_API_KEY`: Monitoring

## PRP Implementation Process

1. Read PRP ticket in `/PRPs/`
2. Write tests first (TDD)
3. Implement feature to pass tests
4. Run validation: `npm run test:ci && npm run lint && npm run build`
5. Manual testing as needed
6. Commit with conventional commit message
7. Deploy milestone PRPs to Vercel and check logs
8. Mark PRP as complete only when fully validated

## Support

* **Issues**: GitHub Issues
* **Docs**: `/docs` folder
* **API Docs**: Auto-generated from OpenAPI spec
