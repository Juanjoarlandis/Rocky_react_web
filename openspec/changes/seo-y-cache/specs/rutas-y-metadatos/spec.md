# Spec Delta

## Purpose

Que cada URL de la web diga la verdad sobre sí misma: si existe, cuál es su dirección
canónica, cómo se titula y si debe indexarse, tanto en la respuesta del servidor como
en la página ya pintada.

## ADDED Requirements

### Requirement: Una ruta que no existe responde 404
El servidor SHALL responder 200 solo a las rutas que la aplicación conoce. Cualquier
otra ruta que no sea de la API ni un asset SHALL responder 404 con
`X-Robots-Tag: noindex`: con el documento de la aplicación si la ruta no parece un
fichero, y con un texto plano sin caché si su último tramo lleva extensión.

#### Scenario: Ruta desconocida
- **WHEN** se pide `/loquesea`
- **THEN** responde 404 con el documento de la aplicación y `X-Robots-Tag: noindex`, y el navegador pinta la página de no encontrado

#### Scenario: Página legal desconocida
- **WHEN** se pide `/legal/loquesea`
- **THEN** responde 404 con el documento de la aplicación

#### Scenario: Fichero que no existe
- **WHEN** se pide `/sitemap.xml` o `/music/no-existe.m4a`
- **THEN** responde 404 `text/plain` con `Cache-Control: no-store`, no el documento de la aplicación

#### Scenario: Rutas de la aplicación
- **WHEN** se pide `/`, `/cart`, `/estudio`, `/legal/privacidad`, `/product/rocky-racing` o `/products/rocky-drop-4`
- **THEN** responde 200 con el documento de la aplicación y sin `noindex`

#### Scenario: Puerta de acceso activa
- **WHEN** la puerta está activa y un visitante sin acceso pide una ruta desconocida
- **THEN** recibe lo mismo que hoy: la puerta

### Requirement: Cliente y servidor comparten la lista de rutas
Las rutas que el servidor da por buenas SHALL ser exactamente las que la aplicación
sabe pintar, definidas en un solo sitio.

#### Scenario: Ruta nueva
- **WHEN** se añade una ruta a la lista compartida
- **THEN** la aplicación la pinta y el servidor responde 200 sin tocar nada más

#### Scenario: Ruta que la aplicación no declara
- **WHEN** la aplicación pinta una ruta que no está en la lista compartida
- **THEN** una prueba del proyecto falla

### Requirement: Cada página declara su URL canónica
Toda respuesta 200 a una ruta de la aplicación SHALL llevar una cabecera `Link` con
`rel="canonical"`, y la página pintada SHALL mantener un `<link rel="canonical">` y un
`og:url` con el mismo valor al navegar. La URL canónica es el origen público más la
ruta, sin parámetros ni barra final; la de `/products` es la portada. El HTML servido no
SHALL declarar la portada como canónica de otras rutas.

#### Scenario: Ficha de producto
- **WHEN** se pide `/product/rocky-racing?utm_source=x`
- **THEN** la cabecera `Link` y, tras pintar, el `<link rel="canonical">` y `og:url` valen `https://rocky035.com/product/rocky-racing`

#### Scenario: Navegación dentro de la aplicación
- **WHEN** se pasa de la portada a `/crew` sin recargar
- **THEN** el canónico y `og:url` del documento pasan a `https://rocky035.com/crew`

#### Scenario: Listado sin categoría
- **WHEN** se pide `/products`
- **THEN** su canónica es `https://rocky035.com/`

#### Scenario: Barra final
- **WHEN** se pide `/crew/`
- **THEN** su canónica es `https://rocky035.com/crew`

#### Scenario: Ruta que no existe
- **WHEN** se pide una ruta desconocida
- **THEN** la respuesta no lleva cabecera canónica

### Requirement: Las páginas no encontradas lo dicen y no se indexan
La página 404, la de un producto que no existe, la de una categoría que no existe y la
de una página legal que no existe SHALL titularse «No encontrado · ROCKY 035» y SHALL
llevar una etiqueta `robots` con `noindex` mientras estén en pantalla. Al navegar a una
página que sí existe, la etiqueta SHALL desaparecer.

#### Scenario: Producto inexistente
- **WHEN** se abre `/product/no-existe` y el catálogo ya ha cargado
- **THEN** el título es «No encontrado · ROCKY 035» y el documento lleva `noindex`

#### Scenario: Categoría inexistente
- **WHEN** se abre `/products/no-existe`
- **THEN** el título no es el slug y el documento lleva `noindex`

#### Scenario: Vuelta a una página que existe
- **WHEN** desde una página no encontrada se navega a la portada
- **THEN** el documento ya no lleva `noindex`

#### Scenario: El catálogo aún no ha cargado
- **WHEN** se abre una ficha y el catálogo todavía está cargando
- **THEN** no se marca como no encontrada

### Requirement: Una sola URL por categoría
Una categoría SHALL tener una única URL, la de su handle. Abrirla por su nombre SHALL
sustituir la URL por la del handle sin añadir una entrada al historial.

#### Scenario: Categoría por nombre
- **WHEN** se abre `/products/ROCKY%20DROP%204`
- **THEN** la barra de direcciones pasa a `/products/rocky-drop-4` y «atrás» no vuelve a la URL por nombre

### Requirement: La barra marca la tienda en todo el catálogo
El enlace «Tienda» de la barra y del menú móvil SHALL quedar activo en la portada, en
los listados por categoría y en las fichas de producto.

#### Scenario: Listado por categoría
- **WHEN** se está en `/products/rocky-drop-4`
- **THEN** «Tienda» tiene el estado activo en la barra y en el menú móvil

### Requirement: Las rutas de la aplicación no redirigen por culpa de una carpeta
Una ruta de la aplicación que coincide con una carpeta de `dist/` SHALL responder con
el documento de la aplicación y sus cabeceras, sin redirección.

#### Scenario: Listado sin barra final
- **WHEN** se pide `/products`
- **THEN** responde 200 con el documento de la aplicación y `Cache-Control: public, max-age=0, must-revalidate`, no un 301
