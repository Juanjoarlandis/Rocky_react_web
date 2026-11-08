// LOS PADS — 16 almohadillas al estilo MPC. Se tocan con el ratón, con el
// dedo o con las teclas 1234 / QWER / ASDF / ZXCV.
function BeatPads({ pads, teclas, onHit, activo }) {
  return (
    <div className="pads-rejilla" role="group" aria-label="Pads de sonido">
      {pads.map((pad, i) => (
        <button
          key={pad.id}
          type="button"
          className={`pad pad--${pad.tipo || 'medio'} ${activo === pad.id ? 'pad--golpe' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.focus({ preventScroll: true });
            onHit(pad, i);
          }}
          onClick={(e) => {
            // Teclado y tecnologías de apoyo emiten click sin pointerDown.
            if (e.detail === 0) onHit(pad, i);
          }}
          aria-label={`Pad ${i + 1}: ${pad.label}`}
        >
          <span className="pad-tecla" aria-hidden="true">
            {teclas[i].toUpperCase()}
          </span>
          <span className="pad-label">{pad.label}</span>
        </button>
      ))}
    </div>
  );
}

export default BeatPads;
