# Paris Mechanical Capacity Management System
## Technical Specification v1.0

### Executive Summary
A comprehensive capacity management and cash flow forecasting platform for Paris Plumbing and Heating, featuring real-time project tracking, labor utilization analytics, and bi-directional Monday.com integration.

### System Architecture

#### Core Technology Stack
- **Frontend**: Next.js 14.2.5 with TypeScript 5.5
- **UI Framework**: Tailwind CSS 3.4 + shadcn/ui components
- **State Management**: Zustand 4.5 with React Query 5.0
- **Backend**: Node.js 20 LTS with Express 4.19
- **Database**: PostgreSQL 16 with Prisma ORM 5.16
- **Cache Layer**: Redis 7.2 with node-redis 4.6
- **Real-time**: Socket.io 4.7 for live updates
- **API Integration**: Monday.com SDK 0.5.0
- **Authentication**: Auth0 with RBAC
- **File Processing**: ExcelJS 4.4 for spreadsheet handling
- **Visualization**: Recharts 2.12 + D3.js 7.9
- **PDF Generation**: Puppeteer 22.0
- **Deployment**: Vercel (frontend) + Railway (backend)
- **Monitoring**: Sentry + Datadog

### Data Architecture

#### Database Schema

```typescript
// User and Authentication
interface User {
  id: string; // UUID
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  divisionAccess: Division[];
  phoneNumber?: string;
  auth0Id: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  isActive: boolean;
}

enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  FOREMAN = 'FOREMAN',
  READ_ONLY = 'READ_ONLY'
}

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  division: Division;
  employeeType: EmployeeType;
  hourlyRate: number;
  overtimeRate: number;
  maxHoursPerWeek: number;
  skills: string[];
  certifications: string[];
  availabilityStart: Date;
  availabilityEnd?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

enum Division {
  PLUMBING_MULTIFAMILY = 'PLUMBING_MULTIFAMILY',
  PLUMBING_COMMERCIAL = 'PLUMBING_COMMERCIAL',
  PLUMBING_CUSTOM = 'PLUMBING_CUSTOM',
  HVAC_MULTIFAMILY = 'HVAC_MULTIFAMILY',
  HVAC_COMMERCIAL = 'HVAC_COMMERCIAL',
  HVAC_CUSTOM = 'HVAC_CUSTOM'
}

enum EmployeeType {
  FOREMAN = 'FOREMAN',
  JOURNEYMAN = 'JOURNEYMAN',
  APPRENTICE = 'APPRENTICE'
}

// Project Management
interface Project {
  id: string;
  projectCode: string;
  name: string;
  type: ProjectType;
  division: Division;
  status: ProjectStatus;
  contractAmount: number;
  startDate: Date;
  endDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  foremanId: string;
  crewSize: number;
  address?: string;
  clientName: string;
  clientContact?: string;
  mondayBoardId?: string;
  mondayItemId?: string;
  lastMondaySync?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  modifiedById: string;
}

enum ProjectType {
  MULTIFAMILY = 'MULTIFAMILY',
  COMMERCIAL = 'COMMERCIAL',
  CUSTOM_HOME = 'CUSTOM_HOME'
}

enum ProjectStatus {
  QUOTED = 'QUOTED',
  AWARDED = 'AWARDED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

interface ProjectPhase {
  id: string;
  projectId: string;
  phaseNumber: number;
  name: string;
  division: Division;
  startDate: Date;
  endDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  duration: number; // in days
  progressPercentage: number;
  requiredCrewSize: number;
  requiredForeman: boolean;
  requiredJourneymen: number;
  requiredApprentices: number;
  laborHours: number;
  status: PhaseStatus;
  dependencies: string[]; // Array of phase IDs
  mondayGroupId?: string;
  lastUpdated: Date;
  updatedBy: string;
}

enum PhaseStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
  BLOCKED = 'BLOCKED'
}

// Crew Assignment
interface CrewAssignment {
  id: string;
  phaseId: string;
  employeeId: string;
  assignmentDate: Date;
  hoursAllocated: number;
  actualHoursWorked?: number;
  role: EmployeeType;
  isLead: boolean;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

// Financial Management
interface ScheduleOfValues {
  id: string;
  projectId: string;
  lineNumber: number;
  description: string;
  value: number;
  billingPercentage: number;
  billingDate: Date;
  actualBillingDate?: Date;
  invoiceNumber?: string;
  status: BillingStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

enum BillingStatus {
  SCHEDULED = 'SCHEDULED',
  INVOICED = 'INVOICED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  DISPUTED = 'DISPUTED'
}

interface ProjectExpense {
  id: string;
  projectId: string;
  phaseId?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: Date;
  vendorName?: string;
  invoiceNumber?: string;
  approvedBy?: string;
  attachmentUrl?: string;
  createdAt: Date;
  createdBy: string;
}

enum ExpenseCategory {
  LABOR = 'LABOR',
  MATERIALS = 'MATERIALS',
  EQUIPMENT = 'EQUIPMENT',
  SUBCONTRACTOR = 'SUBCONTRACTOR',
  OTHER = 'OTHER'
}

// Capacity Analytics
interface CapacitySnapshot {
  id: string;
  date: Date;
  division: Division;
  totalEmployees: number;
  availableHours: number;
  scheduledHours: number;
  utilizationPercentage: number;
  foremanCount: number;
  journeymanCount: number;
  apprenticeCount: number;
  projectCount: number;
  criticalProjects: string[]; // Project IDs needing attention
  generatedAt: Date;
}

interface LaborForecast {
  id: string;
  division: Division;
  forecastDate: Date;
  weekStarting: Date;
  requiredHours: number;
  availableHours: number;
  deficit: number;
  requiredForemen: number;
  requiredJourneymen: number;
  requiredApprentices: number;
  recommendations: string[];
  confidence: number; // 0-100
  generatedAt: Date;
}

// Integration & Sync
interface MondaySync {
  id: string;
  syncType: SyncType;
  status: SyncStatus;
  projectId?: string;
  boardId: string;
  itemsProcessed: number;
  itemsFailed: number;
  startedAt: Date;
  completedAt?: Date;
  errorLog?: string;
  triggeredBy: string;
}

enum SyncType {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  WEBHOOK = 'WEBHOOK'
}

enum SyncStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL'
}

// Alerts & Notifications
interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  projectId?: string;
  phaseId?: string;
  userId?: string;
  triggerValue?: number;
  threshold?: number;
  isRead: boolean;
  isResolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

enum AlertType {
  SCHEDULE_CONFLICT = 'SCHEDULE_CONFLICT',
  CAPACITY_WARNING = 'CAPACITY_WARNING',
  CASH_FLOW_ISSUE = 'CASH_FLOW_ISSUE',
  PROJECT_DELAY = 'PROJECT_DELAY',
  SYNC_FAILURE = 'SYNC_FAILURE',
  MISSING_FOREMAN = 'MISSING_FOREMAN',
  OVER_BUDGET = 'OVER_BUDGET'
}

enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Audit & History
interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId: string;
  changes: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SYNC = 'SYNC',
  EXPORT = 'EXPORT',
  LOGIN = 'LOGIN'
}
```

