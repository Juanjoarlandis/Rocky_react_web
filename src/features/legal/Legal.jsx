import { Link, useParams } from 'react-router';
import NotFound from '../../components/NotFound';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../../config/links';
import { LEGAL_ENTITY, LEGAL_PAGES, legalPath } from '../../config/legal';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import '../../styles/pages/legal.css';

/* Las cuatro páginas legales de la tienda. Texto plano y honesto, sin humo:
   quién está detrás, qué datos se tratan y cómo se compra y se devuelve.
   Los datos del titular viven en src/config/legal.js. */

const ULTIMA_REVISION = '4 de septiembre de 2026';

function Titular() {
  const e = LEGAL_ENTITY;
  return (
    <dl className="legal-titular">
      <dt>Titular</dt>
      <dd>{e.titular}</dd>
      <dt>NIF</dt>
      <dd>{e.nif}</dd>
      <dt>Domicilio</dt>
      <dd>{e.domicilio}</dd>
      <dt>Email</dt>
      <dd>
        <a href={`mailto:${e.email}`}>{e.email}</a>
      </dd>
      <dt>Web</dt>
      <dd>{e.web}</dd>
    </dl>
  );
}

function AvisoLegal() {
  return (
    <>
      <p>
        En cumplimiento de la Ley 34/2002, de servicios de la sociedad de la información y de
        comercio electrónico (LSSI-CE), estos son los datos de quien está detrás de{' '}
        {LEGAL_ENTITY.nombreComercial} y de la tienda {LEGAL_ENTITY.web}:
      </p>
      <Titular />
      <h2>Uso de la web</h2>
      <p>
        Navegar por la web es gratis y no exige registro. Al usarla aceptas estas condiciones, la{' '}
        <Link to={legalPath('privacidad')}>política de privacidad</Link>, la{' '}
        <Link to={legalPath('cookies')}>política de cookies</Link> y, si compras, las{' '}
        <Link to={legalPath('compra')}>condiciones de compra</Link>. Te comprometes a usar la web de
        forma lícita y a no intentar acceder a zonas restringidas ni a interferir con su
        funcionamiento.
      </p>
      <h2>Propiedad intelectual</h2>
      <p>
        Los diseños, ilustraciones, personajes, música, textos, fotografías y el propio código de la
        web son de {LEGAL_ENTITY.nombreComercial} o se usan con licencia. Se pueden ver y compartir
        enlazando a la web, pero no reproducir, modificar ni explotar comercialmente sin permiso por
        escrito. Las marcas de terceros que aparezcan pertenecen a sus dueños.
      </p>
      <h2>Responsabilidad</h2>
      <p>
        Procuramos que la información de la web esté al día, pero no garantizamos la ausencia de
        errores ni la disponibilidad continua del servicio. Los enlaces a sitios externos, como{' '}
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
          {INSTAGRAM_HANDLE}
        </a>
        , llevan a páginas que no controlamos.
      </p>
      <h2>Ley aplicable</h2>
      <p>
        Estas condiciones se rigen por la legislación española. Para cualquier conflicto, y sin
        perjuicio de los derechos que la ley reconoce a las personas consumidoras, serán competentes
        los juzgados y tribunales del domicilio del titular.
      </p>
    </>
  );
}

