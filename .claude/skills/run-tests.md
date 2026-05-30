---
name: run-tests
description: Run backend tests for SpeedCubers Spain with the correct setup. Use when the user wants to run tests, check coverage, debug a failing test, or run tests before merging. Trigger when the user says "run tests", "check tests", "test this", "does this pass?", or "coverage".
---

# Run Tests

Run the appropriate test suite with the correct environment and database setup.

## Test database requirement

Integration tests require a running PostgreSQL instance pointed at `speedcubers_test` (see `.env.test`). Before running integration tests:

```bash
# Ensure the test DB exists
createdb speedcubers_test 2>/dev/null || echo "already exists"

# Apply migrations to test DB
NODE_ENV=test npm run db:migrate
```

## Commands

```bash
# All tests
npm test

# Unit tests only (no DB needed)
npm run test:unit

# Integration tests only (requires DB)
npm run test:integration

# Coverage report
npm run test:coverage

# Watch mode (unit only)
npm run test:watch

# Single file
npx jest tests/unit/services/AuthService.test.js
npx jest tests/integration/auth.integration.test.js

# Pattern match
npx jest --testPathPattern="auth"
```

## When a test fails

1. Read the error output carefully — Jest shows the diff for assertion failures
2. For integration tests, check that the test DB is running and migrated
3. Run the specific file in isolation before running the full suite
4. Check if `beforeEach` TRUNCATE is missing (causes state leak between tests)

## Coverage targets

| Layer | Target |
|-------|--------|
| Global | >80% |
| `auth` domain | >95% |
| `competencia` domain | >95% |
| Infrastructure | >70% |

If coverage drops below target, identify the uncovered lines in the report and add tests before committing.

## Integration test pattern (reference)

```js
const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/infrastructure/database');

beforeEach(async () => {
  await sequelize.query('TRUNCATE users, competitions, results CASCADE');
});

afterAll(async () => {
  await sequelize.close();
});
```
