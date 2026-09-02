// Portada dibujada para EPs sin artwork todavía. Es un bloque entintado, así
// que usa el par --ink-block / --ink-block-text: de día tinta con las
// iniciales en papel, de noche el morado hondo del tema con letras de luz.
export function EpCover({ initials }) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="ep-cover"
      aria-hidden="true"
    >
      <rect
        x="6"
        y="6"
        width="188"
        height="188"
        rx="10"
        fill="var(--ink-block)"
        stroke="var(--ink)"
        strokeWidth="5"
      />
      <circle cx="100" cy="86" r="34" fill="none" stroke="var(--accent)" strokeWidth="5" />
      <path
        d="M100 44 L100 62 M100 110 L100 128 M58 86 L76 86 M124 86 L142 86"
        stroke="var(--accent)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx="100" cy="86" r="4" fill="var(--ink-block-text)" />
      <text
        x="100"
        y="166"
        textAnchor="middle"
        fontFamily="'Luckiest Guy', cursive"
        fontSize="34"
        fill="var(--ink-block-text)"
      >
        {initials}
      </text>
    </svg>
  );
}

export default EpCover;
