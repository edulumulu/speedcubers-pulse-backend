---
name: security-check
description: Audit backend code against the SpeedCubers Spain security requirements (OWASP top 10, project-specific rules). Use when the user asks to review code for security, before merging a PR, or when implementing auth, database queries, API endpoints, or user input handling. Also trigger proactively when the user shows code that deals with passwords, tokens, SQL queries, or user-submitted data — even if they didn't ask for a security review.
---

# Security Check

Audit backend code against the security requirements defined in the project spec.

## What to audit

If a file path or diff is provided, audit that. Otherwise run `git diff HEAD` and audit the staged/unstaged changes.

## Checklist

Go through each item and mark ✅ (safe) or ❌ (needs fix) with a one-line note explaining why when it's a problem.

### Secrets & credentials
- [ ] No hardcoded passwords, tokens, API keys, or secrets in source
- [ ] `.env` files not staged or committed
- [ ] No secrets appearing in log statements

### SQL / database
- [ ] All queries use prepared statements or Sequelize parameterization — never string interpolation
  - Good: `User.findOne({ where: { email } })`
  - Bad: `db.query(\`SELECT * FROM users WHERE email = '${email}'\`)`

### Authentication & tokens
- [ ] JWT has expiration set (access: 24h, refresh: 7 days)
- [ ] JWT signed with secret from env var, not hardcoded
- [ ] bcrypt salt rounds ≥ 12
- [ ] Refresh token invalidated on logout

### Input validation
- [ ] All endpoint inputs validated with Joi schema before reaching the controller
- [ ] WCA ID sanitized before calling external WCA API
- [ ] Competition times submitted by client validated server-side (range: 0–600s)

### Error responses
- [ ] Error responses do not leak stack traces or internal file paths
- [ ] Auth errors use generic messages (don't distinguish "user not found" vs "wrong password")

### Rate limiting & CORS
- [ ] Login and register endpoints have rate limiting (max 10 failed attempts → 15 min lockout)
- [ ] Global rate limit: 100 req/min per IP
- [ ] CORS not set to `*` — restricted to allowed origins via env var

### Client trust
- [ ] No security decision based solely on client-provided timestamps
- [ ] JWT verified server-side before trusting any user ID from request

## Output format

List every item checked. Group failures at the top. For each failure include the file and line number if available, and a concrete fix suggestion.

If everything passes, say so clearly and note the scope of what was checked.
