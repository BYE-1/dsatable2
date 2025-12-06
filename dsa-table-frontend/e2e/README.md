# Playwright E2E Tests

This directory contains end-to-end tests for the DSA Table frontend application using Playwright.

## Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test e2e/auth.spec.ts
```

### Run tests in specific browser
```bash
npx playwright test --project=chromium
```

## Test Structure

- `auth.spec.ts` - Authentication tests (login, register)
- `character-list.spec.ts` - Character list and management tests
- `chat.spec.ts` - Chat component tests
- `game-session.spec.ts` - Game session CRUD tests
- `character-image.spec.ts` - Character image generation API tests

## Configuration

The Playwright configuration is in `playwright.config.ts` at the project root. It:
- Starts the Angular dev server automatically before tests
- Runs tests on Chromium, Firefox, and WebKit
- Generates HTML reports on failure
- Takes screenshots on failure

## Notes

- Tests assume the backend is running on `http://localhost:8080`
- Some tests may skip if authentication is required and not available
- Tests are designed to be resilient to missing data (e.g., no characters/sessions)

## CI/CD

For CI environments, set the `CI` environment variable:
```bash
CI=true npm run test:e2e
```

This will:
- Retry failed tests twice
- Run tests serially (one at a time)
- Use existing server if available
