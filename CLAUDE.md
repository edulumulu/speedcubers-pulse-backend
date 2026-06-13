# SpeedCubers Pulse — Backend Context

Red social para speedcubers españoles: competencias 1v1 en tiempo real con videoconferencia, rankings y presencia online. Proyecto de Fin de Master — MVP en 8 semanas.

**Estado actual**: Fases 0, 1, 2, 3, 4C, 5A y 5B completadas. Fase 5B resuelve cada ronda cuando ambos usuarios envían resultado, actualiza Elo/ranking si hay ganador y abre la siguiente ronda activa.

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

**Decisión crítica**: el timer de competencia corre 100% en el cliente. El servidor valida rango (0–600s), persiste resultados por ronda, calcula `final_time_ms`, resuelve ganador/empate cuando ambos usuarios envían y actualiza ranking/Elo si procede; no confiar en timestamps del cliente para seguridad.

## Stack

- Node.js 20 LTS + Express 4
- PostgreSQL 14 + Sequelize 6
- Redis 7 (solo caché: ranking, sesiones online)
- Socket.io 4 (presencia online, señalización competencias)
- Joi 17 (validación de inputs)
- Jest 29 (tests)
- Winston 3 (logging)
- bcrypt 6, jsonwebtoken 9
- agora-token (generación de tokens RTC de Agora)

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

Tablas principales: `users`, `wca_profiles`, `competitions`, `competition_rounds`, `results`, `rankings`

`wca_profiles` almacena únicamente `wca_id` y `country_iso2`. Nombre, foto, rankings y competiciones se consultan en tiempo real desde la WCA API — nunca se persisten (ver ADR-007 en la spec).

| Nombre en spec (referencia) | Nombre real en BD |
|-----------------------------|-------------------|
| `usuarios` | `users` |
| `competencias` | `competitions` |
| `rondas_competencia` | `competition_rounds` |
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
ranking:top:100:{event}        → Array top 100 por evento (TTL 5 min)
user:{id}:stats                → Stats y Elo de usuario (TTL 5 min)
wca:ranking:{user_id}:{event}  → Ranking WCA oficial del usuario en ese evento (TTL 24h)
online:users                   → Set de usuarios online
competition:{id}               → Estado de competencia activa
login_fail:{email}             → Contador de intentos fallidos de login (TTL: 15 min)
login_lock:{email}             → Bloqueo de cuenta activo (TTL: 15 min)
pwd_reset:{token}              → Token de reset de contraseña → userId (TTL: 15 min)
```

Migraciones versionadas: `001-create-users.js`, `002-create-rankings.js`, `003-create-wca-profiles.js`, `004-create-competitions.js`, `005-create-results.js`.

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

## Convenciones de arquitectura implementadas

- **`AppError`** (`src/domain/errors/AppError.js`): error tipado con `message`, `code` y `status`. Todos los servicios lo usan para errores de negocio.
- **`handleError(err, res)`** (`src/presentation/utils/handleError.js`): helper en controllers para devolver 4xx desde AppError o 500 genérico para errores inesperados.
- **`container.js`** (`src/infrastructure/container.js`): punto único de wiring DI — exporta repositorios, services y controllers de auth, user, WCA, ranking, video y competition. Las rutas importan desde aquí.
- **`WCA_ID_REGEX`** (`src/infrastructure/config/constants.js`): `/^[0-9]{4}[A-Z]{2,}[0-9]{2}$/` — usado por el validador Joi y el cliente WCA.
- **`passwordField()`**: factory Joi en `auth.validator.js` — reutiliza las reglas de contraseña (min 8, mayúscula, dígito) en register, reset-password y change-password.
- **Seguridad**: Helmet (HTTP headers), express-rate-limit (100 req/min por IP), login lockout (10 fallos → 15 min de bloqueo en Redis), `console.log` de tokens gateado por `NODE_ENV !== 'production'`.
- **WCA ID inmutable**: una vez vinculado un WCA ID, `WcaService.validateAndLink` lanza `WCA_ALREADY_LINKED` (409). No se puede cambiar ni desvincular (excepto mediante admin).

## Migraciones y seeds

El runner usa **umzug** (no sequelize-cli, que no soporta ESM).
Scripts en `scripts/migrate.js` y `scripts/seed.js`.
Seeders en `src/infrastructure/database/seeders/` — solo para desarrollo, nunca en producción.

## Fases del MVP

## Ranking — Sistema Elo

**K-factor**: 32 (fijo). **Elo inicial**: 1000. **Suma cero** por partida.

```
E(A) = 1 / (1 + 10^((Elo_B - Elo_A) / 400))
Δ    = 32 × (W - E(A))          W=1 ganador, W=0 perdedor
```

- DNF = pérdida (W=0) para el que falla; el oponente gana (W=1). Sin penalización adicional.
- Ambos DNF o tiempos finales iguales = empate sin actualización de Elo.
- Elo se actualiza tras **cada ronda completada con ganador**, no al final de la videollamada.
- Ranking WCA oficial por evento: se obtiene de la WCA API y se cachea en `wca:ranking:{user_id}:{event}` con TTL 24h. **No se persiste en PostgreSQL**.

## Fases del MVP

| Fase | Contenido | Estado |
|------|-----------|--------|
| 0 | Setup e infraestructura | ✅ |
| 1 | Autenticación (JWT + WCA opcional) | ✅ |
| 2 | Perfiles de usuario | ✅ |
| 3 | Rankings + Redis cache | ✅ |
| 4C | Salas de competición con Agora.io: `POST /api/v1/competitions`, `POST /api/v1/competitions/join`, `GET /api/v1/competitions/:code`, token RTC | ✅ |
| 5A | Submit básico de resultados por ronda: `competition_rounds`, `results`, `POST /api/v1/competitions/:code/results` | ✅ |
| 5B | Resolución de ronda, ganador/empate, Elo/ranking/stat updates | ✅ |
| 6 | Presencia online (Socket.io) | — |
| 7 | Integración, e2e, polish | — |
| 8 | Deployment (Railway) | — |

## Documentación externa

- Spec completa y schema de BD: `../speedcubers-pulse-docs/SPEEDCUBERS_SPAIN_PROJECT_SPEC.md`
- Guía de commits, CI/CD, security checklist: `../speedcubers-pulse-docs/PROFESSIONAL_EXECUTION_GUIDE.md`
- Contexto general del proyecto (todos los repos): `../speedcubers-pulse-docs/CLAUDE.md`
