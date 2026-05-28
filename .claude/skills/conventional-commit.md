---
name: conventional-commit
description: Generate or validate a Conventional Commit message following the SpeedCubers Spain commit conventions. Use whenever the user is about to commit, asks "how should I phrase this commit?", shows a diff and wants a commit message, or writes a vague commit message like "updated stuff" or "fix". Trigger proactively when the user says "commit" or "git commit" in any context.
---

# Conventional Commit

Help the user write a commit message that follows the project's Conventional Commits standard.

## Format

```
<type>(<scope>): <subject>

<body — optional>

<footer — optional>
```

## Rules

**Subject line** (required):
- Max 50 characters
- Imperative mood: "implement", not "implemented" or "implements"
- No period at the end
- Lowercase first letter

**Body** (when the change isn't obvious):
- Max 72 chars per line
- Explain WHAT changed and WHY, not HOW
- Reference issues: `Closes #123` or `Related to #456`

**Types:**

| Type | Use for |
|------|---------|
| `feat` | New functionality |
| `fix` | Bug fix |
| `refactor` | Code change without behavior change |
| `test` | Adding or modifying tests |
| `docs` | Documentation only |
| `chore` | Deps, tooling, config |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |
| `style` | Formatting, no logic change |

**Backend scopes:** `auth`, `user`, `competencia`, `ranking`, `result`, `wca`, `cache`, `socket`, `db`, `middleware`, `validator`, `error`

## How to use this skill

If the user provides a diff or describes what they changed:
1. Identify the type and most appropriate scope from the list above
2. Draft a subject line (imperative, ≤50 chars)
3. Add a body if the change isn't self-explanatory
4. Show the full message ready to copy-paste

If the user provides a draft message for validation:
1. Check it against every rule above
2. Point out exactly what's wrong
3. Offer a corrected version

## Examples

**Good:**
```
feat(auth): implement JWT token refresh mechanism

- Add POST /auth/refresh endpoint
- Rotate refresh token on each use
- Set 7-day expiration on refresh tokens

Closes #42
```

```
fix(ranking): correct points calculation on DNF result

Points were being awarded even when the submitted result
was a DNF. Server-side validation now rejects DNF wins.

Fixes #89
```

## Forbidden

**Never include co-authorship lines from AI tools.** The following are strictly forbidden in any commit message:

```
Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: claude <...>
Co-Authored-By: Anthropic <...>
```

Commits in this repo are authored solely by the developer. Remove any such line before committing.

**Bad → corrected:**
- `"update auth code"` → `"refactor(auth): simplify token validation logic"`
- `"Fixed the timer."` → `"fix(result): correct server-side DNF validation"`
- `"wip"` → not a valid commit — finish the work or stash it
