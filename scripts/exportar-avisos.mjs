// Saca la lista de avisos del drop del store cifrado, para el día del envío.
//
//   npm run avisos:exportar                    → CSV por stdout
// Sólo lectura: otro escritor sobre el fichero cifrado perdería cambios del
// servidor o restauraría listas ya borradas desde su copia en memoria.
//
// Corre donde viva el servidor, con APP_ENCRYPTION_KEY y STATE_STORE_PATH en
// el entorno: la lista nunca sale por la API.

import path from 'node:path';
import dotenv from 'dotenv';
import { celdaCsvSegura, createAvisosService } from '../server/services/avisos.mjs';
import { silentLogger } from '../server/lib/logger.mjs';
import { EncryptedStore } from '../server/storage/encrypted-file-store.mjs';

if (process.argv.length > 2) {
  console.error(
    'Este exportador sólo permite lectura. --vaciar se ha deshabilitado porque puede perder datos con el servidor activo. La limpieza necesita un procedimiento de mantenimiento con un único escritor.'
  );
  process.exit(1);
}

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

const avisos = createAvisosService({ store, logger: silentLogger });
const indice = await avisos.products();

// CSV a stdout; los avisos de progreso van por stderr para no ensuciarlo.
// "enviado" queda vacío hasta que scripts/enviar-avisos.mjs manda el aviso.
console.log('producto,email,fecha,enviado');
let total = 0;
for (const producto of indice) {
  const lista = await avisos.list(producto);
  for (const { email, fecha, enviado } of lista) {
    console.log(
      [producto, email, fecha, enviado ?? ''].map((valor) => celdaCsvSegura(valor)).join(',')
    );
    total += 1;
  }
}
console.error(`${total} avisos de ${indice.length} productos.`);
