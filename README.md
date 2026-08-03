# SpeedCubers Pulse - Backend

Backend Node.js/Express para SpeedCubers Pulse: autenticación, perfiles, rankings, competiciones 1v1, presencia online, retos directos, gestión de vídeo y generación de tokens Agora.

Este repositorio forma parte del proyecto de TFM. La documentación de entrega está centralizada en:

- https://github.com/edulumulu/speedcubers-pulse-docs
- [README de entrega](../speedcubers-pulse-docs/README.md)

## Demo

| Recurso | URL |
|---|---|
| Frontend staging/demo | https://speedcubers-pulse-frontend.vercel.app |
| Backend staging/demo | https://speedcubers-pulse-backend-production.up.railway.app |
| Healthcheck | https://speedcubers-pulse-backend-production.up.railway.app/health |

## Stack

- Node.js 20
- Express 4
- PostgreSQL 14
- Sequelize 6
- Redis 7
- Socket.io 4
- Joi
- JWT + bcrypt
- Agora token generation
- Jest + Supertest
- Docker local
- Railway staging/demo

## Funcionalidades backend

- Registro, login, refresh token y logout.
- Refresh token en cookie `httpOnly`.
- Perfil privado y perfiles públicos.
- Vinculación de WCA ID.
- Ranking por evento con caché Redis.
- Salas de competición 1v1 con código privado.
- Rondas, scrambles por evento, resultados, penalizaciones y Elo.
- Tokens RTC de Agora emitidos desde backend.
- Cuota individual y global de vídeo.
- Presencia online por Socket.io y Redis.
- Retos directos con Redis TTL, aceptar, rechazar y cancelar.
- Sincronización de inspección, rondas, marcador y salida de sala por Socket.io.
- OpenAPI/Swagger.

## Instalación local

### Requisitos

- Node.js 20.x
- Docker
- npm

### Setup inicial

```bash
git clone https://github.com/edulumulu/speedcubers-pulse-backend.git
cd speedcubers-pulse-backend
npm install
cp .env.example .env
docker-compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Servidor local: `http://localhost:3000`

Healthcheck local:

```bash
curl http://localhost:3000/health
```

## Usuarios de prueba

Tras `npm run db:seed`, los usuarios de prueba usan la contraseña `Abcd1234`.

| Usuario | Email | Contraseña |
|---|---|---|
| `edulumulu` | `edu@edu.com` | `Abcd1234` |
| `margallego` | `mar@mar.com` | `Abcd1234` |
| `fastcuber` | `fas@fas.com` | `Abcd1234` |
| `speedmaster` | `spe@spe.com` | `Abcd1234` |

## Variables de entorno

Consulta `.env.example`, `.env.develop.example` y `.env.production.example`.

Variables principales:

```env
NODE_ENV=development
APP_ENV=local
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
ALLOWED_ORIGINS=http://localhost:5173
FREE_VIDEO_MINUTES_PER_MONTH=60
FREE_VIDEO_GLOBAL_MINUTES_PER_MONTH=8000
```

`AGORA_APP_CERTIFICATE` debe permanecer siempre en backend.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Arranca servidor local con nodemon |
| `npm start` | Arranca servidor en modo producción |
| `npm run db:migrate` | Ejecuta migraciones pendientes |
| `npm run db:migrate:undo` | Revierte última migración |
| `npm run db:migrate:undo:all` | Revierte todas las migraciones |
| `npm run db:seed` | Carga fixtures de desarrollo |
| `npm run db:seed:undo` | Revierte seeders |
| `npm run db:reset` | Resetea migraciones y fixtures locales |
| `npm run test:unit` | Tests unitarios |
| `npm run test:integration` | Tests de integración con PostgreSQL real |
| `npm run test:coverage` | Suite con cobertura |
| `npm run smoke:staging` | Smoke test contra staging/demo |

## Estructura

```text
src/
├── domain/             # Entidades, errores y contratos de repositorio
├── application/        # Servicios y casos de uso
├── infrastructure/     # Sequelize, Redis, WCA, config y container
│   └── database/
│       ├── migrations/
│       ├── seeders/
│       └── models/
├── presentation/       # Controllers, routes, validators, middleware, sockets, OpenAPI
├── app.js
└── server.js
scripts/
├── migrate.js
├── seed.js
└── smoke-staging.js
tests/
├── unit/
├── integration/
└── e2e/
```

## API docs

Con el backend arrancado:

- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI JSON: `http://localhost:3000/api-docs.json`

## Documentación relacionada

- [Especificación completa](../speedcubers-pulse-docs/SPEEDCUBERS_SPAIN_PROJECT_SPEC.md)
- [Guía profesional](../speedcubers-pulse-docs/PROFESSIONAL_EXECUTION_GUIDE.md)
- [Plan de staging/demo](../speedcubers-pulse-docs/STAGING_DEPLOYMENT_PLAN.md)
- [Plan de entrega TFM](../speedcubers-pulse-docs/TFM_DELIVERY_PLAN.md)
