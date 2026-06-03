# SpeedCubers Pulse — Backend Context

Red social para speedcubers españoles: competencias 1v1 en tiempo real con videoconferencia, rankings y presencia online. Proyecto de Fin de Master — MVP en 8 semanas.

**Estado actual**: Fase 1 completada (autenticación). Próxima: Fase 2 (Perfiles de usuario).

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

Scopes: `auth`, `user`, `competition`, `ranking`, `result`, `wca`, `cache`, `socket`, `db`, `middleware`

Subject: imperativo, max 50 chars, sin punto final, minúsculas.

Ejemplos válidos:
```
feat(auth): add jwt refresh token endpoint
fix(ranking): correct points calculation on DNF
test(competition): add integration tests for join flow
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

Tablas principales: `users`, `wca_profiles`, `competitions`, `results`, `rankings`

`wca_profiles` almacena únicamente `wca_id` y `country_iso2`. Nombre, foto, rankings y competiciones se consultan en tiempo real desde la WCA API — nunca se persisten (ver ADR-007 en la spec).

| Nombre en spec (referencia) | Nombre real en BD |
|-----------------------------|-------------------|
| `usuarios` | `users` |
| `competencias` | `competitions` |
| `resultados` | `results` |
| `ranking` | `rankings` |
| `usuario_id` | `user_id` |
| `tiempo_raw` | `raw_time` |
| `es_dnf` | `is_dnf` |
| `penalizacion` | `penalty` |
| `victorias` / `derrotas` | `wins` / `losses` |
| `tiempo_promedio` | `average_time` |

Todas las tablas, columnas, migraciones, modelos Sequelize, Redis keys y eventos Socket.io deben estar en **inglés**.

Redis keys:
```
ranking:top:100           → Array top 100
user:{id}:stats           → Stats de usuario
online:users              → Set de usuarios online
competition:{id}          → Estado de competencia activa
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
npm run dev                   # Servidor con nodemon (puerto 3000)
npm run test:unit             # Tests unitarios (sin BD)
npm run test:integration      # Tests de integración (PostgreSQL real)
npm run test:coverage         # Suite completa + reporte de cobertura
npm run lint                  # ESLint + Prettier check

npm run db:migrate            # Ejecutar migraciones pendientes
npm run db:migrate:undo       # Revertir última migración
npm run db:migrate:undo:all   # Revertir todas las migraciones
npm run db:seed               # Cargar fixtures de desarrollo
npm run db:seed:undo          # Revertir último seed
npm run db:reset              # Reset completo: revert seeds + migraciones, relanzar ambos
```

## Fixtures de desarrollo

Tras `npm run db:seed`, 4 usuarios listos con contraseña `Abcd1234`:

| Username | Email | WCA ID |
|---|---|---|
| `edulumulu` | eduardo@speedcubers.dev | 2022LUCA04 |
| `margallego` | margallego@speedcubers.dev | 2013VICE01 |
| `fastcuber` | cuber3@speedcubers.dev | — |
| `speedmaster` | cuber4@speedcubers.dev | — |

## Migraciones y seeds

El runner usa **umzug** (no sequelize-cli, que no soporta ESM).
Scripts en `scripts/migrate.js` y `scripts/seed.js`.
Seeders en `src/infrastructure/database/seeders/` — solo para desarrollo, nunca en producción.

## Fases del MVP

| Fase | Contenido | Estado |
|------|-----------|--------|
| 0 | Setup e infraestructura | ✅ |
| 1 | Autenticación (JWT + WCA opcional) | ✅ |
| 2 | Perfiles de usuario | ⏳ Siguiente |
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
