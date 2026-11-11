# Spec Delta

## Purpose

Que los rótulos de página parezcan impresos en un fanzine de dos tintas: la negra y una
segunda pasada azul que no acaba de casar, como una risografía.

## ADDED Requirements

### Requirement: De día los rótulos llevan una segunda tinta corrida
De día, cada rótulo de página SHALL mostrar, detrás de la tinta negra, una copia en el azul de
la casa desplazada una fracción de su tamaño hacia abajo y a la derecha, con el borde duro y
sin desenfoque. El rótulo SHALL seguir leyéndose con el mismo contraste que hoy. El logotipo de
la barra SHALL NOT cambiar.

#### Scenario: Título de la portada
- **WHEN** se abre la portada de día
- **THEN** el rótulo «ROCKY 035» se ve en negro con un filo azul abajo y a la derecha, y el logotipo de la barra sigue igual

#### Scenario: De noche
- **WHEN** se enciende el modo noche
- **THEN** los rótulos son el tubo de neón de hoy, sin la tinta azul

### Requirement: La segunda tinta entra en registro al llegar
Con movimiento sin reducir, al mostrarse un rótulo su segunda tinta SHALL empezar más
desplazada y asentarse en su sitio en menos de un segundo, una sola vez. En la portada con
intro, SHALL asentarse después de que la intro se vaya. Con movimiento reducido, la segunda
tinta SHALL verse ya en su sitio.

#### Scenario: Llegar a una página
- **WHEN** se abre la página de la Crew de día
- **THEN** la tinta azul del rótulo se desliza hasta su sitio y se queda quieta

#### Scenario: Movimiento reducido
- **WHEN** alguien con movimiento reducido abre una página
- **THEN** la tinta azul ya está en su sitio y no se mueve
