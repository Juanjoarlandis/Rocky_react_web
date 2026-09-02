// Abeja garabateada de La Colmena, con su vuelo en trazos discontinuos.
// Ojo de diana para que sea de la familia. Trazo, papel y acento salen de
// los tokens del tema; la miel del cuerpo llega por currentColor, que pone
// la hoja de estilos de la página (`.studio-bee { color: var(--honey) }`).
export function BeeDoodle(props) {
  return (
    <svg
      viewBox="0 0 200 120"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      {...props}
    >
      {/* Vuelo en bucle */}
      <path
        d="M6 96 Q40 36 78 66 Q104 88 88 100 Q70 108 78 88 Q90 62 128 62"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeDasharray="6 6"
        strokeLinecap="round"
      />
      {/* Alas */}
      <ellipse
        cx="152"
        cy="38"
        rx="13"
        ry="19"
        transform="rotate(-24 152 38)"
        fill="var(--card)"
        stroke="var(--ink)"
        strokeWidth="3.5"
      />
      <ellipse
        cx="170"
        cy="36"
        rx="11"
        ry="16"
        transform="rotate(18 170 36)"
        fill="var(--card)"
        stroke="var(--ink)"
        strokeWidth="3.5"
      />
      {/* Cuerpo a rayas miel */}
      <ellipse
        cx="158"
        cy="70"
        rx="30"
        ry="21"
        fill="currentColor"
        stroke="var(--ink)"
        strokeWidth="4.5"
      />
      <path
        d="M148 51 L144 89 M162 50 L160 91 M176 55 L174 86"
        stroke="var(--ink)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Cabeza con ojo de diana */}
      <circle cx="130" cy="66" r="13" fill="var(--card)" stroke="var(--ink)" strokeWidth="4" />
      <circle cx="128" cy="65" r="4.5" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <path
        d="M121.5 65 L134.5 65 M128 58.5 L128 71.5"
        stroke="var(--accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Antenas */}
      <path
        d="M124 54 Q120 46 113 44 M135 53 Q135 44 141 40"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="112" cy="43" r="2.6" fill="var(--ink)" />
      <circle cx="142" cy="39" r="2.6" fill="var(--ink)" />
      {/* Aguijón */}
      <path d="M187 72 L197 76 L186 80 Z" fill="var(--ink)" />
    </svg>
  );
}

export default BeeDoodle;