### API Specification

#### RESTful Endpoints

```yaml
# Authentication
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me

# Projects
GET    /api/projects
GET    /api/projects/:id
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id
GET    /api/projects/:id/phases
POST   /api/projects/:id/phases
GET    /api/projects/:id/schedule-values
POST   /api/projects/:id/schedule-values
GET    /api/projects/:id/expenses

# Project Phases
GET    /api/phases/:id
PUT    /api/phases/:id
DELETE /api/phases/:id
POST   /api/phases/:id/crew-assignments
GET    /api/phases/:id/crew-assignments

# Employees
GET    /api/employees
GET    /api/employees/:id
POST   /api/employees
PUT    /api/employees/:id
GET    /api/employees/:id/availability
GET    /api/employees/:id/assignments

# Capacity Management
GET    /api/capacity/current
GET    /api/capacity/forecast
GET    /api/capacity/utilization
POST   /api/capacity/simulate

# Cash Flow
GET    /api/cashflow/projection
GET    /api/cashflow/actuals
GET    /api/cashflow/variance

# Monday.com Integration
POST   /api/monday/sync
GET    /api/monday/sync-status/:id
POST   /api/monday/webhook
GET    /api/monday/boards
GET    /api/monday/items/:boardId

# Reports
GET    /api/reports/capacity
GET    /api/reports/projects
GET    /api/reports/financial
POST   /api/reports/generate
GET    /api/reports/download/:id

# Alerts
GET    /api/alerts
PUT    /api/alerts/:id/read
PUT    /api/alerts/:id/resolve

# File Upload
POST   /api/upload/template
GET    /api/upload/template-download
POST   /api/upload/process
```

