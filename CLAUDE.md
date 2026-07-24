# SpeedCubers Pulse — Backend Context

Red social para speedcubers españoles: competencias 1v1 en tiempo real con videoconferencia, rankings y presencia online. Proyecto de Fin de Master — MVP en 8 semanas.

**Estado actual**: Fases 0, 1, 2, 3, 4C, 5A, 5B, 6, 7A, 7B-1, 7B-2, 7B-3, 7C-1, 7C-2A, 7C-2B, 7D-1, 7D-2, 7D-3, 7E-1, 7E-2, 7E-3, 7F-1, 7F-2 y 8A completadas. La Fase 8A endurece configuración pre-producción: CORS estricto, cookies configurables, proxy trust y seeders bloqueados en producción.

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

**Decisión crítica**: el timer de competencia corre 100% en el cliente. El servidor sincroniza estados de sala por Socket.io, valida rango (0–600s), persiste resultados por ronda, calcula `final_time_ms`, resuelve ganador/empate cuando ambos usuarios envían y actualiza ranking/Elo si procede; no confiar en timestamps del cliente para seguridad.

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
  e2e/           # Playwright desde frontend, flujos completos
```

Targets:
- >80% cobertura global
- >95% en lógica de `auth` y `competencia`
- Todos los endpoints nuevos deben tener test de integración

## Seguridad (no negociable)

- Prepared statements siempre — nunca interpolar valores en queries SQL
- bcrypt salt rounds ≥ 12
- JWT: access token 24h, refresh token 7 días en cookie `httpOnly`
- Rate limiting: 10 logins fallidos → lockout 15 min; 100 req/min por IP
- Validar y sanitizar WCA ID antes de llamar a la API externa
- No exponer stack traces ni detalles internos en respuestas de error
- HTTPS obligatorio en staging/prod
- `ALLOWED_ORIGINS` obligatorio en producción y sin wildcard `*`
- Refresh cookie configurable con `REFRESH_COOKIE_DOMAIN` y `REFRESH_COOKIE_SAMESITE`; `Secure` se activa en producción
- Seeders bloqueados en producción salvo opt-in explícito `ALLOW_PRODUCTION_SEED=true`

## Base de datos

Tablas principales: `users`, `wca_profiles`, `competitions`, `competition_rounds`, `results`, `rankings`, `video_global_usage`

`users` incluye `video_seconds_used` y `video_quota_reset_at` para la cuota mensual gratuita por usuario. `video_global_usage` registra el consumo mensual global de Agora para cortar emisión de tokens antes de superar la bolsa gratuita del proyecto. Los valores se miden en segundos; `FREE_VIDEO_MINUTES_PER_MONTH` define el límite por usuario y `FREE_VIDEO_GLOBAL_MINUTES_PER_MONTH` define el límite global mensual.

`competition_rounds.event` define el cubo de cada ronda. Una misma sala puede alternar eventos entre rondas; `PATCH /api/v1/competitions/:code/round/event` solo puede cambiar la ronda activa antes de que existan resultados y regenera el scramble para ese evento.

`rankings.event` separa Elo, PB, media, victorias, derrotas y DNF por cubo. La fila base de registro se crea para `3x3`; el resto de eventos se crean de forma lazy al resolver una ronda de ese cubo. La restricción única es `(user_id, event)`.

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
user:{id}:stats:{event}        → Stats y Elo de usuario por evento (TTL 5 min)
wca:ranking:{user_id}:{event}  → Ranking WCA oficial del usuario en ese evento (TTL 24h)
online:users                   → Hash de usuarios online `{ id, username, connectedAt, lastSeenAt }`
competition:{id}               → Estado de competencia activa
login_fail:{email}             → Contador de intentos fallidos de login (TTL: 15 min)
login_lock:{email}             → Bloqueo de cuenta activo (TTL: 15 min)
pwd_reset:{token}              → Token de reset de contraseña → userId (TTL: 15 min)
```

Migraciones versionadas: `001-create-users.js`, `002-create-wca-profiles.js`, `003-create-rankings.js`, `004-create-competitions.js`, `005-create-results.js`, `006-add-plus-four-result-penalty.js`, `007-add-video-quota-to-users.js`, `008-add-event-to-competition-rounds.js`, `009-add-event-to-rankings.js`, `010-create-video-global-usage.js`.

## Variables de entorno

