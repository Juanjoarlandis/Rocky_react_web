import crypto from 'node:crypto';

// Un identificador por petición: viaja en la respuesta y en cada línea de log
// para poder cruzarlos sin registrar nada del cuerpo.
export function requestIds() {
  return (req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  };
}
