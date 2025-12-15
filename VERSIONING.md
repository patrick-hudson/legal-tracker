# Versioning Guide

LEGAL MATTER uses semantic versioning (MAJOR.MINOR.PATCH) to track releases.

## Semantic Versioning

- **MAJOR** (X.0.0) - Breaking changes, incompatible API changes
- **MINOR** (0.X.0) - New features, backwards-compatible functionality
- **PATCH** (0.0.X) - Bug fixes, backwards-compatible fixes

## How to Update Version

Use the npm scripts to update version numbers across all files automatically:

```bash
cd backend

# For bug fixes
npm run version:patch    # 0.1.0 -> 0.1.1

# For new features
npm run version:minor    # 0.1.0 -> 0.2.0

# For breaking changes
npm run version:major    # 0.1.0 -> 1.0.0
```

## What Gets Updated

The version script automatically updates:

1. `VERSION` file in project root
2. `backend/package.json` version field
3. `README.md` header banner
4. `frontend/app.js` display version

## Release Process

1. Make your changes and test thoroughly
2. Update version based on change type:
   ```bash
   npm run version:patch  # or minor/major
   ```
3. Review the changes
4. Commit and tag:
   ```bash
   git add -A
   git commit -m "Release version X.Y.Z"
   git tag vX.Y.Z
   git push && git push --tags
   ```

## Current Version

The current version is always stored in the `VERSION` file at the project root.

## Manual Updates

If you need to manually set a specific version:

```bash
echo "1.2.3" > VERSION
node backend/scripts/update-version.js patch  # Updates all files to match
```
