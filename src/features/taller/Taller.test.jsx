import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/http.js';
import * as api from '../../api/taller.js';
import Taller from './Taller';

vi.mock('../../api/taller.js', () => ({
  getSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  listDrops: vi.fn(),
  createDrop: vi.fn(),
  updateDrop: vi.fn(),
  scheduleDrop: vi.fn(),
  unscheduleDrop: vi.fn(),
  createDesign: vi.fn(),
  updateDesign: vi.fn(),
  addExistingDesign: vi.fn(),
  removeDesign: vi.fn(),
  searchProducts: vi.fn(),
  uploadImage: vi.fn(),
  listarParedes: vi.fn(),
  detallePared: vi.fn(),
  ocultarFirma: vi.fn(),
  mostrarFirma: vi.fn(),
  borrarFirma: vi.fn(),
  limpiarPared: vi.fn(),
  interruptorPared: vi.fn(),
}));

const DESIGN = {
  id: 'gid://shopify/Product/1',
  handle: 'rocky-el-jefe',
  title: 'El Jefe',
  description: 'Aquí manda él.',
  image: { url: 'https://cdn.shopify.com/jefe.png', alt: '' },
  price: '34.99',
  sizes: [
    { size: 'S', quantity: null, availableForSale: true },
    { size: 'M', quantity: 3, availableForSale: true },
  ],
  publishedOnHeadless: false,
  status: 'ACTIVE',
};

const DROP = {
  handle: 'rocky-drop-7',
  title: 'ROCKY DROP 7',
  poster: null,
  config: {
    version: 1,
    number: 7,
    tagline: 'Pronto',
    story: '',
    launchAt: '2026-11-12T20:00:00+01:00',
    endsAt: null,
    status: 'borrador',
  },
  state: 'borrador',
  designs: [DESIGN],
  notices: 4,
};

function renderTaller() {
  return render(
    <MemoryRouter>
      <Taller />
    </MemoryRouter>
  );
}

async function entrarAlPanel() {
  api.getSession.mockResolvedValue({ active: true, expiresAt: '2026-11-10T20:00:00.000Z' });
  api.listDrops.mockResolvedValue({ drops: [DROP] });
  renderTaller();
  await screen.findByRole('heading', { level: 1, name: 'El Taller' });
}

