import { CORTES_BARRO } from '../../../data/mesa';

// LOS CORTES DE BARRO — el tema real de ASAKO KACO troceado para los pads.
//
// El audio solo se descarga al elegir el banco, y una vez por pestaña: los
// bytes se guardan en memoria y cada mesa (cada AudioContext) los decodifica.
// Del tema decodificado (unos 43 MB en Float32) se copian solo los tramos de
// los cortes, unos pocos MB, y el resto se suelta.

export const BARRO_URL = '/music/barro.m4a';

let bytes = null;

// Para las pruebas y para reintentar desde cero.
export function olvidarBarro() {
  bytes = null;
}

function descargar(fetchImpl) {
  if (!bytes) {
    bytes = Promise.resolve()
      .then(() => fetchImpl(BARRO_URL))
      .then((response) => {
        if (!response.ok) throw new Error(`No se ha podido descargar BARRO (${response.status}).`);
        return response.arrayBuffer();
      })
      .catch((error) => {
        bytes = null;
        throw error;
      });
  }
  return bytes;
}

function copiarTramo(ctx, tema, { inicio, duracion }) {
  const desde = Math.round(inicio * tema.sampleRate);
  const largo = Math.min(Math.round(duracion * tema.sampleRate), tema.length - desde);
  const tramo = ctx.createBuffer(tema.numberOfChannels, largo, tema.sampleRate);
  for (let channel = 0; channel < tema.numberOfChannels; channel += 1) {
    tramo.getChannelData(channel).set(tema.getChannelData(channel).subarray(desde, desde + largo));
  }
  return tramo;
}

// Devuelve un Map id → AudioBuffer con un tramo por corte, en su orden.
export async function cargarCortesBarro(
  ctx,
  { fetchImpl = globalThis.fetch, cortes = CORTES_BARRO } = {}
) {
  const datos = await descargar(fetchImpl);
  let tema;
  try {
    // decodeAudioData se queda con el buffer que recibe: se le pasa una copia.
    tema = await ctx.decodeAudioData(datos.slice(0));
  } catch (error) {
    bytes = null;
    throw error;
  }
  return new Map(cortes.map((corte) => [corte.id, copiarTramo(ctx, tema, corte)]));
}
