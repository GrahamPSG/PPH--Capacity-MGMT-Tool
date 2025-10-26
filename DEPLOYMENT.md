# PPH Capacity Management Tool - Deployment Guide

## Quick Start (Development)

```bash
# 1. Clone the repository
git clone https://github.com/GrahamPSG/PPH--Capacity-MGMT-Tool.git
cd PPH--Capacity-MGMT-Tool

# 2. Run setup script
node scripts/setup.js

# 3. Update .env.local with your database URL
# DATABASE_URL="postgresql://username:password@localhost:5432/pph_capacity"

# 4. Set up database
npx prisma migrate dev
npx prisma db seed

# 5. Start development server
npm run dev

# Visit http://localhost:3000
```

## Vercel Deployment

### Prerequisites
- Vercel account
- PostgreSQL database (Supabase, Neon, or Railway recommended)

### Step 1: Database Setup

Choose one of these PostgreSQL providers:

#### Option A: Supabase (Recommended)
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database
4. Copy connection string (use "Transaction" mode)

#### Option B: Neon
1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string from dashboard

#### Option C: Railway
1. Create account at [railway.app](https://railway.app)
2. Add PostgreSQL service
3. Copy DATABASE_URL from service variables

### Step 2: Deploy to Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name? pph-capacity-manager
# - Directory? ./
# - Override settings? N
```

### Step 3: Configure Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add these variables:

```bash
DATABASE_URL="your-postgresql-connection-string"
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NODE_ENV="production"
ENABLE_AUTH="false"  # Set to true when auth is configured
```

### Step 4: Run Database Migrations

```bash
# Set production database URL locally
export DATABASE_URL="your-production-database-url"

# Run migrations
npx prisma migrate deploy

# Optional: Seed with sample data
npx prisma db seed
```

### Step 5: Redeploy with Environment Variables

```bash
vercel --prod
```

## Production Checklist

### Essential Configuration
- [ ] Database connected and migrated
- [ ] Environment variables set in Vercel
- [ ] Custom domain configured (optional)

### Security (Before Going Live)
- [ ] Enable authentication (Auth0 or Azure AD)
- [ ] Update NEXTAUTH_SECRET with secure value
- [ ] Enable HTTPS only
- [ ] Set up CORS if needed

### Performance
- [ ] Enable Vercel Analytics
- [ ] Set up error monitoring (Sentry)
- [ ] Configure caching headers

## Environment Variables Reference

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Your app URL
- `NEXTAUTH_SECRET` - Secret for NextAuth.js

### Optional
- `ENABLE_AUTH` - Enable authentication (default: false)
- `SENTRY_DSN` - Error tracking
- `REDIS_URL` - Caching (if using Redis)

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
npx prisma db pull

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset
```

### Build Errors
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Vercel Deployment Issues
```bash
# Check build logs
vercel logs

# Redeploy
vercel --force
```

## Support

For issues or questions:
- GitHub Issues: [github.com/GrahamPSG/PPH--Capacity-MGMT-Tool/issues](https://github.com/GrahamPSG/PPH--Capacity-MGMT-Tool/issues)
- Email: support@pphmechanical.com

## MVP Features

✅ **Capacity Visualization**
- Gantt chart with zoom (3 months to 2 years)
- Monthly utilization by division

✅ **Data Management**
- Project, Phase, Employee CRUD
- Crew assignments with conflict detection
- CSV import/export

✅ **Division Tracking**
- Separate Plumbing and HVAC
- Subdivisions: Multifamily, Commercial, Custom

✅ **Reporting**
- Capacity forecasting
- Critical period alerts
- Division summaries