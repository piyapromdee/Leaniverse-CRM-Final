# Playwright Test Suite

This directory contains comprehensive end-to-end tests for the LeaniOS SaaS application using Playwright.

## Test Structure

```
tests/
├── auth/                          # Authentication tests
│   ├── sign-up.spec.ts           # User registration flow
│   ├── sign-in.spec.ts           # User login flow
│   ├── password-recovery.spec.ts  # Password reset functionality
│   └── middleware-protection.spec.ts # Route protection
├── admin/                         # Admin functionality tests
│   ├── user-management.spec.ts    # User CRUD operations
│   └── stripe-integration.spec.ts # Stripe admin features
├── security/                      # Security tests
│   ├── disabled-user-protection.spec.ts # Disabled user blocking
│   └── role-based-access.spec.ts # Role permissions
└── helpers/
    └── test-utils.ts             # Test utilities and helpers
```

## Running Tests

### Prerequisites
1. Ensure the development server is running on `http://localhost:3000`
2. Set up test environment variables in `.env.local`
3. Have test database configured

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests in headed mode (visible browser)
npm run test:headed

# Debug tests step by step
npm run test:debug

# Run specific test file
npx playwright test tests/auth/sign-in.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium

# Run tests matching pattern
npx playwright test --grep "sign in"
```

## Test Categories

### 🔐 Authentication Tests
- **Sign Up Flow**: Registration validation, email confirmation, error handling
- **Sign In Flow**: Login validation, credential checks, session management
- **Password Recovery**: Forgot password and reset flows
- **Middleware Protection**: Route access control for authenticated/unauthenticated users

### 👑 Admin Functionality Tests
- **User Management**: CRUD operations, role changes, user status management
- **Stripe Integration**: Payment setup, product management, webhook configuration

### 🛡️ Security Tests
- **Disabled User Protection**: Preventing access for disabled accounts
- **Role-Based Access**: User vs admin permission enforcement
- **API Security**: Endpoint protection and authorization

## Test Data

### Test Users
The test suite uses predefined test users:

```typescript
TEST_USERS = {
  REGULAR: { email: 'test.user@example.com', password: 'test123456' },
  ADMIN: { email: 'admin.test@example.com', password: 'admin123456' },
  DISABLED: { email: 'disabled.user@example.com', password: 'disabled123456' }
}
```

### Test Database
- Tests use isolated test users that are created and cleaned up automatically
- Database operations use Supabase service role for setup/teardown
- Tests should not interfere with production data

## Test Utilities

### Helper Functions
- `signInUser(page, email, password)` - Automate user login
- `signOutUser(page)` - Automate user logout  
- `expectToBeOnPage(page, path)` - Assert page navigation
- `createTestUser(type, isAdmin, isDisabled)` - Create test users
- `cleanupTestUsers()` - Remove test data

### Custom Test Extension
Tests use extended Playwright test with automatic cleanup:
```typescript
import { test, expect } from '../helpers/test-utils'
```

## Configuration

### Playwright Config
- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, Webkit, Mobile Chrome, Mobile Safari
- **Retries**: 2 on CI, 0 locally
- **Parallel**: Enabled for speed
- **Traces**: On first retry for debugging

### Environment Setup
Tests require these environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Best Practices

### Test Writing Guidelines
1. **Use descriptive test names** that explain what is being tested
2. **Test user workflows** end-to-end, not just individual functions
3. **Handle async operations** properly with appropriate waits
4. **Clean up test data** to avoid interference between tests
5. **Use data-testid attributes** for reliable element selection

### Debugging Tests
1. **Run with `--headed`** to see browser actions
2. **Use `--debug`** to step through tests
3. **Add `page.pause()`** to pause execution
4. **Check traces** in test results for failure analysis
5. **Use browser dev tools** with `--headed --debug`

### Performance Tips
1. **Run tests in parallel** when possible
2. **Use `page.goto('/')` sparingly** - prefer navigation within tests
3. **Reuse browser contexts** for related tests
4. **Mock external APIs** when not testing integrations

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Install Playwright
  run: npm install && npx playwright install

- name: Run Playwright tests
  run: npm test
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

### Test Reports
- HTML reports generated automatically
- Screenshots captured on failures
- Traces available for debugging failed tests
- Test results include timing and browser information

## Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure dev server runs on port 3000
2. **Auth failures**: Check test user credentials and database state
3. **Timeout errors**: Increase timeouts for slow operations
4. **Element not found**: Verify selectors and wait conditions
5. **Database state**: Ensure test database is properly seeded

### Debugging Commands
```bash
# Show test output
npx playwright test --reporter=list

# Generate and view HTML report
npx playwright show-report

# Run single test with debug
npx playwright test tests/auth/sign-in.spec.ts --debug

# Record new test
npx playwright codegen localhost:3000
```

## Contributing

When adding new tests:
1. Follow existing naming conventions
2. Add appropriate test data cleanup
3. Update this README if adding new test categories
4. Ensure tests work in all configured browsers
5. Add appropriate assertions and error handling