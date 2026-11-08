// El drop en curso: el que anuncia la portada y agrupa los diseños bajo llave.
// Vive en shared/ porque también lo lee el servidor (el evento de calendario).
export const CURRENT_DROP = Object.freeze({
  number: 4,
  handle: 'rocky-drop-4',
  title: 'ROCKY DROP 4',
  shortTitle: 'Drop 4',
  // Día y hora del lanzamiento, en ISO con su zona (p. ej.
  // '2026-10-10T20:00:00+02:00'). Mientras sea null no hay botón de
  // calendario: no se anuncia una fecha que no existe.
  launchAt: null,
  // Lo que dura el evento en el calendario.
  launchMinutes: 60,
});