async function abrirDrop() {
  await entrarAlPanel();
  fireEvent.click(await screen.findByRole('button', { name: /ROCKY DROP 7/ }));
  return screen.findByRole('region', { name: 'Editar ROCKY DROP 7' });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('El Taller: entrada', () => {
  it('si el servidor lo tiene apagado, lo dice', async () => {
    api.getSession.mockRejectedValue(
      new ApiError('El Taller no está disponible.', { status: 404, code: 'TALLER_DISABLED' })
    );
    renderTaller();
    expect(await screen.findByText(/el taller no está disponible/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Clave')).not.toBeInTheDocument();
  });

  it('pide clave y código de la app, y entra', async () => {
    api.getSession.mockResolvedValue({ active: false, expiresAt: null });
    api.login.mockResolvedValue({ active: true, expiresAt: '2026-11-10T20:00:00.000Z' });
    api.listDrops.mockResolvedValue({ drops: [] });
    renderTaller();
    const clave = await screen.findByLabelText('Clave');
    expect(clave).toHaveAttribute('type', 'password');
    expect(clave).toHaveAttribute('autocomplete', 'current-password');
    const codigo = screen.getByLabelText('Código de la app');
    expect(codigo).toHaveAttribute('autocomplete', 'one-time-code');
    fireEvent.change(clave, { target: { value: 'la clave' } });
    fireEvent.change(codigo, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await screen.findByRole('heading', { level: 1, name: 'El Taller' });
    expect(api.login).toHaveBeenCalledWith({ password: 'la clave', code: '123456' });
  });

  it('un fallo de entrada se anuncia sin decir qué falló', async () => {
    api.getSession.mockResolvedValue({ active: false, expiresAt: null });
    api.login.mockRejectedValue(
      new ApiError('La clave o el código no valen.', { status: 401, code: 'TALLER_LOGIN_FAILED' })
    );
    renderTaller();
    fireEvent.change(await screen.findByLabelText('Clave'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Código de la app'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La clave o el código no valen.');
  });

  it('sale del Taller', async () => {
    await entrarAlPanel();
    api.logout.mockResolvedValue(null);
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(await screen.findByLabelText('Clave')).toBeInTheDocument();
  });
});

describe('El Taller: drops', () => {
  it('lista los drops con su estado y los avisos apuntados', async () => {
    await entrarAlPanel();
    const fila = await screen.findByRole('button', { name: /ROCKY DROP 7/ });
    expect(fila).toHaveTextContent('Borrador');
    expect(fila).toHaveTextContent('4 avisos apuntados');
    expect(fila).toHaveTextContent('1 diseño');
  });

  it('crea un drop nuevo en borrador', async () => {
    await entrarAlPanel();
    api.createDrop.mockResolvedValue({ handle: 'rocky-drop-8' });
    const form = screen.getByRole('form', { name: 'Nuevo drop' });
    fireEvent.change(within(form).getByLabelText('Título'), { target: { value: 'ROCKY DROP 8' } });
    fireEvent.change(within(form).getByLabelText('Número'), { target: { value: '8' } });
    fireEvent.change(within(form).getByLabelText('Slug'), { target: { value: '8' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Crear drop' }));
    await waitFor(() =>
      expect(api.createDrop).toHaveBeenCalledWith({ title: 'ROCKY DROP 8', number: 8, slug: '8' })
    );
    expect(api.listDrops).toHaveBeenCalledTimes(2);
  });

  it('guarda las fechas escritas en hora de Madrid como ISO con su zona', async () => {
    const editor = await abrirDrop();
    api.updateDrop.mockResolvedValue({ handle: 'rocky-drop-7' });
    const lanzamiento = within(editor).getByLabelText('Lanzamiento (hora de Madrid)');
    expect(lanzamiento).toHaveValue('2026-11-12T20:00');
    fireEvent.change(lanzamiento, { target: { value: '2026-11-14T21:30' } });
    fireEvent.change(within(editor).getByLabelText('Cierre (hora de Madrid)'), {
      target: { value: '2026-11-20T20:00' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(api.updateDrop).toHaveBeenCalled());
    expect(api.updateDrop.mock.calls[0][1]).toMatchObject({
      launchAt: '2026-11-14T21:30:00+01:00',
      endsAt: '2026-11-20T20:00:00+01:00',
    });
  });

  it('enseña el error del servidor al guardar', async () => {
    const editor = await abrirDrop();
    api.updateDrop.mockRejectedValue(
      new ApiError('El cierre tiene que ser al menos una hora después del lanzamiento.', {
        status: 400,
        code: 'DROP_INVALID',
      })
    );
    fireEvent.click(within(editor).getByRole('button', { name: 'Guardar' }));
    expect(await within(editor).findByRole('alert')).toHaveTextContent(/al menos una hora/);
  });

  it('programa un borrador', async () => {
    const editor = await abrirDrop();
    api.scheduleDrop.mockResolvedValue({ handle: 'rocky-drop-7' });
    fireEvent.click(within(editor).getByRole('button', { name: 'Programar el drop' }));
    await waitFor(() => expect(api.scheduleDrop).toHaveBeenCalledWith('rocky-drop-7'));
  });

  it('despublicar pide confirmación con una segunda pulsación', async () => {
    api.getSession.mockResolvedValue({ active: true, expiresAt: null });
    api.listDrops.mockResolvedValue({
      drops: [{ ...DROP, state: 'anunciado', config: { ...DROP.config, status: 'programado' } }],
    });
    renderTaller();
    fireEvent.click(await screen.findByRole('button', { name: /ROCKY DROP 7/ }));
    const editor = await screen.findByRole('region', { name: 'Editar ROCKY DROP 7' });
    api.unscheduleDrop.mockResolvedValue({ handle: 'rocky-drop-7' });
    fireEvent.click(within(editor).getByRole('button', { name: 'Despublicar' }));
    expect(api.unscheduleDrop).not.toHaveBeenCalled();
    fireEvent.click(within(editor).getByRole('button', { name: '¿Seguro? Pulsa otra vez' }));
    await waitFor(() => expect(api.unscheduleDrop).toHaveBeenCalledWith('rocky-drop-7'));
  });

  it('enseña la vista previa del cartel en sus cuatro estados, sin que se pueda tocar', async () => {
    const editor = await abrirDrop();
    const vista = within(editor).getByRole('region', { name: 'Vista previa del cartel' });
    const carteles = vista.querySelectorAll('article');
    expect([...carteles].map((c) => c.className.match(/cartel--([\w-]+)/)[1])).toEqual([
      'anunciado',
      'en-la-calle',
      'ultimas-horas',
      'archivo',
    ]);
    // inert: ni sus pestañas apuntan avisos de verdad ni su enlace saca del Taller.
    expect(vista.querySelector('.taller-vista-carteles')).toHaveAttribute('inert');
    expect(vista.querySelector('article h4')).not.toBe(null);
    expect(vista.querySelector('article h2')).toBe(null);
  });

  it('con cambios sin guardar no deja programar: programaría la fecha vieja', async () => {
    const editor = await abrirDrop();
    const programar = within(editor).getByRole('button', { name: 'Programar el drop' });
    expect(programar).toBeEnabled();
    fireEvent.change(within(editor).getByLabelText('Lanzamiento (hora de Madrid)'), {
      target: { value: '2026-11-14T21:30' },
    });
    expect(programar).toBeDisabled();
    expect(within(editor).getByText(/Guarda los cambios antes de programar/)).toBeInTheDocument();
  });

  it('si el permiso ha caducado, vuelve a la entrada', async () => {
    const editor = await abrirDrop();
    const caducado = new ApiError('Entra en el Taller para seguir.', {
      status: 401,
      code: 'TALLER_AUTH_REQUIRED',
    });
    api.scheduleDrop.mockRejectedValue(caducado);
    api.listDrops.mockRejectedValue(caducado);
    fireEvent.click(within(editor).getByRole('button', { name: 'Programar el drop' }));
    expect(await screen.findByLabelText('Clave')).toBeInTheDocument();
  });

  it('sube el cartel y lo manda al guardar', async () => {
    const editor = await abrirDrop();
    api.uploadImage.mockResolvedValue({
      fileId: 'gid://shopify/MediaImage/9',
      url: 'https://cdn.shopify.com/c.png',
    });
    api.updateDrop.mockResolvedValue({ handle: 'rocky-drop-7' });
    const file = new File(['png'], 'cartel.png', { type: 'image/png' });
    fireEvent.change(within(editor).getByLabelText('Cartel'), { target: { files: [file] } });
    await waitFor(() =>
      expect(api.uploadImage).toHaveBeenCalledWith(file, 'Cartel del ROCKY DROP 7')
    );
    fireEvent.click(within(editor).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(api.updateDrop).toHaveBeenCalled());
    expect(api.updateDrop.mock.calls[0][1].poster).toEqual({
      url: 'https://cdn.shopify.com/c.png',
      alt: 'Cartel del ROCKY DROP 7',
    });
  });
});

describe('El Taller: diseños', () => {
  // La voz de la crew (voz-de-la-crew): el campo explica cómo firma un muñeco.
  it('bajo la descripción dice cómo firmarla con un muñeco de la crew', async () => {
    const editor = await abrirDrop();
    const form = within(editor).getByRole('form', { name: 'Nuevo diseño' });

    expect(within(form).getByLabelText('Descripción')).toHaveAccessibleDescription(
      /termina con «— El Paquetes»/
    );
  });

  it('crea un diseño completo con foto, precio y tallas', async () => {
    const editor = await abrirDrop();
    api.uploadImage.mockResolvedValue({
      fileId: 'gid://shopify/MediaImage/5',
      url: 'https://cdn.shopify.com/f.png',
    });
    api.createDesign.mockResolvedValue(DESIGN);
    const form = within(editor).getByRole('form', { name: 'Nuevo diseño' });
    fireEvent.change(within(form).getByLabelText('Título'), { target: { value: 'En las nubes' } });
    fireEvent.change(within(form).getByLabelText('Descripción'), { target: { value: 'Paseo.' } });
    fireEvent.change(within(form).getByLabelText('Precio (€)'), { target: { value: '34,99' } });
    fireEvent.click(within(form).getByRole('checkbox', { name: 'Talla M' }));
    fireEvent.change(within(form).getByLabelText('Unidades de la M'), { target: { value: '5' } });
    fireEvent.click(within(form).getByRole('checkbox', { name: 'Talla L' }));
    fireEvent.click(within(form).getByRole('checkbox', { name: 'L sin límite' }));
    fireEvent.change(within(form).getByLabelText('Foto'), {
      target: { files: [new File(['x'], 'f.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(api.uploadImage).toHaveBeenCalled());
    fireEvent.click(within(form).getByRole('button', { name: 'Crear diseño' }));
    await waitFor(() => expect(api.createDesign).toHaveBeenCalled());
    expect(api.createDesign.mock.calls[0]).toEqual([
      'rocky-drop-7',
      {
        title: 'En las nubes',
        description: 'Paseo.',
        price: '34.99',
        sizes: [
          { size: 'M', quantity: 5 },
          { size: 'L', quantity: null },
        ],
        fileId: 'gid://shopify/MediaImage/5',
      },
    ]);
  });

  it('al crear un diseño el formulario se vacía: un segundo envío no lo duplica', async () => {
    const editor = await abrirDrop();
    api.uploadImage.mockResolvedValue({
      fileId: 'gid://shopify/MediaImage/5',
      url: 'https://cdn.shopify.com/f.png',
    });
    api.createDesign.mockResolvedValue(DESIGN);
    const form = within(editor).getByRole('form', { name: 'Nuevo diseño' });
    fireEvent.change(within(form).getByLabelText('Título'), { target: { value: 'En las nubes' } });
    fireEvent.change(within(form).getByLabelText('Precio (€)'), { target: { value: '34,99' } });
    fireEvent.click(within(form).getByRole('checkbox', { name: 'Talla M' }));
    fireEvent.change(within(form).getByLabelText('Foto'), {
      target: { files: [new File(['x'], 'f.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(api.uploadImage).toHaveBeenCalled());
    fireEvent.click(within(form).getByRole('button', { name: 'Crear diseño' }));
    await waitFor(() => expect(api.createDesign).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(within(form).getByLabelText('Título')).toHaveValue(''));
    expect(within(form).getByLabelText('Precio (€)')).toHaveValue('');
    fireEvent.click(within(form).getByRole('button', { name: 'Crear diseño' }));
    expect(api.createDesign).toHaveBeenCalledTimes(1);
  });

  it('no crea un diseño sin foto', async () => {
    const editor = await abrirDrop();
    const form = within(editor).getByRole('form', { name: 'Nuevo diseño' });
    fireEvent.change(within(form).getByLabelText('Título'), { target: { value: 'X' } });
    fireEvent.change(within(form).getByLabelText('Precio (€)'), { target: { value: '30' } });
    fireEvent.click(within(form).getByRole('checkbox', { name: 'Talla M' }));
    fireEvent.click(within(form).getByRole('button', { name: 'Crear diseño' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent(/foto/);
    expect(api.createDesign).not.toHaveBeenCalled();
  });

  it('edita el precio de un diseño', async () => {
    const editor = await abrirDrop();
    api.updateDesign.mockResolvedValue({ ...DESIGN, price: '39.99' });
    const fila = within(editor).getByRole('listitem', { name: 'El Jefe' });
    fireEvent.click(within(fila).getByRole('button', { name: 'Editar' }));
    const form = within(fila).getByRole('form', { name: 'Editar El Jefe' });
    expect(within(form).getByLabelText('Unidades de la M')).toHaveValue(3);
    fireEvent.change(within(form).getByLabelText('Precio (€)'), { target: { value: '39.99' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar diseño' }));
    await waitFor(() => expect(api.updateDesign).toHaveBeenCalled());
    expect(api.updateDesign.mock.calls[0][0]).toBe('gid://shopify/Product/1');
    expect(api.updateDesign.mock.calls[0][1]).toMatchObject({ price: '39.99' });
  });

  it('busca y añade un producto que no está en otro drop', async () => {
    const editor = await abrirDrop();
    api.searchProducts.mockResolvedValue({
      products: [
        {
          id: 'gid://shopify/Product/2',
          handle: 'suelto',
          title: 'Suelto',
          image: null,
          drop: null,
        },
        {
          id: 'gid://shopify/Product/3',
          handle: 'ajeno',
          title: 'Ajeno',
          image: null,
          drop: 'rocky-drop-5',
        },
      ],
    });
    api.addExistingDesign.mockResolvedValue({ handle: 'rocky-drop-7' });
    fireEvent.change(within(editor).getByLabelText('Buscar un producto existente'), {
      target: { value: 'su' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Buscar' }));
    const suelto = await within(editor).findByRole('button', { name: 'Añadir Suelto' });
    expect(within(editor).getByRole('button', { name: 'Añadir Ajeno' })).toBeDisabled();
    fireEvent.click(suelto);
    await waitFor(() =>
      expect(api.addExistingDesign).toHaveBeenCalledWith('rocky-drop-7', 'gid://shopify/Product/2')
    );
  });

  it('quitar un diseño pide una segunda pulsación', async () => {
    const editor = await abrirDrop();
    api.removeDesign.mockResolvedValue({ handle: 'rocky-drop-7' });
    const fila = within(editor).getByRole('listitem', { name: 'El Jefe' });
    fireEvent.click(within(fila).getByRole('button', { name: 'Quitar del drop' }));
    expect(api.removeDesign).not.toHaveBeenCalled();
    fireEvent.click(within(fila).getByRole('button', { name: '¿Seguro? Pulsa otra vez' }));
    await waitFor(() =>
      expect(api.removeDesign).toHaveBeenCalledWith('rocky-drop-7', 'gid://shopify/Product/1')
    );
  });
});

describe('El Taller: la pared', () => {
  const ESTADO = { configurada: true, encendida: true, corrupta: false };
  const PAREDES = [
    {
      pared: '/crew|ancha',
      trazos: 3,
      puntos: 40,
      firmas: 2,
      reportes: 3,
      ocultas: 1,
      actualizada: '2026-11-10T12:00:00.000Z',
    },
  ];
  const DETALLE = {
    pared: '/crew|ancha',
    version: 4,
    strokes: [{ id: 'a', c: 0, s: 1, p: [0, 10, 4, 12], d: [], firma: 'LUNA-7', oculta: true }],
    firmas: [
      { firma: 'LUNA-7', trazos: 2, reportes: 3, oculta: true },
      { firma: 'TELE-2', trazos: 1, reportes: 0, oculta: false },
    ],
  };

  async function abrirPared(estado = ESTADO) {
    await entrarAlPanel();
    api.listarParedes.mockResolvedValue({ estado, paredes: estado.configurada ? PAREDES : [] });
    api.detallePared.mockResolvedValue(DETALLE);
    fireEvent.click(screen.getByRole('button', { name: 'La pared' }));
    return screen.findByRole('region', { name: 'La pared compartida' });
  }

  it('las secciones son botones de la casa y marcan la activa, sin estilos de la mesa', async () => {
    await abrirPared();
    const drops = screen.getByRole('button', { name: 'Drops' });
    const pared = screen.getByRole('button', { name: 'La pared' });
    for (const boton of [drops, pared]) {
      expect(boton).toHaveClass('btn');
      // «chip» solo tiene estilo en la hoja de la mesa, que carga el Estudio
      expect(boton).not.toHaveClass('chip');
    }
    expect(pared).toHaveClass('btn--primary');
    expect(pared).toHaveAttribute('aria-pressed', 'true');
    expect(drops).not.toHaveClass('btn--primary');
    expect(drops).toHaveAttribute('aria-pressed', 'false');
  });

  it('lista las paredes con sus reportes y el estado del interruptor', async () => {
    const seccion = await abrirPared();
    expect(await within(seccion).findByText(/encendida/i)).toBeInTheDocument();
    expect(within(seccion).getByRole('button', { name: /\/crew · ancha/ })).toHaveTextContent(
      /3 reportes/
    );
  });

  it('abre una pared y oculta, muestra o borra lo de una firma', async () => {
    const seccion = await abrirPared();
    fireEvent.click(await within(seccion).findByRole('button', { name: /\/crew · ancha/ }));
    const luna = await within(seccion).findByRole('listitem', { name: 'LUNA-7' });
    api.mostrarFirma.mockResolvedValue({ ok: true });
    fireEvent.click(within(luna).getByRole('button', { name: 'Mostrar' }));
    await waitFor(() =>
      expect(api.mostrarFirma).toHaveBeenCalledWith({
        pagina: '/crew',
        ancho: 'ancha',
        firma: 'LUNA-7',
      })
    );
    const tele = within(seccion).getByRole('listitem', { name: 'TELE-2' });
    api.ocultarFirma.mockResolvedValue({ ok: true });
    fireEvent.click(within(tele).getByRole('button', { name: 'Ocultar' }));
    await waitFor(() => expect(api.ocultarFirma).toHaveBeenCalled());
    api.borrarFirma.mockResolvedValue({ ok: true });
    fireEvent.click(within(tele).getByRole('button', { name: 'Borrar lo suyo' }));
    expect(api.borrarFirma).not.toHaveBeenCalled();
    fireEvent.click(within(tele).getByRole('button', { name: '¿Seguro? Pulsa otra vez' }));
    await waitFor(() =>
      expect(api.borrarFirma).toHaveBeenCalledWith({
        pagina: '/crew',
        ancho: 'ancha',
        firma: 'TELE-2',
      })
    );
  });

  it('poner el foco o el cursor en una firma destaca lo suyo en la vista previa, y al salir vuelve', async () => {
    const seccion = await abrirPared();
    fireEvent.click(await within(seccion).findByRole('button', { name: /\/crew · ancha/ }));
    const tele = await within(seccion).findByRole('listitem', { name: 'TELE-2' });
    const vista = () => within(seccion).getByRole('img', { name: /Vista previa de la pared/ });
    expect(vista()).not.toHaveAccessibleName(/destacando/);

    fireEvent.focus(within(tele).getByRole('button', { name: 'Ocultar' }));
    expect(vista()).toHaveAccessibleName(/destacando lo de TELE-2/);
    expect(tele).toHaveClass('is-resaltada');
    fireEvent.blur(within(tele).getByRole('button', { name: 'Ocultar' }));
    expect(vista()).not.toHaveAccessibleName(/destacando/);
    expect(tele).not.toHaveClass('is-resaltada');

    fireEvent.pointerMove(tele);
    expect(vista()).toHaveAccessibleName(/destacando lo de TELE-2/);
    fireEvent.pointerLeave(tele);
    expect(vista()).not.toHaveAccessibleName(/destacando/);
  });

  it('tras ocultar lo de una firma, con el foco aún en su fila, sigue destacada', async () => {
    const seccion = await abrirPared();
    fireEvent.click(await within(seccion).findByRole('button', { name: /\/crew · ancha/ }));
    const tele = await within(seccion).findByRole('listitem', { name: 'TELE-2' });
    const ocultar = within(tele).getByRole('button', { name: 'Ocultar' });
    fireEvent.focus(ocultar);
    api.ocultarFirma.mockResolvedValue({ ok: true });
    fireEvent.click(ocultar);
    await waitFor(() => expect(api.ocultarFirma).toHaveBeenCalled());
    await waitFor(() => expect(api.detallePared).toHaveBeenCalledTimes(2));
    expect(
      within(seccion).getByRole('img', { name: /Vista previa de la pared/ })
    ).toHaveAccessibleName(/destacando lo de TELE-2/);
  });

  it('limpia una pared entera con dos pulsaciones', async () => {
    const seccion = await abrirPared();
    fireEvent.click(await within(seccion).findByRole('button', { name: /\/crew · ancha/ }));
    await within(seccion).findByRole('listitem', { name: 'LUNA-7' });
    api.limpiarPared.mockResolvedValue({ ok: true });
    fireEvent.click(within(seccion).getByRole('button', { name: 'Limpiar la pared' }));
    fireEvent.click(within(seccion).getByRole('button', { name: '¿Seguro? Pulsa otra vez' }));
    await waitFor(() =>
      expect(api.limpiarPared).toHaveBeenCalledWith({ pagina: '/crew', ancho: 'ancha' })
    );
  });

  it('al limpiar no vuelve a abrir la pared borrada y dice que está limpia', async () => {
    const seccion = await abrirPared();
    fireEvent.click(await within(seccion).findByRole('button', { name: /\/crew · ancha/ }));
    await within(seccion).findByRole('listitem', { name: 'LUNA-7' });
    const consultas = api.detallePared.mock.calls.length;
    // Como el servidor: una pared limpia deja de existir.
    api.limpiarPared.mockResolvedValue({ ok: true });
    api.listarParedes.mockResolvedValue({ estado: ESTADO, paredes: [] });
    api.detallePared.mockRejectedValue(
      Object.assign(new Error('Esa pared no existe.'), { status: 404 })
    );
    fireEvent.click(within(seccion).getByRole('button', { name: 'Limpiar la pared' }));
    fireEvent.click(within(seccion).getByRole('button', { name: '¿Seguro? Pulsa otra vez' }));
    expect(await within(seccion).findByText('Nadie ha pintado todavía.')).toBeInTheDocument();
    expect(within(seccion).getByText('Pared limpia.')).toBeInTheDocument();
    expect(within(seccion).queryByRole('alert')).not.toBeInTheDocument();
    expect(api.detallePared).toHaveBeenCalledTimes(consultas);
  });

  it('el interruptor apaga la pared', async () => {
    const seccion = await abrirPared();
    api.interruptorPared.mockResolvedValue({ estado: { ...ESTADO, encendida: false } });
    fireEvent.click(await within(seccion).findByRole('button', { name: 'Apagar la pared' }));
    await waitFor(() => expect(api.interruptorPared).toHaveBeenCalledWith(false));
  });

  it('sin configurar lo dice y no ofrece interruptor', async () => {
    const seccion = await abrirPared({ configurada: false, encendida: true, corrupta: false });
    expect(await within(seccion).findByText(/apagada por configuración/i)).toBeInTheDocument();
    expect(within(seccion).queryByRole('button', { name: /la pared$/ })).not.toBeInTheDocument();
  });
});
