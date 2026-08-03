const LOCAL_ALLOWED_ORIGINS = ['http://localhost:5173'];
const VALID_SAME_SITE_VALUES = new Set(['strict', 'lax', 'none']);

function isProduction(env = process.env.NODE_ENV) {
  return env === 'production';
}

function csv(value) {
  return value
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];
}

export function allowedOrigins({
  env = process.env.NODE_ENV,
  rawOrigins = process.env.ALLOWED_ORIGINS,
} = {}) {
  const origins = csv(rawOrigins);

  if (isProduction(env)) {
    if (!origins.length) {
      throw new Error('ALLOWED_ORIGINS must be set in production');
    }
    if (origins.includes('*')) {
      throw new Error('Wildcard CORS origin is not allowed in production');
    }
    return origins;
  }

  return origins.length ? origins : LOCAL_ALLOWED_ORIGINS;
}

export function corsOriginDelegate(options = {}) {
  const origins = allowedOrigins(options);

  return (origin, callback) => {
    if (!origin || origins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS origin not allowed'));
  };
}

export function corsOptions(options = {}) {
  return {
    origin: corsOriginDelegate(options),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

export function socketCorsOptions(options = {}) {
  return {
    origin: corsOriginDelegate(options),
    credentials: true,
    methods: ['GET', 'POST'],
  };
}

export function refreshCookieOptions({
  env = process.env.NODE_ENV,
  domain = process.env.REFRESH_COOKIE_DOMAIN,
  sameSite = process.env.REFRESH_COOKIE_SAMESITE,
  maxAge,
  path = '/api/v1/auth',
} = {}) {
  const production = isProduction(env);
  const normalizedSameSite = sameSite?.toLowerCase();
  const resolvedSameSite = VALID_SAME_SITE_VALUES.has(normalizedSameSite)
    ? normalizedSameSite
    : production ? 'none' : 'lax';

  return {
    httpOnly: true,
    secure: production || resolvedSameSite === 'none',
    sameSite: resolvedSameSite,
    ...(maxAge ? { maxAge } : {}),
    ...(domain ? { domain } : {}),
    path,
  };
}

export function trustProxySetting({
  env = process.env.NODE_ENV,
  rawHops = process.env.TRUST_PROXY_HOPS,
} = {}) {
  if (rawHops !== undefined) {
    const hops = Number.parseInt(rawHops, 10);
    if (Number.isFinite(hops) && hops >= 0) return hops;
  }

  return isProduction(env) ? 1 : false;
}
