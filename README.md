⚠️ ARCHIVED: This repository has been archived. Its functionality has been consolidated into the merge-bot repository.

# Overview
A GitHub action that reports a failure if a PR's base branch doesn't match that of the issue's milestone.

### Prerequisites
1. There must be an issue number in a commit message, PR Title, or branch name
2. Each release branch must have a workflow scoped to only it's branch, and it must specify the corresponding milestone

#### Example usage
```yaml
on:
  pull_request:
    types: [opened]
    branches: [sp]
jobs:
  branch-checker:
    runs-on: ubuntu-latest
    steps:
      - uses: SpiderStrategies/gh-action-branch-checker@master
        with:
          milestoneNumber: 1
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

## Development

### Making Changes

When making changes to this GitHub Action:

1. **Edit the source files**:
   - `branch-checker-action.js` - Main action logic
   - `index.js` - Entry point
   - `test/branch-checker-action-test.js` - Tests

2. **Run tests**:
   ```bash
   npm test
   ```

3. **Build the distribution**:
   ```bash
   npm run build
   ```
   This compiles the source files into `dist/index.js` which is what GitHub Actions actually uses.

4. **Commit and push**:
   ```bash
   git add -A
   git commit -m "Your commit message"
   git push
   ```

### Important Notes

- **Always rebuild after changes**: The `dist/index.js` file must be rebuilt and committed for changes to take effect in GitHub Actions
- **Test locally first**: Run `npm test` to ensure your changes don't break existing functionality
- **The action uses the compiled code**: GitHub Actions runs `dist/index.js`, not the source files directly