### Security Architecture

#### Authentication & Authorization
- **Provider**: Auth0 with RBAC
- **Token Type**: JWT with refresh tokens
- **Session Duration**: 12 hours active, 7 days refresh
- **MFA**: Optional for managers, required for owners
- **API Rate Limiting**: 1000 requests/hour per user
- **CORS Policy**: Restricted to approved domains

#### Role-Based Access Control Matrix
```
| Feature                    | Owner | Manager | PM  | Foreman | Read-Only |
|---------------------------|-------|---------|-----|---------|-----------|
| View All Projects         | ✓     | ✓       | ✓   | Own     | ✓         |
| Create/Edit Projects      | ✓     | ✓       | ✓   | ✗       | ✗         |
| View Cash Flow            | ✓     | ✓       | ✗   | ✗       | ✗         |
| Manage Employees          | ✓     | ✓       | ✗   | ✗       | ✗         |
| Assign Crews              | ✓     | ✓       | ✓   | Own     | ✗         |
| Update Phase Progress     | ✓     | ✓       | ✓   | ✓       | ✗         |
| View Reports              | ✓     | ✓       | ✓   | Own     | Limited   |
| Export Data               | ✓     | ✓       | ✓   | ✗       | ✗         |
| System Configuration      | ✓     | ✗       | ✗   | ✗       | ✗         |
```

#### Data Encryption
- **At Rest**: AES-256 encryption for database
- **In Transit**: TLS 1.3 for all connections
- **File Storage**: Encrypted S3 buckets
- **Sensitive Fields**: Additional field-level encryption for financial data

### Integration Architecture

#### Monday.com Integration
```typescript
interface MondayIntegration {
  // Webhook handlers
  onItemUpdate(boardId: string, itemId: string, changes: any): Promise<void>;
  onItemCreate(boardId: string, item: any): Promise<void>;
  onColumnChange(boardId: string, columnId: string, value: any): Promise<void>;
  
  // Sync operations
  syncProject(projectId: string): Promise<SyncResult>;
  syncAllProjects(): Promise<SyncResult[]>;
  pushPhaseUpdate(phaseId: string): Promise<void>;
  
  // Mapping
  mapMondayToProject(mondayItem: any): Project;
  mapProjectToMonday(project: Project): any;
  mapPhaseToGroup(phase: ProjectPhase): any;
}

interface SyncConfiguration {
  autoSyncInterval: number; // milliseconds (default: 3 hours)
  webhooksEnabled: boolean;
  fieldMappings: {
    mondayField: string;
    systemField: string;
    transform?: (value: any) => any;
  }[];
  conflictResolution: 'monday_wins' | 'system_wins' | 'manual';
}
```

#### Excel Import/Export
```typescript
interface ExcelProcessor {
  // Import
  validateTemplate(file: Buffer): ValidationResult;
  parseProjectData(file: Buffer): ParsedProject;
  importPhases(projectId: string, data: any[]): Promise<ProjectPhase[]>;
  
  // Export
  generateTemplate(division: Division): Buffer;
  exportProject(projectId: string): Buffer;
  exportCapacityReport(params: ReportParams): Buffer;
  
  // Templates
  templates: {
    plumbing: ExcelTemplate;
    hvac: ExcelTemplate;
    capacity: ExcelTemplate;
    financial: ExcelTemplate;
  };
}
```

### Performance Requirements

#### Response Time SLAs
- **Page Load**: < 2 seconds (P95)
- **API Responses**: < 500ms (P95)
- **Search Queries**: < 1 second
- **Report Generation**: < 5 seconds
- **Excel Processing**: < 3 seconds for 50 rows
- **Monday Sync**: < 30 seconds per project

#### Scalability Targets
- **Concurrent Users**: 50 active
- **Projects**: 500 active, 2000 total
- **Phases**: 10,000 active
- **Historical Data**: 4 years retention
- **File Storage**: 100GB
- **API Calls**: 10,000/day

#### Caching Strategy
```typescript
interface CacheConfiguration {
  redis: {
    projectCache: 15 minutes;
    capacityCache: 5 minutes;
    userSession: 12 hours;
    reportCache: 1 hour;
  };
  cdn: {
    staticAssets: 30 days;
    images: 7 days;
  };
  database: {
    queryCache: 60 seconds;
    connectionPool: 20;
  };
}
```

