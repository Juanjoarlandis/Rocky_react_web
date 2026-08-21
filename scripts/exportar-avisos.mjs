// Saca la lista de avisos del drop del store cifrado, para el día del envío.
//
//   npm run avisos:exportar                    → CSV por stdout
//   npm run avisos:exportar -- --vaciar <id>   → borra la lista de un producto
//                                                (lo prometido: tras el drop,
//                                                la lista se borra)
//
// Corre donde viva el servidor, con APP_ENCRYPTION_KEY y STATE_STORE_PATH en
// el entorno: la lista nunca sale por la API.

import path from 'node:path';
import dotenv from 'dotenv';
import {
  AVISOS_INDICE,
  AVISOS_NAMESPACE,
  celdaCsvSegura,
} from '../server/avisos.mjs';
import { EncryptedStore } from '../server/encrypted-store.mjs';

dotenv.config({ quiet: true });

const key = process.env.APP_ENCRYPTION_KEY;
if (!key) {
  console.error('Falta APP_ENCRYPTION_KEY: la lista vive cifrada y sin llave no hay lista.');
  process.exit(1);
}

const store = new EncryptedStore({
  filePath: path.resolve(process.env.STATE_STORE_PATH || '.data/rocky-state.enc'),
  key,
});

const [modo, objetivo] = process.argv.slice(2);
const indice = (await store.get(AVISOS_NAMESPACE, AVISOS_INDICE)) ?? [];

if (modo === '--vaciar') {
  if (!objetivo) {
    console.error('Dime qué producto vaciar: --vaciar <id>');
    process.exit(1);
  }
  const habia = await store.delete(AVISOS_NAMESPACE, objetivo);
  await store.set(
    AVISOS_NAMESPACE,
    AVISOS_INDICE,
    indice.filter((producto) => producto !== objetivo)
  );
  console.error(habia ? `Lista de "${objetivo}" borrada.` : `"${objetivo}" no tenía lista.`);
  process.exit(0);
}

// CSV a stdout; los avisos de progreso van por stderr para no ensuciarlo.
console.log('producto,email,fecha');
let total = 0;
for (const producto of indice) {
  const lista = (await store.get(AVISOS_NAMESPACE, producto)) ?? [];
  for (const { email, fecha } of lista) {
    console.log(
      [producto, email, fecha].map((valor) => celdaCsvSegura(valor)).join(',')
    );
    total += 1;
  }
}
console.error(`${total} avisos de ${indice.length} productos.`);
