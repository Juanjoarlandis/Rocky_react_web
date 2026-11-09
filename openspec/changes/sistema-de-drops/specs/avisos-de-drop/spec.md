# Spec Delta

## Purpose

Que quien se apunta al aviso de un drop, desde donde sea, reciba un solo correo cuando cae,
con el título y el enlace del drop.

## ADDED Requirements

### Requirement: Una lista de avisos por drop
El formulario de aviso de un drop anunciado SHALL apuntar el email en la lista de ese drop,
con el handle del drop como clave. Vale para el cartel, la página del drop y la portada.

#### Scenario: Apuntarse desde el cartel
- **WHEN** alguien se apunta desde las pestañas del cartel del Drop 6
- **THEN** su email queda en la lista `rocky-drop-6`

### Requirement: El servidor reconoce los drops públicos
El servidor SHALL aceptar avisos para cualquier drop anunciado o a la venta, sin depender del
tamaño del catálogo. SHALL rechazar las claves que no sean un drop público ni un producto
publicado, como hasta ahora.

#### Scenario: Drop anunciado con la tienda grande
- **WHEN** la tienda tiene más de 50 productos y alguien se apunta al Drop 6 anunciado
- **THEN** el aviso se acepta

#### Scenario: Clave inventada
- **WHEN** llega un aviso para `rocky-drop-inventado`
- **THEN** se rechaza como clave desconocida

### Requirement: El envío se hace por drop y junta las listas
El envío de avisos SHALL poder hacerse por drop:
1. junta la lista del drop con las de sus diseños y quita los emails repetidos;
2. manda un correo por persona, con el título del drop y el enlace a su página;
3. marca cada lista como enviada y la borra al terminar, como hasta ahora.

Sin la opción de aplicar, SHALL ser un simulacro.

#### Scenario: Email en dos listas del mismo drop
- **WHEN** un email está en la lista del Drop 6 y en la de uno de sus diseños y se envía el Drop 6
- **THEN** recibe un único correo que enlaza a `/products/rocky-drop-6`

#### Scenario: Simulacro
- **WHEN** se lanza el envío del Drop 6 sin la opción de aplicar
- **THEN** cuenta los destinatarios y enseña el correo, sin enviar ni marcar nada
