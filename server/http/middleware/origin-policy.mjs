// Política de origen exacta: sin comodines. Un Origin ausente pasa (peticiones
// de la misma página o de máquinas), uno desconocido se rechaza y uno
// permitido recibe las cabeceras CORS mínimas.
export function exactOriginPolicy(config) {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (!origin) {
      return next();
    }
    if (!config.allowedOrigins.has(origin)) {
      return res.status(403).json({ message: 'Origen no permitido.' });
    }

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Operation-Id');
      res.setHeader('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }
    next();
  };
}

// Para mutaciones desde el navegador: el Origin tiene que venir y ser exacto.
export function requireTrustedOrigin(config) {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (!origin || !config.allowedOrigins.has(origin)) {
      return res.status(403).json({ message: 'Petición de origen no confiable.' });
    }
    next();
  };
}
