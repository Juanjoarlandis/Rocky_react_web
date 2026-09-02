/** Diana giratoria para estados de carga. Tinta y acento salen de los tokens
    del tema, así que en modo neón se vuelve de luz sola. */
export function CrosshairSpinner(props) {
  return (
    <svg
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      {...props}
    >
      <circle cx="30" cy="30" r="17" fill="none" stroke="var(--ink)" strokeWidth="4.5" />
      <path
        d="M8 30 L20 30 M40 30 L52 30 M30 8 L30 20 M30 40 L30 52"
        stroke="var(--accent)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="30" cy="30" r="4" fill="var(--ink)" />
    </svg>
  );
}

export default CrosshairSpinner;
