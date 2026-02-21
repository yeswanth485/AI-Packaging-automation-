# Setup Guide

This guide will help you set up the AI Packaging Optimizer development environment.

## Prerequisites

Ensure you have the following installed:

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Docker** 20.10.0 or higher
- **Docker Compose** 2.0.0 or higher

Verify installations:

```bash
node --version
npm --version
docker --version
docker-compose --version
```

## Setup Steps

### Option 1: Automated Setup (Recommended)

Run the setup script:

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This will:
1. Create `.env` file from template
2. Install npm dependencies
3. Start Docker services (PostgreSQL, Redis)
4. Generate Prisma client
5. Run database migrations

### Option 2: Manual Setup

#### 1. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` and update the following variables:
- `JWT_SECRET` - Use a strong random string
- `SESSION_SECRET` - Use a strong random string
- Other variables as needed

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Start Infrastructure Services

```bash
docker-compose up -d postgres redis
```

Verify services are running:

```bash
docker-compose ps
```

You should see `postgres` and `redis` containers running.

#### 4. Database Setup

Generate Prisma client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate
```

When prompted for migration name, use: `init`

#### 5. Verify Setup

Run tests:

```bash
npm test
```

Start development server:

```bash
npm run dev
```

Visit http://localhost:3000/health - you should see:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Troubleshooting

### Port Already in Use

If port 3000, 5432, or 6379 is already in use:

1. Stop conflicting services
2. Or update ports in `.env` and `docker-compose.yml`

### Database Connection Failed

1. Ensure PostgreSQL container is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify `DATABASE_URL` in `.env` matches container configuration

### Redis Connection Failed

1. Ensure Redis container is running:
   ```bash
   docker-compose ps redis
   ```

2. Check logs:
   ```bash
   docker-compose logs redis
   ```

3. Verify `REDIS_HOST` and `REDIS_PORT` in `.env`

### Prisma Client Not Generated

Run:

```bash
npm run prisma:generate
```

If errors persist, delete `node_modules/.prisma` and regenerate:

```bash
rm -rf node_modules/.prisma
npm run prisma:generate
```

### TypeScript Compilation Errors

Ensure TypeScript is installed:

```bash
npm install -D typescript
```

Check `tsconfig.json` is present and valid.

## Development Workflow

### Starting Development

```bash
# Start infrastructure
npm run docker:up

# Start development server (with hot reload)
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Database Management

```bash
# Open Prisma Studio (GUI for database)
npm run prisma:studio

# Create new migration
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Stopping Services

```bash
# Stop Docker services
npm run docker:down

# Stop development server
# Press Ctrl+C in terminal
```

## Next Steps

After successful setup:

1. Review the [README.md](README.md) for project overview
2. Check the [API documentation](docs/API.md) (when available)
3. Review the [architecture documentation](.kiro/specs/ai-packaging-optimizer/design.md)
4. Start implementing features according to the task list

## Getting Help

If you encounter issues:

1. Check this troubleshooting guide
2. Review logs in `logs/` directory
3. Check Docker container logs: `docker-compose logs`
4. Verify all prerequisites are installed correctly
