# Tareas: la voz de la crew

Nivel 2 con decisiones de producto (el tono y los gritos). No se implementa hasta que el
usuario apruebe las muestras de `proposal.md`. TDD en cada tarea: prueba en rojo por la razón
esperada, implementación mínima, refactor en verde.

## 0. Aprobación

- [x] 0.1 El usuario aprueba el tono de las tres muestras y la lista de gritos de D2, o pide cambios. Verificación: su respuesta en la conversación; los cambios que pida, aplicados aquí.
  - Aprobado el 2026-11-11 («Sí, impleméntalo»), con una indicación añadida: «son muñequitos, deben ser voces originales y graciosas». Muestras reescritas y regla añadida a D6.

## 1. Leer la firma

- [x] 1.1 Pruebas de `leerFirma` en `src/features/catalog/firma.test.js`:
  - firma con espacios;
  - firma pegada («…lavadora.—El Paquetes»);
  - raya corta y guion;
  - nombre que no es de la crew;
  - firma en mitad del texto;
  - texto vacío;
  - solo la firma, sin texto.

  Rojo, después `src/features/catalog/firma.js` (D1).
- [x] 1.2 Pruebas de `src/data/voces.test.js`:
  - cada nombre de `crew.js` tiene voz y cada voz es del álbum;
  - cada voz tiene dibujo y un grito de una o dos palabras.

  Rojo, después `src/data/voces.js` (D2).

## 2. La ficha firmada

- [x] 2.1 Pruebas de `ProductDetail.test.jsx`:
  - una descripción firmada enseña el texto sin la firma y la firma «El Paquetes, de la crew», con la cabeza decorativa (`alt=""`);
  - una sin firmar, o firmada por «Juan», se ve como hoy;
  - solo la firma no deja un párrafo vacío.

  Rojo, después el marcado y `product-detail.css` (D3).
- [x] 2.2 Prueba de noche: con `data-theme="neon"` la cabeza usa el dibujo de noche y el nombre sigue siendo el de día. Rojo, después la conexión con `useNightArtResolver`.

## 3. El grito al añadir

- [x] 3.1 Prueba de `ProductDetail.test.jsx`: una ficha firmada por Rocky pinta «¡GUAU!» con `aria-hidden`, y una sin firmar no pinta ninguno. Prueba de contrato de `product-detail.css`: el grito solo se ve bajo `.detail-grid:has(.btn--added)` y su salto va dentro de `prefers-reduced-motion: no-preference`. Rojo, después el marcado y el CSS (D4).
- [x] 3.2 Comprobación en el navegador sin ventana sobre :3006 con un producto firmado del catálogo de muestra: al añadir sale el grito y se va con el «Añadido ✓»; con movimiento reducido, sin salto. Captura para el informe.

  - Hecho en la misma pasada que 5.1, firmando al vuelo «Ya llegó» y «Buen chico» en lugar del catálogo de muestra (ver 5.1).

## 4. El Taller

- [x] 4.1 Prueba de `Taller.test.jsx`: el campo de descripción de un diseño tiene la línea de ayuda enlazada con `aria-describedby`. Rojo, después `DisenosEditor.jsx` (D5).

## 5. Verificación e integración

- [x] 5.1 Ver dos fichas firmadas con las muestras aprobadas sin tocar Shopify ni los datos del repo. El navegador sin ventana intercepta la respuesta del catálogo (`/api/shopify/products`) y firma «Ya llegó» y «Buen chico»; el «Añadido ✓» se simula con la clase `btn--added`, para no crear carritos en la tienda. Verificación: capturas de día y de noche, en escritorio y móvil, y sin salto con movimiento reducido.
  - Hecho el 2026-11-11 sobre :3006. Firma, grito al añadir, ficha sin firmar como siempre, noche, móvil sin desbordar y sin salto con movimiento reducido. La primera captura destapó que el recorte fijo no enseñaba la cabeza de El Paquetes; se cambió a recorte ampliado con foco por muñeco (D3).
  - Cambio de plan: el catálogo de muestra (`demoCatalog.json`) son los diseños del Drop 4, que no son de la crew. Firmarlos con estas muestras no tendría sentido y cambiaría el texto del modo demo.
- [x] 5.2 `npm run check` en verde y ningún límite subido. El chunk de la ficha queda por debajo del límite del mayor diferido.
- [x] 5.3 Revisión independiente con Fable 5.2 y contexto limpio (skill `engineering-review`); corregir los bloqueantes, con dos rondas como máximo.

  - Hecha el 2026-11-11 en una ronda con Fable 5.2 y contexto limpio: sin bloqueantes. Corregido con su prueba:
    - la raya pegada a una letra ya firma;
    - el guion corto solo firma tras un final de frase («ROCKY 035 - Rocky» ya no firma);
    - las rayas dobles no dejan restos;
    - tolera el punto final, las tildes descompuestas, los espacios raros y los invisibles;
    - prueba del añadido real con éxito y con fallo;
    - la expresión se compila una vez y mira solo la cola (de ~460 ms a <2 ms con 20 000 rayas).

    Comprobados también los recortes de noche. Sin cambios en servidor ni API.

## Workflow follow-up

- Escribir las descripciones firmadas en El Taller, primero en la tienda de pruebas, solo con el sí del usuario.
- Antes de publicar contra la tienda real, revisar que ninguna descripción suya acabe por casualidad en una raya y un nombre de la crew (riesgo de design.md).
- Commit, publicación y archivo solo cuando el usuario lo pida.
