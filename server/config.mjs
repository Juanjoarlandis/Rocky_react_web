function readPositiveInteger(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function readBooleanFlag(value, fallback, label) {
  if (value === undefined || value === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${label} sólo puede ser true o false.`);
}

function readSiteAccess(env) {
  const enabled = readBooleanFlag(env.SITE_ACCESS_ENABLED, false, 'SITE_ACCESS_ENABLED');
  const configuredPassword = String(env.SITE_ACCESS_PASSWORD || '');

  if (enabled && configuredPassword.length < 12) {
    throw new Error(
      'SITE_ACCESS_PASSWORD es obligatorio y debe tener al menos 12 caracteres.'
    );
  }

  return Object.freeze({
    enabled,
    password: enabled ? configuredPassword : '',
    sessionLifetimeMs: 12 * 60 * 60 * 1_000,
  });
}

const DEFAULT_FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'openai/gpt-oss-20b:free',
];

export function isFreeOpenRouterModel(model) {
  return (
    model === 'openrouter/free' ||
    /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*:free$/.test(model)
  );
}

function readFreeModels(env) {
  const rawModels = Object.hasOwn(env, 'OPENROUTER_MODELS')
    ? env.OPENROUTER_MODELS
    : DEFAULT_FREE_MODELS.join(',');
  const models = String(rawModels ?? '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (models.length === 0) {
    throw new Error('OPENROUTER_MODELS necesita al menos un modelo gratuito.');
  }
  if (!models.every(isFreeOpenRouterModel)) {
    throw new Error(
      'OPENROUTER_MODELS sólo puede contener modelos gratuitos con :free u openrouter/free.'
    );
  }
  return Object.freeze(models);
}

function normalizeOrigin(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} debe ser un origen HTTP(S) válido.`);
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value.replace(/\/$/, '')) {
    throw new Error(`${label} debe contener sólo esquema, host y puerto.`);
  }
  return url.origin;
}

function readOrigins(env, publicOrigin, isProduction) {
  const configured = (env.API_ALLOWED_ORIGINS || publicOrigin)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origins = configured.map((origin) => normalizeOrigin(origin, 'API_ALLOWED_ORIGINS'));
  if (isProduction && origins.some((origin) => !origin.startsWith('https://'))) {
    throw new Error('API_ALLOWED_ORIGINS sólo puede contener orígenes HTTPS en producción.');
  }
  return new Set(origins);
}

export function createConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  if (isProduction && !env.PUBLIC_ORIGIN) {
    throw new Error('PUBLIC_ORIGIN es obligatorio en producción.');
  }

  const publicOrigin = normalizeOrigin(
    env.PUBLIC_ORIGIN || 'http://localhost:3000',
    'PUBLIC_ORIGIN'
  );
  if (isProduction && !publicOrigin.startsWith('https://')) {
    throw new Error('PUBLIC_ORIGIN debe usar HTTPS en producción.');
  }

  const models = readFreeModels(env);

  // En producción siempre hay un proxy delante (compose publica 127.0.0.1 y
  // Cloudflare termina TLS): sin hops todos los visitantes comparten la IP
  // 127.0.0.1, el rate limit se vuelve global y Shopify recibe un Buyer-IP falso.
  const trustProxyHops = readPositiveInteger(env.TRUST_PROXY_HOPS, 0, { min: 0, max: 3 });
  if (isProduction && trustProxyHops === 0) {
    throw new Error(
      'TRUST_PROXY_HOPS debe ser el número exacto de proxies delante del servidor (1 con Cloudflare); con 0 en producción todos los usuarios compartirían la misma IP.'
    );
  }

  return {
    nodeEnv,
    isProduction,
    port: readPositiveInteger(env.PORT, 3001, { max: 65535 }),
    publicOrigin,
    allowedOrigins: readOrigins(env, publicOrigin, isProduction),
    trustProxyHops,
    siteAccess: readSiteAccess(env),
    chat: {
      apiKey: env.OPENROUTER_API_KEY || '',
      models,
      rateLimitMax: readPositiveInteger(env.CHAT_RATE_LIMIT_MAX, 5, { max: 50 }),
      rateLimitWindowMs: readPositiveInteger(env.CHAT_RATE_LIMIT_WINDOW_MS, 600_000, {
        min: 1_000,
        max: 3_600_000,
      }),
      globalDailyMax: readPositiveInteger(env.CHAT_GLOBAL_DAILY_MAX, 45, { max: 50 }),
      globalDailyWindowMs: 24 * 60 * 60 * 1_000,
      maxConcurrent: readPositiveInteger(env.CHAT_MAX_CONCURRENT, 4, { max: 20 }),
      timeoutMs: readPositiveInteger(env.CHAT_TIMEOUT_MS, 20_000, {
        min: 1_000,
        max: 60_000,
      }),
    },
    commerce: {
      rateLimitMax: readPositiveInteger(env.SHOPIFY_RATE_LIMIT_MAX, 120, { max: 2_000 }),
      rateLimitWindowMs: readPositiveInteger(
        env.SHOPIFY_RATE_LIMIT_WINDOW_MS,
        60_000,
        { min: 1_000, max: 3_600_000 }
      ),
    },
    // Apuntarse al aviso de un drop es cosa de una vez: con unas pocas altas
    // por ventana sobra, y el resto son bots probando.
    avisos: {
      rateLimitMax: readPositiveInteger(env.AVISOS_RATE_LIMIT_MAX, 6, { max: 100 }),
      rateLimitWindowMs: readPositiveInteger(env.AVISOS_RATE_LIMIT_WINDOW_MS, 600_000, {
        min: 1_000,
        max: 3_600_000,
      }),
    },
  };
}