function Privacidad() {
  return (
    <>
      <p>
        Esta política explica qué datos personales tratamos en {LEGAL_ENTITY.web}, para qué y con
        qué base legal, conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018
        (LOPDGDD). Tratamos lo mínimo para que la tienda funcione y nada más.
      </p>
      <h2>Responsable del tratamiento</h2>
      <Titular />
      <h2>Qué datos tratamos y para qué</h2>
      <ul>
        <li>
          <strong>Compras.</strong> El pedido, el pago y el envío se gestionan con Shopify. Tratamos
          nombre, email, dirección y datos del pedido para atenderlo, facturarlo y cumplir las
          obligaciones fiscales. Base legal: ejecución del contrato y obligación legal. Los datos de
          la tarjeta nunca pasan por nuestra web: los procesa el proveedor de pago de Shopify.
        </li>
        <li>
          <strong>Avisos de drop.</strong> Si dejas tu email para que te avisemos cuando salga un
          producto, lo guardamos cifrado junto con el producto y la fecha del alta. Te mandamos un
          único correo el día del drop y, con ese envío, tu email sale de la lista. Base legal:
          consentimiento, que puedes retirar escribiéndonos antes del envío.
        </li>
        <li>
          <strong>Cuenta y Crew Rewards.</strong> Si inicias sesión con tu cuenta de cliente de
          Shopify, guardamos cifrado un identificador de tu cuenta, tu progreso (XP, nivel, Crew
          Tickets, cromos y avatar) y un historial acotado de pedidos acreditados. Base legal:
          ejecución del contrato del programa de fidelidad.
        </li>
        <li>
          <strong>Rocky IA.</strong> Los mensajes que escribes al asistente, y el beat de la mesa
          cuando le pides una barra, se envían a un modelo de lenguaje de un proveedor externo para
          generar la respuesta. No escribas datos personales en el chat. Base legal: interés
          legítimo en ofrecer ayuda sobre el catálogo.
        </li>
        <li>
          <strong>Ranking de La Colmena.</strong> Si publicas un beat, guardamos el beat, el nombre
          que le pones, el apodo que eliges y la fecha, y los enseñamos públicamente en la web. Para
          contar un «me mola» o un reporte por navegador y limitar las publicaciones usamos un
          identificador derivado de tu cookie de sesión, no tu email. No pongas tu nombre real ni
          datos personales en el apodo. Base legal: consentimiento, que das al publicar y puedes
          retirar pidiéndonos que lo quitemos.
        </li>
        <li>
          <strong>Seguridad.</strong> El servidor guarda registros técnicos (dirección IP, fecha,
          ruta y código de respuesta) sin cuerpos de mensajes ni emails, para prevenir abusos y
          fallos. Base legal: interés legítimo en la seguridad del servicio.
        </li>
      </ul>
      <h2>Quién más ve tus datos</h2>
      <p>
        No vendemos ni cedemos datos. Los tratan por nuestra cuenta, como encargados, estos
        proveedores: Shopify (tienda, pagos y cuentas de cliente), Resend (envío de los avisos de
        drop), OpenRouter (modelo de lenguaje de Rocky IA) y Cloudflare (red de entrega y protección
        de la web). Algunos están fuera del Espacio Económico Europeo; las transferencias se amparan
        en decisiones de adecuación o en cláusulas contractuales tipo de la Comisión Europea.
      </p>
      <h2>Cuánto tiempo los guardamos</h2>
      <ul>
        <li>Pedidos y facturas: el tiempo que exige la normativa fiscal y de consumo.</li>
        <li>Avisos de drop: hasta que se manda el aviso; entonces la lista se borra.</li>
        <li>Cuenta y Crew Rewards: mientras mantengas la cuenta o nos pidas borrarla.</li>
        <li>Mensajes de Rocky IA: no se guardan en nuestro servidor una vez respondidos.</li>
        <li>
          Beats del ranking: mientras sigan publicados o hasta que nos pidas quitarlos. La lista
          guarda como mucho 1.000; cuando se llena, salen primero los ocultados por reportes y los
          más antiguos con menos «me mola».
        </li>
        <li>Registros técnicos: un plazo breve, el necesario para diagnosticar incidencias.</li>
      </ul>
      <h2>Tus derechos</h2>
      <p>
        Puedes pedirnos acceso, rectificación, supresión, limitación, portabilidad y oposición, y
        retirar el consentimiento cuando quieras, escribiendo a{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>. Si crees que no te hemos
        atendido bien, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).
      </p>
    </>
  );
}

function Cookies() {
  return (
    <>
      <p>
        Esta web usa lo justo para funcionar. No hay cookies de analítica ni de publicidad, ni
        rastreadores de terceros, y por eso no te enseñamos ningún banner.
      </p>
      <h2>Lo que sí usamos</h2>
      <ul>
        <li>
          <strong>Cookie de sesión propia.</strong> Técnica y cifrada. Recuerda tu carrito, tus «me
          mola» del ranking y, si inicias sesión, tu cuenta. Sin ella no se puede comprar. Caduca al
          cerrar la sesión o tras un periodo de inactividad.
        </li>
        <li>
          <strong>Almacenamiento local del navegador.</strong> Guardamos preferencias que no salen
          de tu dispositivo: si ya has visto la intro, si te has apuntado a un aviso y el apodo que
          usas en el ranking. No permiten identificarte.
        </li>
        <li>
          <strong>Shopify.</strong> Al pasar al pago entras en el checkout de Shopify, que usa sus
          propias cookies técnicas conforme a su política.
        </li>
      </ul>
      <h2>Cómo gestionarlas</h2>
      <p>
        Puedes borrar o bloquear cookies y almacenamiento local desde la configuración de tu
        navegador. Si bloqueas la cookie de sesión, el carrito y el inicio de sesión dejarán de
        funcionar.
      </p>
    </>
  );
}

