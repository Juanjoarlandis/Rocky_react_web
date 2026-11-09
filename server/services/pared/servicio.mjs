import { sha256Hex } from '../../lib/hash.mjs';
import { ensureLogger } from '../../lib/logger.mjs';
import { claveDeAutor } from './firmas.mjs';
import { createWallModel } from './model.mjs';
import { createWallPersistence } from './persistencia.mjs';
import { paredDe } from './validacion.mjs';

// LA PARED COMPARTIDA — el servicio que usan las rutas (design.md D1, D6).
// Junta el modelo en memoria, su fichero y la configuración: la pared está
// activa si está configurada, encendida desde El Taller y su fichero se pudo
// leer. El autor sale de la sesión; la firma solo se crea al pintar.

const SIN_DISCO = Object.freeze({
  corrupto: false,
  cargar: async () => ({ estado: null, corrupto: false }),
  programar: () => {},
  volcar: async () => {},
  apartarCorrupto: async () => {},
});

export function createWallService({ config, persistencia = null, logger, limites } = {}) {
  const log = ensureLogger(logger);
  let model = createWallModel({ limites });
  // Apagada por configuración no toca el disco (ni valida la clave).
  const disco =
    persistencia ??
    (config.enabled
      ? createWallPersistence({
          filePath: config.filePath,
          key: config.key,
          obtener: () => model.snapshot(),
          logger: log,
        })
      : SIN_DISCO);

  // Hasta que no se ha leído el fichero no se acepta nada: lo que llegara se
  // perdería al cargar, o se aceptaría con la pared apagada o corrupta.
  let cargada = false;
  const listo = (async () => {
    if (!config.enabled) return;
    const { estado } = await disco.cargar();
    if (estado) model = createWallModel({ limites, estado });
    model.onChange(() => disco.programar());
    cargada = true;
  })();

  const autorDe = (sesion) => (sesion?.key ? claveDeAutor(sesion.key, model.sal()) : null);
  // La red de quien reporta (IPv4, o IPv6 por su /64), con la sal de la pared:
  // solo vive en la memoria del modelo y nunca se guarda (design.md D7).
  const redDe = (cliente) =>
    cliente ? sha256Hex(`${model.sal()}:red:${cliente}`).slice(0, 16) : undefined;

  return {
    listo,

    activa: () => cargada && config.enabled && model.encendida() && !disco.corrupto,

    estado: () => ({
      configurada: config.enabled,
      encendida: model.encendida(),
      corrupta: Boolean(disco.corrupto),
    }),

    autorDe,

    leer({ pagina, ancho, sesion }) {
      const autor = autorDe(sesion);
      const vista = model.leer({ pared: paredDe(pagina, ancho), autor });
      const firma = autor
        ? (vista.firmas.find((entrada) => entrada.mia)?.firma ?? model.firmaExistente(autor))
        : null;
      return { ...vista, firma };
    },

    pintar({ pagina, ancho, sesion, trazo }) {
      return model.pintar({ pared: paredDe(pagina, ancho), autor: autorDe(sesion), trazo });
    },

    deshacer({ pagina, ancho, sesion, id }) {
      return model.deshacer({ pared: paredDe(pagina, ancho), autor: autorDe(sesion), id });
    },

    borrarMios({ pagina, ancho, sesion }) {
      return model.borrarMios({ pared: paredDe(pagina, ancho), autor: autorDe(sesion) });
    },

    reportar({ pagina, ancho, sesion, cliente, firma }) {
      return model.reportar({
        pared: paredDe(pagina, ancho),
        reporter: autorDe(sesion),
        cliente: redDe(cliente),
        firma,
      });
    },

    // ---------- El Taller ----------

    resumen: () => model.resumen(),
    detalle: (pared) => model.detalle(pared),
    ocultar: (pared, firma) => model.ocultar(pared, firma),
    mostrar: (pared, firma) => model.mostrar(pared, firma),
    borrarFirma: (pared, firma) => model.borrarFirma(pared, firma),
    limpiar: (pared) => model.limpiar(pared),

    async encender(valor) {
      if (valor && disco.corrupto) await disco.apartarCorrupto();
      model.encender(valor);
    },

    volcar: () => disco.volcar(),

    // Lo que se guarda en el fichero (para comprobar qué sale de la memoria).
    snapshot: () => model.snapshot(),
  };
}
