---
name: phase-status
description: Show the current backend development phase status, including completed tasks, pending tasks, and next steps. Use when the user asks "where are we?", "what's next?", "what phase are we in?", or when starting a new work session. Also trigger when the user mentions a phase number or says things like "let's start phase 2" or "what's left in this phase".
---

# Phase Status

Give the user a clear picture of where the backend is in the 8-week MVP plan.

## How to determine the current phase

1. If the user specifies a phase number, use that.
2. Otherwise, inspect `src/` to check which files exist against the phase deliverables below.
3. Cross-reference with `git log --oneline -20` to see recent work.

## Backend phase map

| Phase | Name | Key backend deliverables |
|-------|------|--------------------------|
| 0 | Setup | Project structure, Docker, ESLint, README |
| 1 | Auth | User model, AuthService, JWT endpoints, Joi validators, auth middleware |
| 2 | Profiles | GET/PATCH /users endpoints, WCA profile linkage |
| 3 | Ranking | Ranking table, RankingService, Redis cache, stats endpoint |
| 4 | Video | CompetenciaService, room creation, Agora token generation, Socket.io setup |
| 5 | Timing | Resultado table, result validation endpoint, DNF/penalty logic |
| 6 | Presence | Socket.io presence handlers, heartbeat, online users endpoint |
| 7 | Polish | E2E tests, Swagger docs, DB query optimization, security audit |
| 8 | Deploy | Railway/Render config, GitHub Actions CI/CD, env setup |

## What to show

```
## Phase <N>: <Name>

### Completed ✅
- [x] ...

### Pending ⏳
- [ ] ...

### Expected commits for this phase
feat(auth): ...
test(auth): ...

### Next phase: <N+1> — <Name>
First tasks: ...
```

Keep it scannable. List backend tasks only (this is the backend repo). Flag anything risky — e.g. Phase 4 Agora.io token generation is medium risk; Phase 6 Socket.io presence needs load testing.

After showing the status, suggest the next concrete action the user should take.
