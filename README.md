# ⚙️ SpeedCubers Pulse - Backend

Node.js + Express.js backend for SpeedCubers Pulse platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x
- Docker (PostgreSQL 14 + Redis 7 via docker-compose)

### First time setup

```bash
git clone https://github.com/edulumulu/speedcubers-pulse-backend.git
cd speedcubers-pulse-backend
npm install
cp .env.example .env          # fill in JWT_SECRET and JWT_REFRESH_SECRET
docker-compose up -d          # starts postgres (5434) + redis (6379)
npm run db:migrate            # create tables
npm run db:seed               # load dev fixtures
npm run dev                   # server at http://localhost:3000
```

### Daily workflow

```bash
docker-compose up -d   # make sure services are running
npm run dev            # start server
npm run test:unit      # run unit tests
npm run test:integration  # run integration tests (needs docker)
```

## 🗄️ Database workflow

| Command | Description |
|---|---|
| `npm run db:migrate` | Run pending migrations |
| `npm run db:migrate:undo` | Revert last migration |
| `npm run db:migrate:undo:all` | Revert all migrations |
| `npm run db:seed` | Load dev fixtures |
| `npm run db:seed:undo` | Revert last seed |
| `npm run db:reset` | Full reset — revert seeds + migrations, re-run both |

### Dev fixtures

After `npm run db:seed` you have 4 users ready, all with password **`Abcd1234`**:

| Username | Email | WCA ID |
|---|---|---|
| `edulumulu` | eduardo@speedcubers.dev | 2022LUCA04 |
| `margallego` | margallego@speedcubers.dev | 2013VICE01 |
| `fastcuber` | cuber3@speedcubers.dev | — |
| `speedmaster` | cuber4@speedcubers.dev | — |

## ✅ Testing

```bash
npm run test:unit         # unit tests only (no DB needed)
npm run test:integration  # integration tests (real PostgreSQL)
npm run test:coverage     # full suite + coverage report
```

Coverage targets: >80% global, >90% on auth and ranking-critical logic.

## 🔒 Security

- JWT authentication (access 24h, refresh 7 days)
- Bcrypt password hashing (12 salt rounds)
- Prepared statements — no SQL injection
- Rate limiting: 100 req/min per IP, 10 failed logins → 15 min lockout

See [PROFESSIONAL_EXECUTION_GUIDE.md](../speedcubers-pulse-docs/PROFESSIONAL_EXECUTION_GUIDE.md) for the full security checklist.

## 📦 Tech Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js 4.x
- **ORM**: Sequelize 6 + PostgreSQL 14
- **Cache**: Redis 7
- **WebSockets**: Socket.io 4.x
- **Auth**: JWT + bcrypt
- **Validation**: Joi 17
- **Migrations**: umzug (ESM-compatible runner)

## 🏗️ Project Structure

```
src/
  ├── domain/            # Entities + repository interfaces (no framework deps)
  ├── application/       # Services + use cases
  ├── infrastructure/    # Sequelize models, repositories, WCA API client
  │   └── database/
  │       ├── migrations/
  │       ├── seeders/
  │       └── models/
  ├── presentation/      # Controllers, routes, validators, middleware
  └── app.js
scripts/
  ├── migrate.js         # Migration runner (umzug)
  └── seed.js            # Seed runner (umzug)
tests/
  ├── unit/
  └── integration/
```

## 🔄 Git Workflow

See [PROFESSIONAL_EXECUTION_GUIDE.md](../speedcubers-pulse-docs/PROFESSIONAL_EXECUTION_GUIDE.md) for:
- Conventional Commits
- Branch naming
- Pull Request process

## 📖 Documentation

- **Full spec & DB schema**: [SPEEDCUBERS_SPAIN_PROJECT_SPEC.md](../speedcubers-pulse-docs/SPEEDCUBERS_SPAIN_PROJECT_SPEC.md)
- **Execution standards**: [PROFESSIONAL_EXECUTION_GUIDE.md](../speedcubers-pulse-docs/PROFESSIONAL_EXECUTION_GUIDE.md)
- **Project context**: [CLAUDE.md](../speedcubers-pulse-docs/CLAUDE.md)

## 📋 Roadmap

- Phase 0: Setup ✅
- Phase 1: Authentication ✅
- Phase 2: User Profiles ✅
- Phase 3: Rankings + Redis cache ✅
- Phase 4: Video calling with Agora.io (next)
- [Full roadmap](../speedcubers-pulse-docs/SPEEDCUBERS_SPAIN_PROJECT_SPEC.md#plan-de-fases)

---

**Status**: Development (Fases 0, 1, 2 y 3 completas; próxima Fase 4)
**Version**: 0.1.0