### Monitoring & Analytics

#### Application Metrics
- **Error Rate**: Track 4xx/5xx responses
- **Latency**: P50, P95, P99 percentiles
- **Throughput**: Requests per second
- **Database**: Query performance, connection pool
- **Cache Hit Rate**: Redis and CDN effectiveness
- **Monday Sync**: Success rate, processing time

#### Business Metrics
- **User Engagement**: Daily/weekly active users
- **Feature Usage**: Heat maps, click tracking
- **Report Generation**: Frequency, types
- **Data Quality**: Validation failures, sync errors
- **Alert Effectiveness**: Response time, resolution rate

#### Error Handling
```typescript
interface ErrorHandler {
  logError(error: Error, context: any): void;
  notifyUser(error: Error, severity: 'info' | 'warning' | 'error'): void;
  retryOperation(operation: () => Promise<any>, maxRetries: number): Promise<any>;
  fallbackStrategy(error: Error): any;
  
  errorTypes: {
    VALIDATION_ERROR: 400;
    UNAUTHORIZED: 401;
    FORBIDDEN: 403;
    NOT_FOUND: 404;
    CONFLICT: 409;
    RATE_LIMITED: 429;
    SERVER_ERROR: 500;
    SYNC_FAILED: 503;
  };
}
```

### Mobile Optimization

#### Progressive Web App Configuration
```json
{
  "name": "Paris Mechanical Capacity Manager",
  "short_name": "Paris CM",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#1e40af",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "features": [
    "offline_mode",
    "push_notifications",
    "background_sync",
    "install_prompt"
  ]
}
```

#### Responsive Design Breakpoints
- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px - 1920px
- **Wide**: 1920px+

### Data Visualization Components

#### Chart Types
```typescript
interface ChartLibrary {
  // Capacity Views
  GanttChart: React.FC<{
    projects: Project[];
    zoom: 'day' | 'week' | 'month' | 'quarter' | 'year';
    showDependencies: boolean;
  }>;
  
  CapacityHeatmap: React.FC<{
    division: Division;
    period: DateRange;
    metric: 'hours' | 'percentage' | 'headcount';
  }>;
  
  ResourceTimeline: React.FC<{
    employees: Employee[];
    assignments: CrewAssignment[];
  }>;
  
  // Financial Views
  CashFlowProjection: React.FC<{
    projects: Project[];
    period: DateRange;
    showActuals: boolean;
  }>;
  
  BurndownChart: React.FC<{
    project: Project;
    metric: 'hours' | 'budget' | 'tasks';
  }>;
  
  // Analytics
  UtilizationTrend: React.FC<{
    historical: CapacitySnapshot[];
    forecast: LaborForecast[];
  }>;
}
```

### Deployment Architecture

#### Infrastructure
```yaml
Production:
  Frontend:
    Platform: Vercel
    Regions: US-West, US-East
    CDN: Cloudflare
    
  Backend:
    Platform: Railway
    Instances: 2 (auto-scaling to 5)
    Memory: 2GB per instance
    
  Database:
    Provider: Railway PostgreSQL
    Plan: Production (8GB RAM, 100GB storage)
    Backup: Daily automated, 30-day retention
    Read Replicas: 1
    
  Redis:
    Provider: Railway Redis
    Memory: 1GB
    Persistence: AOF every second
    
  Storage:
    Provider: AWS S3
    Bucket: paris-mechanical-prod
    Replication: Cross-region
    
Staging:
  - Identical stack at 50% capacity
  - Separate Monday.com sandbox
  
Development:
  - Local Docker Compose environment
  - Seed data generator
```

### Disaster Recovery

#### Backup Strategy
- **Database**: Automated daily backups, point-in-time recovery
- **Files**: S3 versioning, cross-region replication
- **Configuration**: Git-based infrastructure as code
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour

#### Incident Response
```typescript
interface IncidentResponse {
  severity: {
    P1: 'System down, affecting all users';
    P2: 'Major feature broken, affecting many users';
    P3: 'Minor feature broken, workaround available';
    P4: 'Cosmetic issue, no functional impact';
  };
  
  responseTime: {
    P1: '15 minutes';
    P2: '1 hour';
    P3: '4 hours';
    P4: 'Next business day';
  };
  
  escalation: {
    L1: 'On-call engineer';
    L2: 'Team lead + Product owner';
    L3: 'CTO + Executive team';
  };
}
```
