# ⚙️ SpeedCubers Pulse - Backend

Node.js + Express.js backend for SpeedCubers Pulse platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x
- PostgreSQL 14
- Redis 7
- Docker (optional, for local dev)

### Installation

```bash
# Clone repository
git clone https://github.com/TU-USUARIO/speedcubers-pulse-backend.git
cd speedcubers-pulse-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start services (Docker)
docker-compose up -d

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

Server runs on `http://localhost:3000`

## 📖 Documentation

- **Architecture & Design**: See [docs/ARCHITECTURE.md](../speedcubers-pulse-docs/PROJECT_SPEC.md)
- **Execution Standards**: See [EXECUTION_GUIDE.md](../speedcubers-pulse-docs/EXECUTION_GUIDE.md)
- **API Reference**: See `docs/API.md` (coming soon)

## ✅ Testing

```bash
npm test              # All tests
npm run test:unit    # Unit tests only
npm run test:integration  # Integration tests
npm run test:coverage # Coverage report
```

Target: >90% coverage

## 🔒 Security

- JWT authentication
- Bcrypt password hashing
- SQL injection prevention
- CORS configuration
- Rate limiting

See EXECUTION_GUIDE.md for Security Checklist

## 📦 Tech Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 14
- **Cache**: Redis 7
- **WebSockets**: Socket.io 4.x
- **Authentication**: JWT + bcrypt
- **Validation**: Joi

## 🏗️ Project Structure
```
src/
  ├── domain/          # Business logic entities
  ├── application/     # Use cases & services
  ├── infrastructure/  # DB, external APIs, cache
  ├── presentation/    # Controllers, routes, middleware
  └── app.js          # Express app setup
```

## 🔄 Git Workflow

See [EXECUTION_GUIDE.md](../speedcubers-pulse-docs/EXECUTION_GUIDE.md) for:
- Conventional Commits
- Branch naming
- Pull Request process

## 🚀 Deployment

Development: `npm run dev`  
Staging: Automated via GitHub Actions on `develop` branch  
Production: Automated via GitHub Actions on `main` branch with tag `v*`

## 📋 Roadmap

- Phase 0: Setup ✅
- Phase 1: Authentication (Week 2-3)
- Phase 2: User Profiles (Week 3.5)
- Phase 3: Rankings (Week 4)
- [See full roadmap in PROJECT_SPEC.md](../speedcubers-pulse-docs/PROJECT_SPEC.md#plan-de-fases)

## 👨‍💻 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes following code standards
3. Run tests: `npm test`
4. Commit: `git commit -m "feat(scope): description"`
5. Push: `git push origin feature/my-feature`
6. Create Pull Request

## 📞 Questions?

Open an issue in this repository.

---

**Status**: Development (Phase 0)  
**Version**: 0.1.0  
**Last Updated**: 2026-05-16