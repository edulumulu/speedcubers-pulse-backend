---
name: new-branch
description: Create a new git branch following the SpeedCubers Spain GitFlow conventions. Use this skill whenever the user wants to start working on a new feature, bug fix, refactor, or docs change — even if they just say "let's start on X" or "I want to implement the auth system". Trigger proactively when the user is about to start coding something new.
---

# New Branch

Create a new branch following the project's GitFlow conventions and get the user ready to commit.

## Branch naming

Format: `<type>/<short-description-in-kebab-case>`

| Type | When to use |
|------|-------------|
| `feature/` | New functionality (a new RF from the spec) |
| `fix/` | Bug fix |
| `refactor/` | Code restructure without behavior change |
| `docs/` | Documentation only |

Examples: `feature/auth-jwt-implementation`, `fix/ranking-dnf-points`, `refactor/user-repository`, `docs/api-swagger`

## Steps

1. Ask the user what they're working on if not clear from context.
2. Suggest a branch name based on the type and description. Let the user confirm or adjust.
3. Run:

```bash
git checkout develop
git pull origin develop
git checkout -b <type>/<description>
```

4. Confirm the branch was created and remind the user of the commit format for this type of work.

## Commit format reminder

Once on the branch, commits must follow Conventional Commits:

```
<type>(<scope>): <subject>
```

- Subject: imperative mood, max 50 chars, no period, lowercase
- Backend scopes: `auth`, `user`, `competencia`, `ranking`, `result`, `wca`, `cache`, `socket`, `db`, `middleware`

Good: `feat(auth): implement JWT token refresh mechanism`
Bad: `updated auth code`

PRs always target `develop`, never `main` directly.
