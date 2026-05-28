---
name: new-feature
description: Scaffold a complete new backend feature following Clean Architecture. Use when the user wants to implement a new domain entity or RF from the spec — e.g. "implement the competencia module", "scaffold the ranking feature", "start the auth system". Trigger proactively when the user names a feature that doesn't yet have files in src/.
---

# New Feature

Scaffold the full file structure for a new backend feature following Clean Architecture. Ask the user for the feature name if not provided.

## What to create

For a feature named `<Feature>` (e.g. `Competencia`, `Ranking`, `Auth`):

### 1. Domain layer
- `src/domain/entities/<Feature>.js` — Pure entity class. Constructor validates business invariants. No framework imports.
- `src/domain/repositories/I<Feature>Repository.js` — Interface as JSDoc comments listing expected methods and their signatures.

### 2. Application layer
- `src/application/use_cases/<Action><Feature>UseCase.js` — One use case that represents the most central action for this feature (e.g. `CreateCompetenciaUseCase`, `RegisterUserUseCase`).
- `src/application/services/<Feature>Service.js` — Orchestrates use cases. Receives repositories and external services via constructor (manual DI).
- `src/application/dto/<Feature>DTO.js` — Input/output DTO with JSDoc types.

### 3. Infrastructure layer
- `src/infrastructure/repositories/<Feature>Repository.js` — Sequelize implementation of the interface. Receives Sequelize model as constructor dependency.
- `src/infrastructure/database/models/<Feature>.js` — Sequelize model with fields, validations and associations.
- `src/infrastructure/database/migrations/<timestamp>-create-<feature-table>.js` — Sequelize migration with `up` and `down`.

### 4. Presentation layer
- `src/presentation/controllers/<Feature>Controller.js` — Request/response handling only, no business logic. Calls service methods.
- `src/presentation/routes/<feature>.routes.js` — Express router. Auth middleware applied where needed.
- `src/presentation/validators/<feature>.validator.js` — Joi schemas for all endpoint inputs.

### 5. Tests
- `tests/unit/services/<Feature>Service.test.js` — Unit tests for the service with mocked repositories.
- `tests/integration/<feature>.integration.test.js` — Supertest integration tests hitting real PostgreSQL. Use `TRUNCATE ... CASCADE` in `beforeEach`.

## Conventions to follow

- Dependency injection via constructors: `new CompetenciaService(competenciaRepository, socketService)`
- Controllers never contain business logic — only call service + format HTTP response
- All endpoint inputs validated via Joi before reaching the controller
- HTTP responses always: `{ success: true, data: ... }` or `{ success: false, error: { message, code } }`
- No mocking PostgreSQL in integration tests — use real DB
- Entity classes live in `domain/` with zero external dependencies

## After scaffolding

Suggest the expected commit:
```
feat(<scope>): scaffold <feature> clean architecture structure
```
