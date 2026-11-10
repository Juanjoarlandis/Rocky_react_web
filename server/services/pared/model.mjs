import crypto from 'node:crypto';
import { HttpError } from '../../http/errors.mjs';
import { PALABRAS, generarFirma } from './firmas.mjs';
import { esPaginaFija } from './validacion.mjs';

// LA PARED COMPARTIDA — el modelo en memoria (design.md D1 y D2).
//
// Es la única fuente de verdad mientras el proceso vive. Un solo proceso y
// mutaciones síncronas, así que no hay carreras. Avisa de cada cambio con
// onChange para que la persistencia lo guarde con su retraso.
//
// Cada pared («ruta|ancho») guarda sus trazos en orden de pintado (lo nuevo
// encima), qué autores están ocultos y quién los ha reportado. El autor es una
// clave derivada de la sesión; su firma la genera el servidor y no se repite.
// La versión sale de un reloj global que solo crece: así un ETag viejo nunca
// coincide con un contenido nuevo, ni siquiera después de limpiar una pared.

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

export const LIMITES_POR_DEFECTO = Object.freeze({
  puntosPorPared: Object.freeze({ ancha: 12_000, estrecha: 6_000 }),
  puntosPorAutorYDia: 4_000,
  // Paredes de producto a la vez (las secciones y las legales no cuentan)
  paredes: 60,
  reportesParaOcultar: 3,
  // Cada trazo cuenta al menos esto en los topes: mil trazos de un punto no
  // pueden llenar el fichero más que unos pocos trazos de verdad.
  costeMinimo: 20,
  // Autores con firma a la vez, y tras cuánto se olvida a quien ya no tiene
  // nada en ninguna pared.
  autores: 20_000,
  olvidoAutorMs: DIA,
  // Registro en memoria de qué redes han reportado a cada autor: cuántos
  // autores recuerda (al llenarse olvida el más antiguo) y cuántas redes por
  // autor. Sin tope, crecería con cada reporte hasta reiniciar el proceso.
  redesQueReportan: 5_000,
  redesPorAutor: 200,
});

const ESTADO_VERSION = 1;

function estadoNuevo() {
  return {
    version: ESTADO_VERSION,
    sal: crypto.randomBytes(16).toString('hex'),
    encendida: true,
    reloj: 0,
    paredes: {},
    autores: {},
    firmas: {},
    vistos: {},
    diario: {},
    diarioDia: null,
  };
}

const puntosDe = (stroke) => stroke.p.length / 2;
const anchoDe = (pared) => pared.slice(pared.lastIndexOf('|') + 1);
const paginaDe = (pared) => pared.slice(0, pared.lastIndexOf('|'));

function noEncontrado(message, code) {
  return new HttpError(message, { status: 404, code });
}

