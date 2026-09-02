// El mensaje de un error para enseñarlo, o el de reserva si no es un Error.
export function errorMessage(error, fallback = 'La tienda no ha podido completar la operación.') {
  return error instanceof Error && error.message ? error.message : fallback;
}
