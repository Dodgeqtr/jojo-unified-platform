# GitHub Copilot Instructions for Jojo Unified Platform

## 🛠️ Development Commands

### Installation
```bash
npm install
```

### Development
```bash
npm run dev          # Runs all services (web, n8n-service, crm-service, operations-service)
```

### Testing
```bash
npm test             # Runs unit tests across all workspaces
npm run test:integration   # Integration tests (if configured)
npm run test:e2e   # End-to-end tests (if configured)
```

### Building
```bash
npm run build        # Builds all packages
```

### Linting & Formatting
```bash
npm run lint         # ESLint check
npm run format       # Prettier formatting (if available)
```

### Database Operations
```bash
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed initial data
```

### Docker (for full stack)
```bash
docker-compose up -d   # Start all services (PostgreSQL, Redis, etc.)
docker-compose down    # Stop all services
```

### Health Checks
```bash
curl http://localhost:3000/health   # API Gateway
curl http://localhost:3001/health   # CRM Service
curl http://localhost:3002/health   # n8n Service
```

## 🏗️ High-Level Architecture

### Monorepo Structure
- **packages/api/** - Backend services (n8n-service, crm-service, operations-service, shared)
- **packages/web/** - Frontend React application
- **database/** - Database schema, migrations, seeds
- **docs/** - Comprehensive documentation
- **.github/** - CI/CD workflows and Copilot instructions

### Layered Architecture (from ARCHITECTURE.md)
1. **Presentation Layer** - React + shadcn/ui + TailwindCSS (Web frontend)
2. **API Gateway & Orchestration** - tRPC/REST endpoints (Operations Service acts as main hub)
3. **Business Logic Layer** - Three microservices:
   - **n8n-service**: Automation & workflow management
   - **crm-service**: Contact, deal, and property management
   - **operations-service**: Monitoring, orchestration, user management
4. **Data Access Layer** - PostgreSQL (primary) + Redis (caching) + External APIs

### Service Responsibilities
- **n8n-service**: Workflow execution, credential management, webhook handling
- **crm-service**: Contact/property/deal management, team organization
- **operations-service**: Health monitoring, resource management, audit logging, service orchestration

### Data Flow Pattern
Web Frontend → API Gateway (Operations Service) → [CRM/n8n/Other Services] → Database/Cache ↔ External Services

### Key Integrations
- Authentication: OAuth 2.0 (Google/GitHub) + JWT + RBAC
- External: GitHub, Google Drive, Gmail, HeyGen, Notion
- Infrastructure: Docker Compose for local development, GitHub Actions for CI/CD

## 🔑 Key Conventions

### TypeScript & Code Style
- Strict TypeScript enforcement across all packages
- ESLint + Prettier for code quality
- Path aliases configured via tsconfig (use `@jojo/*` for package imports)
- Atomic commits with conventional messages

### Backend Services (Node.js/Express)
- Service entry point: `src/index.ts`
- Environment variables loaded from `.env.local`
- Health check endpoint: `GET /health`
- Error handling: Consistent API response format
- Logging: Winston or similar (check individual service implementations)

### Frontend (React/Vite)
- React 18 + TypeScript
- State management: React Query (tanstack-query)
- UI Library: shadcn/ui primitives
- Styling: TailwindCSS
- API communication: tRPC (ensure typesafety between frontend/backend)
- Component organization: `src/modules/` (feature-based), `src/shared/` (reusable components)

### Database
- PostgreSQL schema managed via SQL migrations in `database/migrations/`
- Seed data in `database/seeds/`
- Unified schema covering users, organizations, workflows, contacts, properties, services, audit logs, notifications
- UUID primary keys for all entities

### Testing Conventions
- Unit tests: Vitest (for web) and appropriate test runners for backend services
- Test files placed alongside source files (`*.test.ts`)
- Mock external services in tests
- Integration tests verify service interactions

### Version Control
- Branch strategy: `main` (production), `develop` (staging), feature branches
- Pull requests required for all changes
- Conventional commit messages (feat, fix, docs, etc.)
- CI/CD pipeline runs on push to main/develop and pull requests

### Environment Management
- `.env.example` template provided
- Local development uses `.env.local` (gitignored)
- Docker Compose defines service dependencies and network
- Separate environment variables for each service where needed

## 📚 Documentation References
- **Architecture Deep Dive**: `ARCHITECTURE.md`
- **Getting Started**: `GET_STARTED.md`
- **API Endpoints**: See ARCHITECTURE.md section 6.1
- **Database Schema**: `database/schema.sql`
- **Deployment Guide**: `docs/DEPLOYMENT.md`
- **Contributing**: `CONTRIBUTING.md` (if exists)
