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
  milestone-checker:
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/actions/milestone-checker
        with:
          milestoneNumber: 1
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```
