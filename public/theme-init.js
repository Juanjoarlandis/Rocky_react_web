// Se carga antes que React. La web siempre arranca de día: el modo neón sólo
// se enciende con la bombilla y dura lo que dura la visita. Las versiones
// anteriores guardaban el tema; aquí se borra ese recuerdo. Es un archivo del
// mismo origen para cumplir la CSP de producción.
(function startInDaylight() {
  try {
    localStorage.removeItem('rocky-theme');
  } catch (error) {
    // Sin localStorage no hay nada que borrar.
  }
})();