function Compra() {
  return (
    <>
      <p>
        Estas condiciones regulan las compras en {LEGAL_ENTITY.web}. Al hacer un pedido las aceptas.
        Las ventas las realiza el titular indicado en el{' '}
        <Link to={legalPath('aviso-legal')}>aviso legal</Link>.
      </p>
      <h2>Productos y precios</h2>
      <p>
        Vendemos ropa y accesorios en ediciones limitadas: cuando se agota una talla, se agotó. Los
        precios se muestran en euros con el IVA incluido. Los gastos de envío se calculan y se
        muestran en el checkout antes de confirmar el pedido. Nos reservamos el derecho a corregir
        errores evidentes de precio antes de aceptar un pedido.
      </p>
      <h2>Pedido y pago</h2>
      <p>
        El pedido se completa en el checkout seguro de Shopify con los medios de pago que allí se
        ofrecen. Recibirás un email de confirmación; el contrato se perfecciona con esa
        confirmación. Si un producto no está disponible después de confirmar, te avisaremos y te
        devolveremos el importe.
      </p>
      <h2>Envíos</h2>
      <p>
        Enviamos a las direcciones y países que aparecen en el checkout. El plazo estimado se indica
        al confirmar el pedido y empieza a contar desde que sale del taller. Si el paquete llega
        dañado, escríbenos en cuanto lo recibas con fotos del estado.
      </p>
      <h2>Derecho de desistimiento</h2>
      <p>
        Tienes 14 días naturales desde que recibes el pedido para devolverlo sin dar explicaciones.
        Escribe a <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a> indicando el
        número de pedido. El producto debe volver sin usar, con sus etiquetas y en su embalaje. Los
        gastos de devolución corren por tu cuenta salvo que el producto llegara defectuoso o
        equivocado. Te devolveremos el importe, incluido el envío estándar inicial, en un máximo de
        14 días desde que recibamos la devolución, por el mismo medio de pago. No admiten
        desistimiento los productos personalizados ni los precintados que no puedan devolverse por
        razones de higiene una vez abiertos.
      </p>
      <h2>Garantía</h2>
      <p>
        Todos los productos tienen la garantía legal de conformidad de tres años que establece la
        normativa española de consumo. Si algo llega con un defecto de fabricación, lo reparamos, lo
        sustituimos o te devolvemos el dinero.
      </p>
      <h2>Reclamaciones</h2>
      <p>
        Para cualquier incidencia escríbenos primero a{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>. Como persona consumidora
        también puedes acudir a las Juntas Arbitrales de Consumo o a la plataforma de resolución de
        litigios en línea de la Unión Europea (ec.europa.eu/consumers/odr).
      </p>
    </>
  );
}

const CONTENIDO = Object.freeze({
  'aviso-legal': AvisoLegal,
  privacidad: Privacidad,
  cookies: Cookies,
  compra: Compra,
});

export default function Legal() {
  const { page } = useParams();
  const pagina = LEGAL_PAGES.find((candidate) => candidate.slug === page);
  useDocumentTitle(pagina?.title);
  if (!pagina) return <NotFound />;
  const Contenido = CONTENIDO[pagina.slug];

  return (
    <div className="page-container legal">
      <h1 className="page-title">{pagina.title}</h1>
      <p className="subtitle">Última revisión: {ULTIMA_REVISION}</p>
      <nav className="legal-nav" aria-label="Páginas legales">
        {LEGAL_PAGES.map((item) => (
          <Link
            key={item.slug}
            to={legalPath(item.slug)}
            className={item.slug === pagina.slug ? 'is-active' : undefined}
            aria-current={item.slug === pagina.slug ? 'page' : undefined}
          >
            {item.title}
          </Link>
        ))}
      </nav>
      <article className="legal-texto">
        <Contenido />
      </article>
    </div>
  );
}
