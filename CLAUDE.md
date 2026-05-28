# SpeedCubers Pulse — Backend Context

Red social para speedcubers españoles: competencias 1v1 en tiempo real con videoconferencia, rankings y presencia online. Proyecto de Fin de Master — MVP en 8 semanas.

**Estado actual**: Fase 0 completada (setup). Próxima: Fase 1 (Autenticación).

## Arquitectura

Clean Architecture estricta. El flujo de dependencias siempre va hacia adentro:

```
presentation/ → application/ → domain/
infrastructure/ → domain/
```

- `domain/` — Entidades puras y contratos de repositorios (sin dependencias externas)
- `application/` — Use cases, services, DTOs, mappers
- `infrastructure/` — Implementaciones concretas: PostgreSQL (Sequelize), Redis, WCA API, Agora
- `presentation/` — Controllers, routes, middleware, validators (Joi), sockets (Socket.io)

Dependency injection manual: `new UserService(userRepository, wcaService)`. Sin frameworks de DI.

**Decisión crítica**: el timer de competencia corre 100% en el cliente. El servidor solo valida rango (0–600s). No confiar en timestamps del cliente para seguridad.

## Stack

- Node.js 20 LTS + Express 4
- PostgreSQL 14 + Sequelize 6
- Redis 7 (solo caché: ranking, sesiones online)
- Socket.io 4 (presencia online, señalización competencias)
- Joi 17 (validación de inputs)
- Jest 29 (tests)
- Winston 3 (logging)
- bcrypt 5, jsonwebtoken 9

## Convenciones de commits

Conventional Commits obligatorio: `<type>(<scope>): <subject>`

Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`, `style`

Scopes: `auth`, `user`, `competencia`, `ranking`, `result`, `wca`, `cache`, `socket`, `db`, `middleware`

Subject: imperativo, max 50 chars, sin punto final, minúsculas.

Ejemplos válidos:
```
feat(auth): add jwt refresh token endpoint
fix(ranking): correct points calculation on DNF
test(competencia): add integration tests for join flow
```

## Branches

GitFlow simplificado:
- `main` — producción, solo merges via PR taggeados `v*.*.*`
- `develop` — staging, target de PRs de feature
- `feature/<name>`, `fix/<name>`, `refactor/<name>`, `docs/<name>` — ramas de trabajo

**Nunca force push a `main` o `develop`.**

## Testing

Tests de integración usan base de datos real — **no mockear PostgreSQL**.

```
tests/
  unit/          # Jest puro, sin DB, sin red
  integration/   # supertest + PostgreSQL real, TRUNCATE en beforeEach
  e2e/           # Puppeteer, flujo completo
```

Targets:
- >80% cobertura global
- >95% en lógica de `auth` y `competencia`
- Todos los endpoints nuevos deben tener test de integración

## Seguridad (no negociable)

- Prepared statements siempre — nunca interpolar valores en queries SQL
- bcrypt salt rounds ≥ 12
- JWT: access token 24h, refresh token 7 días
- Rate limiting: 10 logins fallidos → lockout 15 min; 100 req/min por IP
- Validar y sanitizar WCA ID antes de llamar a la API externa
- No exponer stack traces ni detalles internos en respuestas de error
- HTTPS obligatorio en staging/prod

## Base de datos

Tablas principales: `usuarios`, `wca_profiles`, `competencias`, `resultados`, `ranking`

Redis keys:
```
ranking:top:100        → Array top 100
user:{id}:stats        → Stats de usuario
online:users           → Set de usuarios online
competencia:{id}       → Estado de competencia activa
```

Migraciones versionadas: `001-create-users.js`, `002-...`

## Variables de entorno

Ver `.env.example`. Variables críticas:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — Secreto para firmar tokens
- `JWT_REFRESH_SECRET`
- `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE`

## Comandos útiles

```bash
npm run dev          # Servidor con nodemon
npm test             # Todos los tests
npm run test:unit
npm run test:integration
npm run test:coverage
npm run db:migrate   # Correr migraciones
npm run db:seed      # Datos de prueba
npm run lint         # ESLint + Prettier check
```

## Fases del MVP

| Fase | Contenido | Estado |
|------|-----------|--------|
| 0 | Setup e infraestructura | ✅ |
| 1 | Autenticación (JWT + WCA opcional) | ⏳ Siguiente |
| 2 | Perfiles de usuario | — |
| 3 | Rankings + Redis cache | — |
| 4 | Videoconferencia (Agora.io) | — |
| 5 | Sistema de timing | — |
| 6 | Presencia online (Socket.io) | — |
| 7 | Integración, e2e, polish | — |
| 8 | Deployment (Railway) | — |

## Documentación externa

- Spec completa y schema de BD: `../speedcubers-pulse-docs/SPEEDCUBERS_SPAIN_PROJECT_SPEC.md`
- Guía de commits, CI/CD, security checklist: `../speedcubers-pulse-docs/PROFESSIONAL_EXECUTION_GUIDE.md`
- Contexto general del proyecto (todos los repos): `../speedcubers-pulse-docs/CLAUDE.md`
