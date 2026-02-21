# Architecture Overview

## Project Structure

```
ai-packaging-optimizer/
├── .kiro/                      # Kiro specifications
│   └── specs/
│       └── ai-packaging-optimizer/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
├── prisma/                     # Database schema and migrations
│   ├── schema.prisma          # Prisma schema definition
│   └── migrations/            # Database migrations
├── src/                       # Source code
│   ├── config/               # Configuration files
│   │   ├── database.ts       # Prisma client setup
│   │   └── redis.ts          # Redis client setup
│   ├── middleware/           # Express middleware
│   │   └── errorHandler.ts  # Global error handling
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts          # Shared types and interfaces
│   ├── utils/                # Utility functions
│   │   ├── logger.ts         # Winston logger setup
│   │   └── __tests__/        # Utility tests
│   └── index.ts              # Application entry point
├── logs/                      # Application logs
├── uploads/                   # Temporary file uploads
├── scripts/                   # Setup and utility scripts
│   └── setup.sh              # Automated setup script
├── .env.example              # Environment variables template
├── .eslintrc.json            # ESLint configuration
├── .prettierrc               # Prettier configuration
├── .gitignore                # Git ignore rules
├── docker-compose.yml        # Docker services configuration
├── Dockerfile                # Docker image definition
├── jest.config.js            # Jest testing configuration
├── package.json              # Node.js dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── README.md                 # Project overview
├── SETUP.md                  # Setup instructions
└── ARCHITECTURE.md           # This file

```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript with strict mode
- **ORM**: Prisma
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+

### Testing
- **Unit Tests**: Jest
- **Property-Based Tests**: fast-check
- **Coverage Target**: 85%

### Code Quality
- **Linting**: ESLint with TypeScript plugin
- **Formatting**: Prettier
- **Type Checking**: TypeScript strict mode

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Process Management**: PM2 (production)
- **Logging**: Winston

## Architecture Patterns

### Three-Tier Architecture

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (API Routes, Controllers, Middleware)  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Business Logic Layer           │
│    (Services, Algorithms, Validators)   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           Data Access Layer             │
│     (Prisma ORM, Redis, Repositories)   │
└─────────────────────────────────────────┘
```

### Key Components (To Be Implemented)

1. **Authentication Service**
   - User registration and login
   - JWT token management
   - API key generation and validation

2. **Packing Engine**
   - Core optimization algorithm
   - Box selection logic
   - Weight calculations

3. **Simulation Service**
   - CSV parsing and validation
   - Batch processing
   - Report generation

4. **Analytics Service**
   - KPI calculations
   - Trend analysis
   - Forecasting

5. **Subscription Service**
   - Tier management
   - Quota enforcement
   - Usage tracking

## Database Schema

### Core Entities

- **User**: Authentication and profile
- **Subscription**: Tier and quota management
- **Box**: Catalog of available boxes
- **Order**: Packing orders and results
- **Item**: Individual items in orders
- **SimulationJob**: Batch processing jobs
- **Simulation**: Simulation results and metrics
- **Configuration**: User-specific settings
- **UsageRecord**: Usage tracking for billing
- **Invoice**: Billing records

### Relationships

```
User 1──1 Subscription
User 1──* Order
User 1──* SimulationJob
User 1──* UsageRecord
User 1──1 Configuration

Order *──1 Box
Order 1──* Item
Order *──1 SimulationJob

SimulationJob 1──* Simulation
Subscription 1──* Invoice
```

## Configuration Management

### Environment Variables

All configuration is managed through environment variables:

- **Application**: PORT, NODE_ENV, API_VERSION
- **Database**: DATABASE_URL
- **Redis**: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- **Security**: JWT_SECRET, SESSION_SECRET, BCRYPT_ROUNDS
- **Features**: Buffer padding, volumetric divisor, shipping rates
- **Limits**: File size, timeouts, rate limits

### Configuration Hierarchy

1. Environment variables (highest priority)
2. `.env` file
3. Default values in code (lowest priority)

## Security Considerations

### Authentication & Authorization
- Bcrypt password hashing (cost factor 12)
- JWT tokens (15 min access, 7 days refresh)
- API key authentication for programmatic access
- Role-based access control (RBAC)

### Data Protection
- Input validation with Joi
- SQL injection prevention via Prisma
- XSS protection via Helmet
- CORS configuration
- Rate limiting (100 req/min per user)

### File Upload Security
- File type validation
- Size limits (50 MB max)
- Temporary storage with cleanup
- Malware scanning (to be implemented)

## Performance Optimization

### Caching Strategy
- Redis for session storage
- Box catalog caching
- Query result caching for analytics

### Database Optimization
- Indexes on frequently queried fields
- Connection pooling
- Query optimization
- Pagination for large result sets

### API Performance
- Response compression
- Efficient algorithms (O(n log n) sorting)
- Batch processing for large datasets
- Streaming for large file uploads

## Testing Strategy

### Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Focus on business logic
- Target: 85% coverage

### Property-Based Tests
- Verify algorithmic correctness
- Test with generated inputs
- Ensure invariants hold
- Use fast-check library

### Integration Tests
- Test API endpoints
- Test database operations
- Test external service integration
- Use test database

### End-to-End Tests
- Test complete user workflows
- Test critical paths
- Use realistic data

## Deployment

### Development
```bash
docker-compose up
npm run dev
```

### Production
```bash
docker build -t packaging-optimizer .
docker run -p 3000:3000 --env-file .env packaging-optimizer
```

### CI/CD Pipeline (To Be Implemented)
1. Lint and format check
2. Type checking
3. Unit tests
4. Integration tests
5. Build Docker image
6. Deploy to staging
7. Run E2E tests
8. Deploy to production

## Monitoring & Logging

### Logging
- Winston for structured logging
- Log levels: error, warn, info, debug
- Separate files for errors and combined logs
- Console output in development

### Metrics (To Be Implemented)
- Request rate and latency
- Error rates
- Database query performance
- Cache hit rates
- Queue lengths

### Alerting (To Be Implemented)
- Error rate thresholds
- Response time degradation
- Database connection failures
- Queue backlog

## Future Enhancements

### Phase 2
- Frontend dashboard (React/Next.js)
- Real-time notifications (WebSockets)
- Advanced analytics (ML-based forecasting)
- Multi-warehouse support

### Phase 3
- Shopify integration
- Courier API integration
- Mobile app
- White-label solution

## Development Guidelines

### Code Style
- Follow TypeScript best practices
- Use ESLint and Prettier
- Write self-documenting code
- Add comments for complex logic

### Git Workflow
- Feature branches from main
- Descriptive commit messages
- Pull requests for review
- Squash merge to main

### Documentation
- Update README for user-facing changes
- Update ARCHITECTURE for structural changes
- Document API endpoints
- Add inline comments for complex logic

## Resources

- [Requirements Document](.kiro/specs/ai-packaging-optimizer/requirements.md)
- [Design Document](.kiro/specs/ai-packaging-optimizer/design.md)
- [Task List](.kiro/specs/ai-packaging-optimizer/tasks.md)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