Ver `.env.example`. Variables críticas:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — Secreto para firmar tokens
- `JWT_REFRESH_SECRET`
- `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE`
- `FREE_VIDEO_MINUTES_PER_MONTH` — límite mensual gratuito por usuario; default 60 si no se define
- `FREE_VIDEO_GLOBAL_MINUTES_PER_MONTH` — límite mensual global gratuito de Agora; default 8000 si no se define
- `ALLOWED_ORIGINS` — orígenes permitidos para HTTP y Socket.io; obligatorio en producción, separado por comas
- `REFRESH_COOKIE_DOMAIN` — dominio de la cookie de refresh en producción si frontend/backend comparten dominio padre
- `REFRESH_COOKIE_SAMESITE` — `strict`, `lax` o `none`; default `lax` local y `none` en producción
- `TRUST_PROXY_HOPS` — saltos de proxy confiables; default 1 en producción
- `ALLOW_PRODUCTION_SEED` — mantener vacío; solo `true` para un seed productivo controlado

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
- **Hardening pre-producción**: `src/infrastructure/config/security.js` centraliza CORS HTTP/Socket, cookies de refresh, `trust proxy` y validaciones productivas. En producción no arranca con `ALLOWED_ORIGINS` vacío o `*`; `scripts/seed.js` rechaza ejecución en producción salvo `ALLOW_PRODUCTION_SEED=true`.
- **Sesión persistente**: `POST /auth/register` y `POST /auth/login` emiten `refresh_token` solo como cookie `httpOnly`; la respuesta JSON devuelve `user` y `tokens.accessToken`, nunca `tokens.refreshToken`. `POST /auth/refresh` acepta cookie o body legacy, rota la cookie y devuelve un nuevo access token; `POST /auth/logout` limpia la cookie.
- **WCA ID inmutable**: una vez vinculado un WCA ID, `WcaService.validateAndLink` lanza `WCA_ALREADY_LINKED` (409). No se puede cambiar ni desvincular (excepto mediante admin).
- **Presencia online**: `PresenceService` guarda usuarios conectados en Redis `online:users`; `presence.socket.js` autentica Socket.io con JWT y emite `presence:online`, `presence:offline` y `presence:heartbeat`.
- **Competición por Socket.io**: `presence.socket.js` también gestiona eventos `competition:join`, `competition:inspection:start`, `competition:round:changed` y `competition:round-final:dismiss`. Los eventos se emiten a las salas privadas `user:<userId>` de host y guest para sincronizar inspección, refresco de sala y paso a marcador/nueva mezcla.
- **Scrambles de ronda**: `ScrambleGenerator` crea la mezcla de cada nueva `competition_round` según `competition_rounds.event`; al unirse el guest se prepara la primera ronda activa y cada ronda completada abre la siguiente con nuevo scramble. `PATCH /api/v1/competitions/:code/round/event` permite cambiar el cubo de la ronda activa antes de que existan resultados.
- **Cuota de vídeo**: `VideoQuotaService` usa `UserRepository.getVideoUsage/updateVideoUsage` y `VideoGlobalUsageRepository`, aplica reset mensual lazy individual/global, limita `POST /api/v1/video/token` al menor tiempo restante y expone `POST /api/v1/video/usage` para registrar segundos consumidos desde el frontend. Al agotarse devuelve `VIDEO_QUOTA_EXCEEDED` o `VIDEO_GLOBAL_QUOTA_EXCEEDED` (402).
- **API docs/OpenAPI**: `src/presentation/openapi/openapiSpec.js` define la especificación OpenAPI 3.0. `GET /api-docs.json` devuelve el contrato JSON y `GET /api-docs` expone Swagger UI para desarrollo/staging.

## Migraciones y seeds

El runner usa **umzug** (no sequelize-cli, que no soporta ESM).
Scripts en `scripts/migrate.js` y `scripts/seed.js`.
Seeders en `src/infrastructure/database/seeders/` — solo para desarrollo, nunca en producción.
`scripts/seed.js` bloquea ejecución con `NODE_ENV=production` salvo opt-in explícito `ALLOW_PRODUCTION_SEED=true`.

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
| 6 | Presencia online MVP: Socket.io autenticado, Redis `online:users`, `GET /api/v1/users/online` | ✅ |
| 7A | Estabilidad de sesión: refresh cookie `httpOnly`, recuperación al recargar | ✅ |
| 7B-1 | Playwright auth/session E2E foundation | ✅ |
| 7B-2 | Playwright ranking/profile E2E | ✅ |
| 7B-3 | Playwright competition 1v1 E2E | ✅ |
| 7C-1 | Manual Playwright pre-release validation + session hardening | ✅ |
| 7C-2A | Pulido visual/accesibilidad de `/compete` sin cambios backend | ✅ |
| 7C-2B | Lógica de inspección sincronizada, scrambles, `+4` y marcador acumulado | ✅ |
| 7D-1 | Cuota mensual gratuita de vídeo con tracking de segundos y token Agora limitado | ✅ |
| 7D-2 | API docs/OpenAPI para contratos actuales: `/api-docs.json` y `/api-docs` | ✅ |
| 7D-3 | Cuota global mensual de vídeo para proteger el consumo Agora del proyecto | ✅ |
| 7E-1 | Selección de cubo por ronda dentro de la sala activa | ✅ |
| 7E-2 | Scrambles por evento para cubos soportados | ✅ |
| 7E-3 | Rankings, Elo y estadísticas separados por evento | ✅ |
| 7F-1 | Pulido UI guiado de ranking, perfil, auth y lobby de competición | ✅ |
| 7F-2 | Pulido UI guiado de sala activa con overlays e iconos de cubo | ✅ |
| 8A | Hardening de seguridad pre-producción: CORS, cookies, proxy, secrets y seeders | ✅ |
| 7 | Integración, e2e, polish | — |
| 8 | Deployment (Railway) | — |

## Documentación externa

- Spec completa y schema de BD: `../speedcubers-pulse-docs/SPEEDCUBERS_SPAIN_PROJECT_SPEC.md`
- Guía de commits, CI/CD, security checklist: `../speedcubers-pulse-docs/PROFESSIONAL_EXECUTION_GUIDE.md`
- Contexto general del proyecto (todos los repos): `../speedcubers-pulse-docs/CLAUDE.md`
