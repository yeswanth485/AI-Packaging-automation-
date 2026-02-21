# End-to-End Testing Guide

## Overview

This directory contains end-to-end tests for the AI Packaging Optimizer platform. These tests validate complete user journeys from frontend to backend.

## Setup

### Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### Environment Setup

Ensure both backend and frontend are running:

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
cd frontend && npm run dev
```

## Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run tests in UI mode
npx playwright test --ui

# Run specific test file
npx playwright test e2e/user-journey.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Generate test report
npx playwright show-report
```

## Test Structure

### 1. User Journey Tests (`user-journey.spec.ts`)
- Complete registration → login → upload CSV → view results flow
- Tests the primary user workflow

### 2. Subscription Flow Tests (`subscription-flow.spec.ts`)
- Subscription upgrade → API key generation → API call flow
- Tests subscription management and API integration

### 3. Admin Flow Tests (`admin-flow.spec.ts`)
- Box catalog management (CRUD operations)
- Admin dashboard access and functionality

### 4. Analytics Tests (`analytics.spec.ts`)
- Dashboard interaction and data visualization
- Chart rendering and data accuracy

## Test Data

Test data is located in `e2e/fixtures/`:
- `sample-orders.csv` - Sample CSV file for simulation testing
- `test-users.json` - Test user credentials
- `test-boxes.json` - Sample box catalog data

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Tests should clean up created data
3. **Assertions**: Use meaningful assertions with clear error messages
4. **Waits**: Use proper waits for async operations
5. **Selectors**: Use data-testid attributes for stable selectors

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Merges to main branch
- Nightly builds

## Troubleshooting

### Tests Failing Locally

1. Ensure backend is running on port 3000
2. Ensure frontend is running on port 3001
3. Check database is accessible
4. Clear browser cache: `npx playwright clean`

### Flaky Tests

- Increase timeout for slow operations
- Add explicit waits for dynamic content
- Check network conditions

## Writing New Tests

Example test structure:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
    await page.goto('http://localhost:3001');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    // Act
    // Assert
  });
});
```
