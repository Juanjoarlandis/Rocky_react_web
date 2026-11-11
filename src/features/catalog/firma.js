/* La voz de la crew (voz-de-la-crew): una descripción firmada termina en una
   raya y el nombre exacto de alguien de la crew. Shopify manda la descripción
   en una sola línea, así que no se cuenta con saltos ni con espacios: solo con
   el final del texto.

   - Valen las rayas (—, –, ―, −), pegadas o no al texto, y varias seguidas.
   - El guion corto (-) solo firma detrás de un final de frase: es el que se
     cuela en nombres de producto («ROCKY 035 - Rocky», «anti-Rocky»).
   - Se tolera lo que se cuela al escribir o pegar: un punto tras el nombre,
     tildes descompuestas, espacios duros o dobles y caracteres invisibles.
   - Sin firma, el texto se devuelve tal cual llega, para que la ficha se vea
     como siempre. */

const RAYAS = '—–―−-';
// La firma va al final: basta con mirar la cola, y así un texto de miles de
// rayas no cuesta lo mismo al cuadrado.
const COLA = 200;
const INVISIBLES = /[\u200b-\u200d\u2060\ufeff]/g;
const FIN_DE_FRASE = /[.!?…»"”')\]]$/u;

const escapar = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizar = (texto) =>
  texto.normalize('NFC').replace(INVISIBLES, '').replace(/\s+/g, ' ').trim();

// La expresión se compila una vez por lista de nombres, no en cada pintado.
let compilada = { nombres: null, patron: null, canonicos: null };
function patronPara(nombres) {
  if (compilada.nombres === nombres) return compilada;
  const canonicos = new Map(nombres.map((nombre) => [normalizar(nombre), nombre]));
  // Los nombres largos primero: «El Tele» no puede quedarse con «El Telescopio».
  const opciones = [...canonicos.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapar)
    .join('|');
  const patron = new RegExp(`((?:[${RAYAS}]\\s*)+)(${opciones})\\.?$`, 'u');
  compilada = { nombres, patron, canonicos };
  return compilada;
}

export function leerFirma(description, nombres) {
  const original = String(description ?? '').trim();
  if (!original) return { texto: '', firma: null };
  if (!nombres?.length) return { texto: original, firma: null };
  const { patron, canonicos } = patronPara(nombres);
  const texto = normalizar(original);
  const desde = Math.max(0, texto.length - COLA);
  const match = patron.exec(texto.slice(desde));
  if (!match) return { texto: original, firma: null };
  const antes = texto.slice(0, desde + match.index).trimEnd();
  if (!antes) return { texto: '', firma: null };
  const soloGuiones = /^-+$/.test(match[1].replace(/\s/g, ''));
  if (soloGuiones && !FIN_DE_FRASE.test(antes)) return { texto: original, firma: null };
  return { texto: antes, firma: canonicos.get(match[2]) };
}
