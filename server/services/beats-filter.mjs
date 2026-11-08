// El filtro del ranking de beats: el nombre del beat y el apodo son lo único
// que la gente escribe y todo el mundo lee. Se deja pasar el tono de la calle
// («joder», «mierda») y se para lo que no: insultos de odio, lo sexual, la
// violencia y los enlaces, que son la puerta del spam.

const LEET = Object.freeze({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' });

// Palabras enteras (con su plural). Por palabra y no por trozo: «computadora»
// no es un insulto aunque lleve dentro otra cosa.
const WORDS = [
  'puta',
  'puto',
  'putita',
  'zorra',
  'maricon',
  'marica',
  'maricona',
  'bollera',
  'polla',
  'coño',
  'follar',
  'follando',
  'follame',
  'mamada',
  'pene',
  'verga',
  'porno',
  'porn',
  'sexo',
  'sex',
  'subnormal',
  'retrasado',
  'retrasada',
  'mongolo',
  'mongola',
  'negrata',
  'sudaca',
  'nazi',
  'hitler',
  'violador',
  'violar',
  'violacion',
  'pederasta',
  'pedofilo',
  'gilipollas',
  'cabron',
  'cabrona',
  'joputa',
  'hdp',
  'fuck',
  'fucking',
  'bitch',
  'cunt',
  'dick',
  'cock',
  'pussy',
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'retard',
  'rape',
  'whore',
  'slut',
];

// Trozos inconfundibles: se buscan también con las letras pegadas, porque
// «h i j o d e p u t a» es la forma clásica de colarlos.
const JOINED = ['hijodeputa', 'hijaputa', 'maricon', 'nigger', 'faggot', 'pederast'];

const LINK = /(?:https?|www|\.(?:com|es|net|org|io|app|xyz|me|tv|gg|link|ly)\b|@[a-z0-9_]|\d{6,})/i;

export function normalizeForFilter(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[01345@$7]/g, (char) => LEET[char] ?? char);
}

// La lista pasa por la misma normalización que el texto: sin ella, «coño»
// nunca coincidiría con su propia versión sin tilde.
const WORD_RE = new RegExp(
  `(?:^|[^a-z])(?:${WORDS.map(normalizeForFilter).join('|')})(?:e?s)?(?=$|[^a-z])`
);

// «p u t a» o «p.u.t.a»: las rachas de letras sueltas se juntan antes de
// buscar palabras. Sólo esas rachas, para no pegar palabras de verdad.
function collapseSpelled(text) {
  return text.replace(/\b(?:[a-z][\s._-]+){2,}[a-z]\b/g, (run) => run.replace(/[\s._-]+/g, ''));
}

export function isAllowedText(text) {
  if (LINK.test(String(text))) return false;
  const normal = collapseSpelled(normalizeForFilter(text));
  if (WORD_RE.test(normal)) return false;
  const joined = normal.replace(/[^a-z]/g, '');
  return !JOINED.some((piece) => joined.includes(piece));
}
