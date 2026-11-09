import { useRef, useState } from 'react';
import * as api from '../../api/taller.js';
import BotonConfirmar from './BotonConfirmar';

const TALLAS = ['S', 'M', 'L', 'XL'];

/* Las tallas del formulario a partir de las de un diseño: cada una incluida o
   no, con sus unidades o sin límite. */
function tallasDe(sizes = []) {
  return Object.fromEntries(
    TALLAS.map((talla) => {
      const actual = sizes.find((size) => size.size === talla);
      return [
        talla,
        {
          incluida: Boolean(actual),
          sinLimite: actual ? actual.quantity === null : false,
          unidades: actual?.quantity ?? 0,
        },
      ];
    })
  );
}

function DisenoForm({ inicial, nombre, boton, exigirFoto, onEnviar, onFallo }) {
  const [titulo, setTitulo] = useState(inicial?.title ?? '');
  const [descripcion, setDescripcion] = useState(inicial?.description ?? '');
  const [precio, setPrecio] = useState(inicial?.price ?? '');
  const [tallas, setTallas] = useState(() => tallasDe(inicial?.sizes));
  const [foto, setFoto] = useState(null);
  const [estado, setEstado] = useState({ tipo: 'reposo', texto: '' });
  const fotoRef = useRef(null);

  const cambiarTalla = (talla, cambios) =>
    setTallas((actual) => ({ ...actual, [talla]: { ...actual[talla], ...cambios } }));

  async function subirFoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setEstado({ tipo: 'ocupado', texto: 'Subiendo la foto…' });
    try {
      setFoto(await api.uploadImage(file, titulo || 'Diseño'));
      setEstado({ tipo: 'ok', texto: 'Foto subida.' });
    } catch (error) {
      setEstado({ tipo: 'fallo', texto: error.message });
      onFallo?.(error);
    }
  }

  async function enviar(event) {
    event.preventDefault();
    const sizes = TALLAS.filter((talla) => tallas[talla].incluida).map((talla) => ({
      size: talla,
      quantity: tallas[talla].sinLimite ? null : Number(tallas[talla].unidades) || 0,
    }));
    if (exigirFoto && !foto) {
      setEstado({ tipo: 'fallo', texto: 'Falta la foto del diseño.' });
      return;
    }
    if (!sizes.length) {
      setEstado({ tipo: 'fallo', texto: 'Elige al menos una talla.' });
      return;
    }
    const body = {
      title: titulo.trim(),
      description: descripcion,
      price: String(precio).trim().replace(',', '.'),
      sizes,
    };
    if (foto) body.fileId = foto.fileId;
    setEstado({ tipo: 'ocupado', texto: '' });
    try {
      await onEnviar(body);
      // El de crear se vacía: otro envío crearía un diseño repetido.
      if (!inicial) {
        setTitulo('');
        setDescripcion('');
        setPrecio('');
        setTallas(tallasDe());
        setFoto(null);
        if (fotoRef.current) fotoRef.current.value = '';
      }
      setEstado({ tipo: 'ok', texto: 'Guardado.' });
    } catch (error) {
      setEstado({ tipo: 'fallo', texto: error.message });
      onFallo?.(error);
    }
  }

  return (
    <form
      className="paper-card taller-form taller-diseno-form"
      onSubmit={enviar}
      aria-label={nombre}
    >
      <div className="taller-fila">
        <label className="taller-campo">
          <span>Título</span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={80}
            required
          />
        </label>
        <label className="taller-campo taller-campo--corto">
          <span>Precio (€)</span>
          <input
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            inputMode="decimal"
            required
            placeholder="34.99"
          />
        </label>
      </div>
      <label className="taller-campo">
        <span>Descripción</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={1000}
          rows={2}
        />
      </label>
      <fieldset className="taller-tallas">
        <legend>Tallas y unidades</legend>
        {TALLAS.map((talla) => {
          const estadoTalla = tallas[talla];
          return (
            <div key={talla} className="taller-talla">
              <label>
                <input
                  type="checkbox"
                  checked={estadoTalla.incluida}
                  onChange={(e) => cambiarTalla(talla, { incluida: e.target.checked })}
                  aria-label={`Talla ${talla}`}
                />
                <span aria-hidden="true">{talla}</span>
              </label>
              <input
                type="number"
                min={0}
                max={999}
                value={estadoTalla.unidades}
                onChange={(e) => cambiarTalla(talla, { unidades: e.target.value })}
                disabled={!estadoTalla.incluida || estadoTalla.sinLimite}
                aria-label={`Unidades de la ${talla}`}
              />
              <label className="taller-sin-limite">
                <input
                  type="checkbox"
                  checked={estadoTalla.sinLimite}
                  onChange={(e) => cambiarTalla(talla, { sinLimite: e.target.checked })}
                  disabled={!estadoTalla.incluida}
                  aria-label={`${talla} sin límite`}
                />
                <span aria-hidden="true">∞</span>
              </label>
            </div>
          );
        })}
      </fieldset>
      <label className="taller-campo">
        <span>Foto</span>
        <input
          ref={fotoRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={subirFoto}
        />
      </label>
      {foto && <img className="taller-miniatura" src={foto.url} alt="" width="80" height="80" />}
      {estado.texto && (
        <p
          className={estado.tipo === 'fallo' ? 'taller-fallo' : 'taller-ok'}
          role={estado.tipo === 'fallo' ? 'alert' : 'status'}
        >
          {estado.texto}
        </p>
      )}
      <button
        type="submit"
        className="btn btn--primary btn--sm"
        disabled={estado.tipo === 'ocupado'}
      >
        {boton}
      </button>
    </form>
  );
}

