/* Un analizador mínimo de hojas de estilo para las pruebas de contrato de CSS
   (hover-tactil.test.js, vida-a-la-vista.test.js). No lo usa la aplicación.

   Recorre la hoja con un contador de llaves: cada bloque guarda su preludio
   (selector o regla @), su línea, el cuerpo propio sin los bloques anidados y
   los preludios de los bloques que lo contienen. Los comentarios se cambian por
   espacios para no mover los números de línea. */
export function rulesOf(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
  const rules = [];
  const stack = [];
  let start = 0;
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '{') {
      const prelude = text.slice(start, i).split(';').pop().trim();
      const line = text.slice(0, i).split('\n').length;
      stack.push({ prelude, line, body: '' });
      start = i + 1;
    } else if (char === '}') {
      const block = stack.pop();
      if (block) {
        block.body += text.slice(start, i);
        rules.push({ ...block, ancestors: stack.map((open) => open.prelude) });
      }
      start = i + 1;
    } else if (char === ';' && stack.length) {
      stack[stack.length - 1].body += text.slice(start, i + 1);
      start = i + 1;
    }
  }
  return rules;
}
