# Paris Mechanical Capacity Management Tool

> A comprehensive capacity management and cash flow forecasting platform for Paris Plumbing and Heating

## Overview

The PPH Capacity Management Tool provides real-time project tracking, labor utilization analytics, and bi-directional Monday.com integration for construction capacity planning.

### Key Features

- **Project Management**: Complete project lifecycle tracking with phases and dependencies
- **Capacity Planning**: Real-time labor utilization and forecasting by division
- **Monday.com Integration**: Automatic 3-hour sync + real-time webhooks
- **Cash Flow Projections**: Schedule of Values tracking with variance analysis
- **Interactive Gantt Chart**: 5 zoom levels (day/week/month/quarter/year)
- **Smart Alerts**: Double-booking detection, capacity warnings, financial alerts
- **Mobile PWA**: Offline-capable progressive web app for field foremen
- **Role-Based Access**: 5-tier permission system (Owner, Manager, PM, Foreman, Read-Only)
- **Excel Integration**: Drag-and-drop import/export for phase updates

## Tech Stack

- **Frontend**: Next.js 14.2.5 with TypeScript + Tailwind CSS
- **Backend**: Node.js 20 LTS with Express
- **Database**: PostgreSQL 16 with Prisma ORM
- **Cache**: Redis 7.2
- **Real-time**: Socket.io 4.7
- **Auth**: Auth0 with RBAC
- **Deployment**: Vercel (frontend) + Railway (backend)

## Quick Start

### Prerequisites

- Node.js 20+ and npm 10+
- Docker and Docker Compose
- Auth0 account
- Monday.com API key

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/pph-capacity-management-tool.git
cd pph-capacity-management-tool

# Install dependencies
npm install

# Start Docker services (PostgreSQL, Redis, etc.)
docker compose up -d

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
npx prisma migrate dev

# (Optional) Seed database with sample data
npm run prisma:seed

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Development

### Running Tests

```bash
# Unit and integration tests
npm test

# E2E tests with Playwright
npm run test:e2e

# All tests with coverage
npm run test:all
```

### Database Management

```bash
# Open Prisma Studio GUI
npm run prisma:studio

# Create new migration
npx prisma migrate dev --name descriptive_name

# Reset database (CAUTION: deletes all data)
npm run prisma:migrate:reset
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## Deployment

### Staging

```bash
npm run deploy:staging
vercel logs [deployment-url]  # Check for errors
```

### Production

```bash
npm run deploy:production
vercel logs [deployment-url]  # Verify no errors
```

## Documentation

- [Technical Specification](./spec.md) - Complete system architecture
- [Implementation Plan](./prompt_plan.md) - 55-day TDD roadmap
- [Development Guide](./CLAUDE.md) - Setup and best practices
- [PRP Tickets](./PRPs/) - Progressive Refinement Plan breakdown

## Project Structure

See [CLAUDE.md](./CLAUDE.md#folder-structure) for detailed folder structure.

## API Documentation

API documentation is auto-generated and available at `/api/docs` when running locally.

## Security

- **Authentication**: Auth0 with JWT tokens
- **Authorization**: 5-tier RBAC system
- **Encryption**: TLS 1.3 in transit, AES-256 at rest
- **Rate Limiting**: 1000 requests/hour per user
- **Input Validation**: Zod schemas on all endpoints
- **Audit Logging**: Complete change history

## Performance

- **Page Load**: < 2 seconds (P95)
- **API Response**: < 500ms (P95)
- **Concurrent Users**: 50 active users supported
- **Database**: 500 active projects, 10,000 phases
- **Caching**: Redis with smart invalidation

## Monday.com Integration

- **Automatic Sync**: Every 3 hours
- **Manual Sync**: On-demand via UI
- **Real-time Updates**: Webhook integration
- **Conflict Resolution**: Configurable strategy
- **Field Mapping**: Customizable project/phase fields

## Support

For issues, questions, or feature requests:
- **GitHub Issues**: [Create an issue](https://github.com/YOUR_USERNAME/pph-capacity-management-tool/issues)
- **Documentation**: Check the `/docs` folder
- **Email**: support@parismechanical.com

## License

Proprietary - Paris Plumbing and Heating

## Acknowledgments

Built with Next.js, Prisma, Tailwind CSS, and the Monday.com SDK.

---

**Status**: 🚧 In Development - See [PRPs](./PRPs/) for implementation progress
