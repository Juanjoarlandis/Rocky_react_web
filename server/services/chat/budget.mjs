// El presupuesto de Rocky IA, compartido por todo lo que llama al proveedor
// (el chat y las barras de la mesa): un tope global de llamadas por ventana y
// el cortacircuitos de coste. Si se reparte por separado, entre los dos se
// pasarían del cupo diario de los modelos gratuitos.
export function createAiBudget({ config, clock = () => Date.now() }) {
  let tripped = false;
  let used = 0;
  let resetAt = 0;

  return {
    isTripped() {
      return tripped;
    },

    // Un proveedor ha cobrado (o no se ha podido verificar que no): se para
    // todo hasta reiniciar.
    trip() {
      tripped = true;
    },

    // Reserva una llamada que va a salir al proveedor. Devuelve null si cabe o
    // los segundos que faltan para que se renueve el cupo. Es síncrona para
    // que dos peticiones no gasten la última plaza a la vez.
    reserve() {
      const now = clock();
      if (resetAt <= now) {
        used = 0;
        resetAt = now + config.chat.globalDailyWindowMs;
      }
      if (used >= config.chat.globalDailyMax) {
        return Math.max(1, Math.ceil((resetAt - now) / 1_000));
      }
      used += 1;
      return null;
    },
  };
}
