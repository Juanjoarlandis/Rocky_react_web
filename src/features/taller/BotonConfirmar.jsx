import { useEffect, useState } from 'react';

/* Un botón que pide una segunda pulsación para lo que no tiene vuelta fácil
   (despublicar, quitar un diseño). Sin diálogos del navegador; a los 4 s sin
   confirmar vuelve a su estado. */
export default function BotonConfirmar({
  etiqueta,
  onConfirmar,
  className = 'btn btn--ghost btn--sm',
  disabled = false,
}) {
  const [armado, setArmado] = useState(false);

  useEffect(() => {
    if (!armado) return undefined;
    const id = setTimeout(() => setArmado(false), 4_000);
    return () => clearTimeout(id);
  }, [armado]);

  return (
    <button
      type="button"
      className={`${className}${armado ? ' is-armed' : ''}`}
      disabled={disabled}
      onClick={() => {
        if (!armado) return setArmado(true);
        setArmado(false);
        return onConfirmar();
      }}
    >
      {armado ? '¿Seguro? Pulsa otra vez' : etiqueta}
    </button>
  );
}