function resumenTallas(sizes) {
  return sizes
    .map(({ size, quantity }) => `${size} ${quantity === null ? '∞' : quantity}`)
    .join(' · ');
}

export default function DisenosEditor({ drop, onCambio, onFallo }) {
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState(null);
  const [fallo, setFallo] = useState('');

  async function buscar(event) {
    event.preventDefault();
    setFallo('');
    try {
      const { products } = await api.searchProducts(busqueda);
      setResultados(products);
    } catch (error) {
      setFallo(error.message);
      onFallo?.(error);
    }
  }

  async function ejecutar(fn) {
    setFallo('');
    try {
      await fn();
      await onCambio();
    } catch (error) {
      setFallo(error.message);
      onFallo?.(error);
    }
  }

  return (
    <section className="taller-disenos" aria-label="Diseños del drop">
      <h3 className="taller-subtitulo">Diseños</h3>
      {fallo && (
        <p className="taller-fallo" role="alert">
          {fallo}
        </p>
      )}
      <ul className="taller-disenos-lista">
        {drop.designs.map((design) => (
          <li key={design.id} className="paper-card taller-diseno" aria-label={design.title}>
            {design.image ? (
              <img
                className="taller-miniatura"
                src={design.image.url}
                alt=""
                width="64"
                height="64"
              />
            ) : (
              <span className="taller-miniatura taller-miniatura--vacia" aria-hidden="true" />
            )}
            <span className="taller-diseno-datos">
              <strong>{design.title}</strong>
              <span>
                {design.price} € · {resumenTallas(design.sizes)}
              </span>
            </span>
            <span className="taller-acciones">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setEditando(editando === design.id ? null : design.id)}
                aria-expanded={editando === design.id}
              >
                Editar
              </button>
              <BotonConfirmar
                etiqueta="Quitar del drop"
                onConfirmar={() => ejecutar(() => api.removeDesign(drop.handle, design.id))}
              />
            </span>
            {editando === design.id && (
              <DisenoForm
                inicial={design}
                nombre={`Editar ${design.title}`}
                boton="Guardar diseño"
                onFallo={onFallo}
                onEnviar={async (body) => {
                  await api.updateDesign(design.id, body);
                  await onCambio();
                }}
              />
            )}
          </li>
        ))}
      </ul>

      <DisenoForm
        nombre="Nuevo diseño"
        boton="Crear diseño"
        exigirFoto
        onFallo={onFallo}
        onEnviar={async (body) => {
          await api.createDesign(drop.handle, body);
          await onCambio();
        }}
      />

      <form className="taller-buscar" onSubmit={buscar} aria-label="Añadir un producto existente">
        <label className="taller-campo">
          <span>Buscar un producto existente</span>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} maxLength={60} />
        </label>
        <button type="submit" className="btn btn--ghost btn--sm">
          Buscar
        </button>
      </form>
      {resultados && (
        <ul className="taller-resultados">
          {resultados.length === 0 && <li className="taller-ayuda">Nada con ese nombre.</li>}
          {resultados.map((product) => {
            const ajeno = Boolean(product.drop) && product.drop !== drop.handle;
            return (
              <li key={product.id} className="taller-resultado">
                <span>
                  {product.title}
                  {product.drop && <small> · {product.drop}</small>}
                </span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={ajeno || product.drop === drop.handle}
                  onClick={() => ejecutar(() => api.addExistingDesign(drop.handle, product.id))}
                  aria-label={`Añadir ${product.title}`}
                >
                  Añadir
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
