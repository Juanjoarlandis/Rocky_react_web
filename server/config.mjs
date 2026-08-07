function readPositiveInteger(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
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

  const models = (env.OPENROUTER_MODELS || [
    'google/gemma-4-31b-it:free',
    'nvidia/nemotron-3-ultra-550b-a55b:free',
    'openai/gpt-oss-20b:free',
  ].join(','))
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean)
    .slice(0, 3);

  return {
    nodeEnv,
    isProduction,
    port: readPositiveInteger(env.PORT, 3001, { max: 65535 }),
    publicOrigin,
    allowedOrigins: readOrigins(env, publicOrigin, isProduction),
    trustProxyHops: readPositiveInteger(env.TRUST_PROXY_HOPS, 0, { min: 0, max: 3 }),
    chat: {
      apiKey: env.OPENROUTER_API_KEY || '',
      models,
      rateLimitMax: readPositiveInteger(env.CHAT_RATE_LIMIT_MAX, 20, { max: 500 }),
      rateLimitWindowMs: readPositiveInteger(env.CHAT_RATE_LIMIT_WINDOW_MS, 60_000, {
        min: 1_000,
        max: 3_600_000,
      }),
      maxConcurrent: readPositiveInteger(env.CHAT_MAX_CONCURRENT, 8, { max: 100 }),
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
  };
}