export function createWallModel({
  clock = () => Date.now(),
  random = Math.random,
  limites = {},
  estado = null,
} = {}) {
  const topes = { ...LIMITES_POR_DEFECTO, ...limites };
  const state = estado ? structuredClone(estado) : estadoNuevo();
  state.vistos ??= {};
  const listeners = new Set();
  // Desde qué redes (clave de cliente con sal, ver servicio) se ha reportado a
  // cada autor en cada pared. Solo en memoria: nunca va al fichero.
  const redesQueReportan = new Map();
  const costeDe = (puntos) => Math.max(puntos, topes.costeMinimo);

  const avisar = () => listeners.forEach((listener) => listener());
  const tick = () => (state.reloj += 1);
  const dia = () => new Date(clock()).toISOString().slice(0, 10);

  // Una firma libre: primero al azar con dos cifras, luego con cuatro y, si el
  // azar no da (casi imposible), la primera libre en orden. Siempre cumple
  // FIRMA_RE.
  function firmaLibre() {
    for (const max of [99, 9999]) {
      for (let intento = 0; intento < 40; intento += 1) {
        const firma = generarFirma(random, { max });
        if (!state.firmas[firma]) return firma;
      }
    }
    for (const palabra of PALABRAS) {
      for (let numero = 1; numero <= 9999; numero += 1) {
        if (!state.firmas[`${palabra}-${numero}`]) return `${palabra}-${numero}`;
      }
    }
    return null;
  }

  // Olvida a los autores que no tienen nada en ninguna pared (ni trazos, ni
  // ocultos, ni reportes) y llevan un día sin pintar: así el registro no crece
  // sin fin. Su próxima pintada estrenará firma.
  function podarAutores() {
    const enUso = new Set();
    for (const muro of Object.values(state.paredes)) {
      for (const stroke of muro.strokes) enUso.add(stroke.a);
      for (const autor of Object.keys(muro.hidden)) enUso.add(autor);
      for (const autor of Object.keys(muro.reports)) enUso.add(autor);
    }
    const limite = clock() - topes.olvidoAutorMs;
    for (const [autor, firma] of Object.entries(state.autores)) {
      if (enUso.has(autor) || (state.vistos[autor] ?? 0) > limite) continue;
      delete state.autores[autor];
      delete state.firmas[firma];
      delete state.vistos[autor];
    }
    state.podadoEn = clock();
  }

  function asignarFirma(autor) {
    if (state.autores[autor]) {
      state.vistos[autor] = clock();
      return { firma: state.autores[autor], nueva: false };
    }
    if (clock() - (state.podadoEn ?? 0) > HORA) podarAutores();
    let cuantos = Object.keys(state.autores).length;
    if (cuantos >= topes.autores) {
      podarAutores();
      cuantos = Object.keys(state.autores).length;
    }
    const firma = cuantos < topes.autores ? firmaLibre() : null;
    if (!firma) {
      throw new HttpError('La pared está a tope de firmas. Vuelve dentro de un rato.', {
        status: 503,
        code: 'WALL_FULL',
      });
    }
    state.autores[autor] = firma;
    state.firmas[firma] = autor;
    state.vistos[autor] = clock();
    return { firma, nueva: true };
  }

  function olvidarReportes(prefijo) {
    for (const clave of redesQueReportan.keys()) {
      if (clave.startsWith(prefijo)) redesQueReportan.delete(clave);
    }
  }

  function pared(id, { crear = false } = {}) {
    if (!state.paredes[id] && crear) {
      // Las paredes de producto compiten entre ellas por el tope; las fijas
      // (secciones y legales) nunca se desalojan.
      if (!esPaginaFija(paginaDe(id))) {
        const deProducto = Object.keys(state.paredes).filter(
          (clave) => !esPaginaFija(paginaDe(clave))
        );
        if (deProducto.length >= topes.paredes) {
          // Fuera la que lleva más tiempo sin pintarse
          const vieja = deProducto.reduce((a, b) =>
            state.paredes[a].updatedAt <= state.paredes[b].updatedAt ? a : b
          );
          delete state.paredes[vieja];
          olvidarReportes(`${vieja}|`);
        }
      }
      state.paredes[id] = { version: 0, updatedAt: clock(), strokes: [], hidden: {}, reports: {} };
    }
    return state.paredes[id] ?? null;
  }

  function cambiar(muro) {
    muro.version = tick();
    muro.updatedAt = clock();
  }

  function autorDeFirma(muro, firma) {
    const autor = state.firmas[firma];
    if (!autor || !muro || !muro.strokes.some((stroke) => stroke.a === autor)) {
      throw noEncontrado('Esa firma no ha pintado en esta pared.', 'WALL_SIGNATURE_NOT_FOUND');
    }
    return autor;
  }

  // Lo pintado hoy por autor y pared; al cambiar de día se empieza de cero.
  function contadorDeHoy() {
    const hoy = dia();
    if (state.diarioDia !== hoy) {
      state.diario = {};
      state.diarioDia = hoy;
    }
    return state.diario;
  }

  return {
    sal: () => state.sal,
    encendida: () => state.encendida,

    encender(valor) {
      state.encendida = Boolean(valor);
      tick();
      avisar();
    },

    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    snapshot: () => structuredClone(state),

    // La firma de un autor si ya ha pintado alguna vez; null si no.
    firmaExistente: (autor) => state.autores[autor] ?? null,

    firmaPara(autor) {
      const { firma, nueva } = asignarFirma(autor);
      if (nueva) avisar();
      return firma;
    },

    pintar({ pared: id, autor, trazo }) {
      const existente = pared(id);
      if (existente?.hidden[autor]) {
        throw new HttpError('Lo que pintaste aquí está oculto: no puedes seguir en esta pared.', {
          status: 403,
          code: 'WALL_HIDDEN_AUTHOR',
        });
      }
      const diario = contadorDeHoy();
      const claveDia = `${autor}|${id}`;
      const puntos = costeDe(trazo.p.length / 2);
      if ((diario[claveDia] ?? 0) + puntos > topes.puntosPorAutorYDia) {
        throw new HttpError('Ya has pintado mucho en esta pared hoy. Vuelve mañana.', {
          status: 429,
          code: 'WALL_DAILY_LIMIT',
        });
      }
      const { firma } = asignarFirma(autor);
      const muro = pared(id, { crear: true });
      const stroke = {
        id: crypto.randomBytes(8).toString('base64url'),
        a: autor,
        c: trazo.c,
        s: trazo.s,
        p: trazo.p,
        d: trazo.d,
        t: clock(),
      };
      muro.strokes.push(stroke);
      diario[claveDia] = (diario[claveDia] ?? 0) + puntos;

      // Lo nuevo tapa lo viejo: con la pared llena se va lo más antiguo.
      const tope = topes.puntosPorPared[anchoDe(id)] ?? topes.puntosPorPared.ancha;
      let total = muro.strokes.reduce((suma, s) => suma + costeDe(puntosDe(s)), 0);
      while (total > tope && muro.strokes.length > 1) {
        total -= costeDe(puntosDe(muro.strokes.shift()));
      }
      cambiar(muro);
      avisar();
      return { id: stroke.id, version: muro.version, firma };
    },

    leer({ pared: id, autor }) {
      const muro = pared(id);
      if (!muro) return { version: 0, strokes: [], firmas: [] };
      const visibles = muro.strokes.filter((stroke) => !muro.hidden[stroke.a]);
      const firmas = [];
      const vistos = new Set();
      for (const stroke of visibles) {
        if (vistos.has(stroke.a)) continue;
        vistos.add(stroke.a);
        firmas.push({ firma: state.autores[stroke.a], mia: stroke.a === autor });
      }
      return {
        version: muro.version,
        strokes: visibles.map(({ id: strokeId, a, c, s, p, d }) => ({
          id: strokeId,
          c,
          s,
          p,
          d,
          firma: state.autores[a],
        })),
        firmas,
      };
    },

    deshacer({ pared: id, autor, id: strokeId }) {
      const muro = pared(id);
      const index = muro ? muro.strokes.findIndex((stroke) => stroke.id === strokeId) : -1;
      if (index < 0)
        throw noEncontrado('Ese trazo ya no está en la pared.', 'WALL_STROKE_NOT_FOUND');
      if (muro.strokes[index].a !== autor) {
        throw new HttpError('Ese trazo no es tuyo.', { status: 403, code: 'WALL_NOT_YOURS' });
      }
      muro.strokes.splice(index, 1);
      cambiar(muro);
      avisar();
      return { version: muro.version };
    },

    borrarMios({ pared: id, autor }) {
      const muro = pared(id);
      if (!muro) return { version: 0 };
      const antes = muro.strokes.length;
      muro.strokes = muro.strokes.filter((stroke) => stroke.a !== autor);
      if (muro.strokes.length !== antes) {
        cambiar(muro);
        avisar();
      }
      return { version: muro.version };
    },

    // Un visitante es una sesión y también una red (`cliente`): varias sesiones
    // nuevas desde la misma red cuentan como un solo reporte. Sin `cliente`
    // (pruebas antiguas), cada sesión es su propia red.
    reportar({ pared: id, reporter, cliente = reporter, firma }) {
      const muro = pared(id);
      const autor = autorDeFirma(muro, firma);
      if (reporter === autor) return { oculta: Boolean(muro.hidden[autor]) };
      const quienes = new Set(muro.reports[autor] ?? []);
      const claveRedes = `${id}|${autor}`;
      const redes = redesQueReportan.get(claveRedes) ?? new Set();
      if (quienes.has(reporter) || redes.has(cliente)) {
        return { oculta: Boolean(muro.hidden[autor]) };
      }
      // Un Set también recuerda el orden: al llenarse sale la red más antigua.
      if (redes.size >= topes.redesPorAutor) redes.delete(redes.values().next().value);
      redes.add(cliente);
      if (!redesQueReportan.has(claveRedes) && redesQueReportan.size >= topes.redesQueReportan) {
        // Un Map recuerda el orden de inserción: la primera clave es la más antigua.
        redesQueReportan.delete(redesQueReportan.keys().next().value);
      }
      redesQueReportan.set(claveRedes, redes);
      quienes.add(reporter);
      muro.reports[autor] = [...quienes];
      if (quienes.size >= topes.reportesParaOcultar && !muro.hidden[autor]) {
        muro.hidden[autor] = true;
        cambiar(muro);
      }
      avisar();
      return { oculta: Boolean(muro.hidden[autor]) };
    },

    // Para vigilar los topes del registro de redes: cuántos autores recuerda o,
    // con pared y firma, cuántas redes recuerda de ese autor.
    redesRecordadas(id, firma) {
      if (id === undefined) return redesQueReportan.size;
      return redesQueReportan.get(`${id}|${autorDeFirma(pared(id), firma)}`)?.size ?? 0;
    },
    reportesDe(id, firma) {
      const muro = pared(id);
      return (muro.reports[autorDeFirma(muro, firma)] ?? []).length;
    },

    // ---------- El Taller ----------

    resumen() {
      return Object.entries(state.paredes).map(([id, muro]) => {
        const autores = new Set(muro.strokes.map((stroke) => stroke.a));
        return {
          pared: id,
          trazos: muro.strokes.length,
          puntos: muro.strokes.reduce((suma, stroke) => suma + puntosDe(stroke), 0),
          firmas: autores.size,
          reportes: Object.values(muro.reports).reduce((suma, lista) => suma + lista.length, 0),
          ocultas: [...autores].filter((autor) => muro.hidden[autor]).length,
          actualizada: new Date(muro.updatedAt).toISOString(),
        };
      });
    },

    detalle(id) {
      const muro = pared(id);
      if (!muro) throw noEncontrado('Esa pared está vacía.', 'WALL_NOT_FOUND');
      const porAutor = new Map();
      for (const stroke of muro.strokes) {
        porAutor.set(stroke.a, (porAutor.get(stroke.a) ?? 0) + 1);
      }
      return {
        pared: id,
        version: muro.version,
        strokes: muro.strokes.map(({ id: strokeId, a, c, s, p, d }) => ({
          id: strokeId,
          c,
          s,
          p,
          d,
          firma: state.autores[a],
          oculta: Boolean(muro.hidden[a]),
        })),
        firmas: [...porAutor].map(([autor, trazos]) => ({
          firma: state.autores[autor],
          trazos,
          reportes: (muro.reports[autor] ?? []).length,
          oculta: Boolean(muro.hidden[autor]),
        })),
      };
    },

    ocultar(id, firma) {
      const muro = pared(id);
      const autor = autorDeFirma(muro, firma);
      muro.hidden[autor] = true;
      cambiar(muro);
      avisar();
    },

    // La crew lo ha revisado: vuelve a verse y sus reportes se olvidan.
    mostrar(id, firma) {
      const muro = pared(id);
      const autor = autorDeFirma(muro, firma);
      delete muro.hidden[autor];
      delete muro.reports[autor];
      redesQueReportan.delete(`${id}|${autor}`);
      cambiar(muro);
      avisar();
    },

    borrarFirma(id, firma) {
      const muro = pared(id);
      const autor = autorDeFirma(muro, firma);
      muro.strokes = muro.strokes.filter((stroke) => stroke.a !== autor);
      delete muro.hidden[autor];
      delete muro.reports[autor];
      redesQueReportan.delete(`${id}|${autor}`);
      cambiar(muro);
      avisar();
    },

    limpiar(id) {
      if (!state.paredes[id]) return;
      delete state.paredes[id];
      olvidarReportes(`${id}|`);
      tick();
      avisar();
    },
  };
}
