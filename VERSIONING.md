# Versioning Guide

LEGAL MATTER uses semantic versioning (MAJOR.MINOR.PATCH) to track releases.

## Semantic Versioning

- **MAJOR** (X.0.0) - Breaking changes, incompatible API changes
- **MINOR** (0.X.0) - New features, backwards-compatible functionality
- **PATCH** (0.0.X) - Bug fixes, backwards-compatible fixes

## Automated Versioning via CI

The CI workflow automatically increments the version on every push to main:

- **Default**: PATCH version is incremented (0.1.0 → 0.1.1)
- **MINOR**: Include `[MINOR]` in commit message (0.1.0 → 0.2.0)
- **MAJOR**: Include `[MAJOR]` in commit message (0.1.0 → 1.0.0)

Examples:
```bash
git commit -m "Fix authentication bug"
# Results in patch increment: 0.1.0 → 0.1.1

git commit -m "[MINOR] Add new dashboard analytics"
# Results in minor increment: 0.1.0 → 0.2.0

git commit -m "[MAJOR] Redesign API endpoints"
# Results in major increment: 0.1.0 → 1.0.0
```

The CI workflow will:
1. Detect the version bump type from the commit message
2. Update VERSION file and all references
3. Create a git tag (e.g., v0.1.1)
4. Commit and push the changes with `[skip ci]` to prevent loops

## Manual Version Updates (Optional)

If you need to manually update the version without CI:

```bash
cd backend

# For bug fixes
npm run version:patch    # 0.1.0 -> 0.1.1

# For new features
npm run version:minor    # 0.1.0 -> 0.2.0

# For breaking changes
npm run version:major    # 0.1.0 -> 1.0.0
```

Then commit and push:
```bash
git add -A
git commit -m "Release version X.Y.Z [skip ci]"
git tag vX.Y.Z
git push && git push --tags
```

## What Gets Updated

The version script automatically updates:

1. `VERSION` file in project root
2. `backend/package.json` version field
3. `README.md` header banner
4. `frontend/app.js` display version

## Current Version

The current version is always stored in the `VERSION` file at the project root.

## Manual Updates

If you need to manually set a specific version:

```bash
echo "1.2.3" > VERSION
node backend/scripts/update-version.js patch  # Updates all files to match
```
