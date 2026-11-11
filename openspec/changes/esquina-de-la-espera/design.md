# Design

## Context

Ver `proposal.md` (Why). Lo que condiciona el cómo:

- **La lista de avisos** (`server/services/avisos.mjs`) guarda, por clave, `{ email, fecha,
  enviado? }` en el almacén cifrado. Su comentario y el de la ruta dicen que de ahí no sale
  nada por la API. El cartel apunta con la clave del drop (`Pestanas.jsx:107`) y la ficha de un
  «Próximamente», con la del diseño.
- **El Taller ya cuenta** (`countNotices` en `server/services/drops/taller.mjs:142`): emails
  pendientes sin repetir entre el drop y sus diseños.
- **Alta de avisos** (`server/http/routes/avisos.mjs`):
  - límite de 6 por IP cada 10 minutos (`config/app.mjs:133`) y 5.000 por clave;
  - la respuesta ya dice si un email estaba apuntado (`duplicate`).
- **El ciclo de composición** (`server/app.mjs:110-115`). `knownProducts` lee el modelo de drops
  y `avisos` depende de `knownProducts`, así que el modelo de drops no puede depender de
  `avisos`. Lo publican `publicPayload` y otros dos llamadores (`known-products.mjs` y
  `drop.mjs`), que no necesitan el número.
- **El coste de leer.** `store.get` toma el cerrojo del almacén y clona el valor, hasta 5.000
  entradas por clave. `/api/drops` lo pide cada visitante, y el cliente lo vuelve a pedir en
  cada frontera.
- **La forma pública.** Una prueba fija la respuesta exacta de `/api/drops` (`drops.test.mjs:53`)
  y otra la regla del teaser (`catalogo-vivo`: del anunciado solo sale el número de diseños).
- **El cartel** (`Cartel.jsx`) lo importa `ProductPage` de forma estática, así que es
  JavaScript inicial: 99,87/100 kB. El CSS inicial va por 13,60/15 kB.

## Goals / Non-Goals

**Goals:**
- Publicar un número honesto, que nunca diga más de lo que hay, sin abrir la lista.
- Que `/api/drops` no pueda romperse ni frenarse por la cuenta.
- Una sola regla para contar, compartida con El Taller.

**Non-Goals:**
- Tiempo real, verificación de avisos y número exacto (ver la propuesta).
- Cambiar la prueba que fija la forma de `/api/drops`: sin avisos no hay campo nuevo.

## Decisions

### D1 · El número se añade en la ruta, con un servicio propio
`server/services/esquina.mjs` exporta `createEsquina({ avisos, dropsModel, clock, ttlMs,
minimo })`. Su `decorate(payload)` busca los drops anunciados del payload, cuenta con
`countPending(avisos, claves)` y añade `waiting` al drop en `drops` y en `featured`. La ruta `GET
/api/drops` responde con `await esquina.decorate(await drops.publicPayload())`.
- **Alternativas descartadas:**
  - **Contar dentro del modelo de drops.** Crea el ciclo `avisos → knownProducts → drops →
    avisos` y mete el número en los otros dos llamadores, que no lo necesitan.
  - **Una ruta aparte (`/api/drops/<handle>/esquina`).** Otra petición por visita y otro
    estado de carga en el cartel, que es JavaScript inicial.

### D2 · Una sola regla para contar
`countPending(avisos, keys)`, exportada de `server/services/avisos.mjs`, devuelve cuántos emails
distintos tienen un aviso sin enviar en cualquiera de esas claves, usando solo `avisos.list`.
`countNotices` de El Taller pasa a llamarla con las mismas claves (el drop y sus diseños), y la
esquina también.
- **Por qué una función y no un método.** La prueba de El Taller simula los avisos solo con
  `list` (`taller.test.mjs:337`) y no se toca. Una función sobre `list` sirve a los dos sin
  cambiarla.

### D3 · Decenas hacia abajo, desde 10, decidido en el servidor
`waiting = Math.floor(n / 10) * 10` y solo si da 10 o más.
- **Por qué redondear.** La respuesta de alta ya distingue un email apuntado de uno nuevo; con
  un número exacto, además, se vería subir la cuenta en uno con cada alta. En decenas y detrás de
  la caché de D4, el número no dice si una persona concreta se apuntó. Límite conocido (revisión
  de seguridad): quien se apunte con varias direcciones hasta que la cifra salte de decena puede
  deducir la cuenta exacta, y ver que llegó *un* alta con un minuto de resolución. Nunca sabrá
  quién; para eso seguiría necesitando la respuesta de alta, que ya existe.
