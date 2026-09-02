// Express 4 no recoge las promesas rechazadas: este envoltorio las manda al
// middleware de errores.
export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
