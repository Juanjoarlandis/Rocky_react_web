# Puerta privada “We are cooking”

## Objetivo

Sustituir temporalmente la entrada pública de `rocky035.com` por una portada
ROCKY 035 con contraseña, sin entregar la SPA, sus recursos ni sus APIs a un
visitante que no haya superado la puerta.

## No objetivos

- No implementar cuentas nuevas ni reutilizar las cuentas de cliente Shopify.
- No modificar React, el catálogo, el carrito ni los personajes existentes.
- No guardar una contraseña en Git, en el bundle de Vite ni en el navegador.
- No cambiar Cloudflare, Shopify ni servicios ajenos salvo la purga de caché
  necesaria durante el despliegue.

## Restricciones

- El repositorio contiene cambios locales ya desplegados que deben conservarse.
- La producción sirve la aplicación mediante Express detrás de Cloudflare
  Tunnel; una comprobación exclusivamente cliente no constituye protección.
- El healthcheck del contenedor debe seguir funcionando desde loopback.
- El webhook Shopify firmado puede seguir entrando como única excepción de
  máquina; no debe abrir ninguna ruta navegable.

## Enfoque

- `SITE_ACCESS_ENABLED=true` activa la puerta. Si se activa sin
  `SITE_ACCESS_PASSWORD`, el servidor falla al arrancar.
- Express comprueba la puerta antes de las rutas de usuario, APIs y archivos
  estáticos. Las peticiones de documentos sin sesión reciben la portada; los
  intentos directos contra APIs o recursos reciben una respuesta cerrada.
- El formulario compara la contraseña en tiempo constante y limita intentos por
  IP. Un acierto rota la sesión `HttpOnly`, guarda una concesión temporal y
  redirige a `/`.
- La concesión caduca y queda invalidada al reiniciar el proceso. No se expone la
  contraseña ni un verificador reutilizable en la cookie.
- La portada se sirve sin React ni JavaScript y reutiliza tipografías y un
  conjunto mínimo de personajes ya incluidos en el build. Todos sus recursos
  tienen rutas explícitas y `no-store`.
- Mientras la puerta esté activa, incluso los recursos autenticados se marcan
  como privados/no-store para impedir que Cloudflare los comparta con visitantes
  sin cookie. El despliegue purga o invalida la caché pública anterior.

## Criterios de aceptación

- `/`, `/cart`, `/crew` y cualquier otra ruta navegable muestran únicamente la
  portada sin una sesión concedida.
- `/api/*`, `/assets/*`, productos, manifiesto, música y archivos conocidos no
  entregan contenido de la aplicación sin sesión.
- Una contraseña incorrecta no crea sesión, no revela detalles y termina
  limitada tras varios intentos.
- La contraseña correcta crea una cookie `HttpOnly`, `SameSite=Lax` y `Secure`
  en producción; tras ella, la SPA y sus APIs funcionan con normalidad.
- Reiniciar el proceso invalida las concesiones anteriores.
- El healthcheck solo es público desde loopback cuando la puerta está activa.
- El webhook conserva su validación HMAC y no habilita navegación.
- Pruebas dirigidas, suite completa, build, escaneo de secretos y smoke de
  navegador/HTTP pasan antes de activar producción.

## Riesgos y despliegue

- Los recursos que Cloudflare ya tenga cacheados pueden sobrevivir al cambio de
  origen; se debe purgar la caché y verificar desde una sesión limpia.
- Una contraseña compartida no identifica personas. Es una barrera temporal de
  preestreno, no un sistema de autorización multiusuario.
- El rollback restaura la release anterior, pero vuelve a hacer pública la web;
  solo debe usarse conscientemente si la puerta falla.