- **Por qué hacia abajo.** «Ya son 140» con 143 es verdad; con 137 no lo sería.
- **Por qué en el servidor.** Por debajo del umbral no viaja ningún dato, y la forma pública de
  hoy no cambia mientras haya pocos apuntados.
- **Alternativa descartada:** mandar el número exacto y redondear en el cliente. Viaja la
  cifra exacta.

### D4 · Caché de un minuto con un solo cálculo en vuelo
`createEsquina` guarda `{ valor, hasta }` por drop. Si llega otra petición mientras se calcula,
espera a la misma promesa. Con un reloj falso se prueba que 50 peticiones a la vez leen una
vez y que pasado el minuto se vuelve a leer.
- **Alternativa descartada:** llevar un contador incremental en el almacén. Pide escrituras en
  cada alta y una migración para las listas existentes, y el almacén escribe agrupado a
  propósito (`almacen-escritura-agrupada`).

### D5 · Fallar hacia «como hoy»
- **Cuenta a cuenta.** Cada drop anunciado cuenta por su lado: si falla uno, ese drop no lleva
  `waiting` y los demás conservan el suyo (revisión de Fable).
- **El fallo espera.** Un fallo se registra una vez con `logger.warn('Esquina sin cuenta',
  { reason })`, con un código y nada de datos, y se recuerda 10 s. Así, con el almacén mal, ni
  se relee la lista en cada visita ni se escribe una línea por petición.
- **Las fuentes.** Si falla la lectura de las fuentes de los drops, `decorate` devuelve el
  payload sin tocar.
- **Sin fuente, sin número.** Un anunciado que no aparece en las fuentes (son otra lectura del
  catálogo) no publica número, para no publicar uno a la baja durante un minuto.

### D6 · El cartel: una línea y una decoración en CSS
En `Cartel.jsx`, dentro del bloque anunciado y tras la cuenta atrás:
`{drop.waiting > 0 && <p className="cartel-espera">Ya son {drop.waiting} apuntados esperando
en la esquina</p>}`.
- **La clase.** Es `.cartel-espera`, porque `.cartel-esquina` ya era la esquina despegada de las últimas horas.
- **Las cabecitas.** Son un `::before` del párrafo, sin texto, con la máscara de un token
  `--cabecita` (un círculo con las gafas de diana) repetida cinco veces y pintada con
  `currentColor`. Así no son contenido, no se anuncian y siguen el tema.
- **Sin movimiento.** Es un dato, no una animación.
- **Si no cabe en el JavaScript inicial:** se para y se pregunta; el límite no se sube.

### D7 · Qué mide el número, dicho tal cual
Cuenta apuntados sin verificar. Un script podría inflarlo, frenado por los 6 altas por IP cada
10 minutos y el tope de 5.000 por clave. Por eso el texto dice «apuntados», no «personas», y
el número no se usa para nada más que este cartel.

## Risks / Trade-offs

- **[Riesgo] Oráculo de altas** → decenas hacia abajo, caché de un minuto y nada por debajo de
  10. El número no identifica a nadie. Con altas propias se puede deducir la cuenta exacta (ver
  D3), que no es un dato personal. La respuesta de alta ya revela si un email estaba
  (comportamiento existente); este cambio no lo empeora y queda anotado como deuda aparte.
- **[Riesgo] Alguien infla la cifra con altas falsas** → el límite por IP y el tope por clave lo
  frenan; el texto no promete personas verificadas. Si pasa, El Taller lo ve en su cuenta
  exacta y se puede vaciar la lista del drop con los scripts de avisos.
- **[Riesgo] Coste en la Raspberry** → como mucho una lectura por drop anunciado y minuto.
- **[Riesgo] El número choca con la regla del teaser** → la regla habla de los diseños del drop
  (títulos, imágenes, precios); el número de apuntados no dice nada de ellos.
- **[Compromiso] No es tiempo real** → el número tarda hasta un minuto en moverse.

## Migration Plan

- **Despliegue:** sin migración de datos ni de API (un campo opcional nuevo). Se publica como
  cualquier release.
- **Vuelta atrás:** `npm run release:revertir`. Si hace falta apagarlo sin desplegar, basta con
  que `decorate` no se llame. Por eso la ruta lo envuelve en una sola línea, que revierte un
  commit pequeño.
- **Datos:** no se escriben ni se borran avisos; la lista queda igual.
