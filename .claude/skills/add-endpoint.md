---
name: add-endpoint
description: Add a single REST endpoint to an existing backend feature. Use when the user wants to add one new route without scaffolding a whole feature — e.g. "add a GET /users/:id endpoint", "add the refresh token endpoint", "add a leaderboard route". Trigger when the user describes a specific HTTP verb + path they want to implement.
---

# Add Endpoint

Add one REST endpoint to an existing feature following Clean Architecture and project conventions.

## What to touch (in order)

1. **Joi validator** — `src/presentation/validators/<feature>.validator.js`
   Add the schema for the new input (params, query, body).

2. **Controller method** — `src/presentation/controllers/<Feature>Controller.js`
   Add one method. No business logic — only:
   - Call the service method
   - Return a formatted HTTP response

3. **Route** — `src/presentation/routes/<feature>.routes.js`
   Register the new path + HTTP verb + middleware chain.

4. **Service method** — `src/application/services/<Feature>Service.js`
   Add the use case orchestration if not already present.

5. **Integration test** — `tests/integration/<feature>.integration.test.js`
   Add at minimum: happy path + one validation error case + one auth failure (if protected).

## Response format (required)

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "error": { "message": "...", "code": "SNAKE_CASE_CODE" } }
```

Never expose stack traces or internal paths in error responses.

## Auth middleware

Protected routes must include the auth middleware:
```js
router.get('/profile', authMiddleware, userController.getProfile);
```

Public routes (login, register, public rankings) do not include it.

## Validator usage

Apply Joi validation as middleware before the controller:
```js
router.post('/register', validate(userValidator.register), userController.register);
```

`validate()` is a wrapper that calls `schema.validate(req.body, { abortEarly: false })` and returns 400 on failure.

## Example — adding GET /users/:id

```js
// 1. Validator
getById: Joi.object({ id: Joi.number().integer().positive().required() })

// 2. Controller
async getById(req, res) {
  const user = await this.userService.findById(req.params.id);
  res.json({ success: true, data: user });
}

// 3. Route
router.get('/:id', authMiddleware, validate(userValidator.getById, 'params'), userController.getById);
```

## After adding

Suggest the expected commit:
```
feat(<scope>): add <METHOD> /<path> endpoint
```
