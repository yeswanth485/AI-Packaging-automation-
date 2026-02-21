# AI Packaging Optimizer

Production-grade B2B SaaS platform for logistics cost optimization targeting D2C brands, Shopify sellers, and 3PL operators.

## Features

- Intelligent box selection using best-fit algorithm
- Volumetric and billable weight calculations
- CSV-based simulation mode for lead generation
- Live optimization API for real-time integration
- Comprehensive analytics and ROI reporting
- Multi-tier subscription management with quota enforcement
- Property-based testing for algorithm correctness

## Tech Stack

- **Backend**: Node.js 18+, Express.js, TypeScript
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache**: Redis 7+
- **Testing**: Jest, fast-check (property-based testing)
- **Code Quality**: ESLint, Prettier, TypeScript strict mode

## Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

## Quick Start

### 1. Clone and Install

```bash
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Infrastructure with Docker

```bash
npm run docker:up
```

This starts PostgreSQL and Redis containers.

### 4. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio
npm run prisma:studio
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start on http://localhost:3000

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run lint` - Lint code
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services

## Project Structure

```
.
├── src/
│   ├── config/          # Configuration files (database, redis)
│   ├── middleware/      # Express middleware
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── index.ts         # Application entry point
├── prisma/
│   └── schema.prisma    # Database schema
├── logs/                # Application logs
├── uploads/             # Temporary file uploads
└── docker-compose.yml   # Docker services configuration
```

## Testing

### Unit Tests

```bash
npm test
```

### Property-Based Tests

Property-based tests use fast-check to verify algorithmic correctness across thousands of generated inputs.

```bash
npm test -- --testPathPattern=property
```

### Coverage

```bash
npm run test:coverage
```

Target: 85% coverage for all metrics.

## Docker Deployment

### Development

```bash
docker-compose up
```

### Production

```bash
docker build -t packaging-optimizer .
docker run -p 3000:3000 --env-file .env packaging-optimizer
```

## API Documentation

API documentation will be available at `/api/docs` once implemented.

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST` - Redis host
- `JWT_SECRET` - Secret for JWT token signing
- `PORT` - Server port (default: 3000)

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens with short expiration (15 min access, 7 days refresh)
- Rate limiting (100 req/min per user)
- Input validation and sanitization
- TLS/SSL for production deployments

## Performance

- Single order optimization: < 100ms
- Batch of 1000 orders: < 30 seconds
- API response time: < 200ms
- Analytics queries: < 500ms

## License

MIT
