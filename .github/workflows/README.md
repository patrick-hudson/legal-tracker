# GitHub Actions CI/CD

This directory contains GitHub Actions workflows for continuous integration.

## Workflows

### CI Workflow (ci.yml)

Runs on every push and pull request to `main`/`master` branches.

**Jobs:**

1. **Test** - Runs on multiple Node.js versions (18.x, 20.x, 22.x)
   - Installs dependencies
   - Runs linter (if configured)
   - Runs unit tests
   - Checks build (if configured)

2. **Lint Frontend** - Validates frontend files exist
   - Checks for `index.html`
   - Checks for `app.js`

## Status Badge

Add this to your README.md to show build status:

```markdown
![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/CI/badge.svg)
```

## Running Tests Locally

Before pushing code, run tests locally:

```bash
cd backend
npm test
```

## Adding More Tests

Tests should be added to `backend/test/`:
- Unit tests: Test individual functions and logic
- Integration tests: Test API endpoints (requires server refactoring)

See [backend/test/README.md](../../backend/test/README.md) for details.
