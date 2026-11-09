import { describe, expect, it } from 'vitest';
import {
  DROP_STATES,
  LAST_HOURS_MS,
  countdownParts,
  dropHandleFromSlug,
  dropState,
  featuredDrop,
  isDropHandle,
  isOnSale,
  normalizeSlug,
  parseDropConfig,
  publicDrop,
  sortForWall,
} from './drops.mjs';

const BASE = Object.freeze({
  version: 1,
  number: 6,
  tagline: 'Cae dentro de poco',
  story: 'El próximo drop de la crew.',
  launchAt: '2026-11-13T20:00:00+01:00',
  endsAt: '2026-11-20T20:00:00+01:00',
  status: 'programado',
});

const at = (iso) => new Date(iso);

describe('configuración del drop', () => {
  it('acepta una configuración completa y la devuelve normalizada', () => {
    const result = parseDropConfig({ ...BASE, tagline: '  Cae dentro de poco  ' });
    expect(result.ok).toBe(true);
    expect(result.config).toEqual({ ...BASE, tagline: 'Cae dentro de poco' });
  });

  it('acepta el JSON tal como llega del metacampo', () => {
    expect(parseDropConfig(JSON.stringify(BASE)).ok).toBe(true);
  });

  it('rechaza el JSON roto sin lanzar', () => {
    expect(parseDropConfig('{no es json')).toMatchObject({
      ok: false,
      error: { code: 'DROP_INVALID' },
    });
  });

  it('rechaza el cierre antes del lanzamiento', () => {
    const result = parseDropConfig({ ...BASE, endsAt: '2026-11-13T19:00:00+01:00' });
    expect(result).toMatchObject({ ok: false, error: { code: 'DROP_INVALID', field: 'endsAt' } });
  });

  it('exige al menos una hora entre lanzamiento y cierre', () => {
    expect(parseDropConfig({ ...BASE, endsAt: '2026-11-13T20:59:00+01:00' }).ok).toBe(false);
    expect(parseDropConfig({ ...BASE, endsAt: '2026-11-13T21:00:00+01:00' }).ok).toBe(true);
  });

  it('no deja programar sin fecha de lanzamiento', () => {
    const result = parseDropConfig({ ...BASE, launchAt: null, endsAt: null });
    expect(result).toMatchObject({ ok: false, error: { field: 'launchAt' } });
  });

  it('admite un borrador sin fechas', () => {
    const result = parseDropConfig({ ...BASE, status: 'borrador', launchAt: null, endsAt: null });
    expect(result.ok).toBe(true);
  });

  it('no admite cierre sin lanzamiento', () => {
    const result = parseDropConfig({ ...BASE, status: 'borrador', launchAt: null });
    expect(result).toMatchObject({ ok: false, error: { field: 'endsAt' } });
  });

  it.each([
    ['número fuera de rango', { number: 0 }, 'number'],
    ['número con decimales', { number: 6.5 }, 'number'],
    ['número de texto', { number: '6' }, 'number'],
    ['lema largo', { tagline: 'x'.repeat(81) }, 'tagline'],
    ['historia larga', { story: 'x'.repeat(601) }, 'story'],
    ['fecha sin zona horaria', { launchAt: '2026-11-13T20:00:00' }, 'launchAt'],
    ['fecha imposible', { launchAt: '2026-13-40T20:00:00Z' }, 'launchAt'],
    ['31 de febrero', { launchAt: '2027-02-31T20:00:00+01:00', endsAt: null }, 'launchAt'],
    ['hora 25', { launchAt: '2026-11-13T25:00:00+01:00' }, 'launchAt'],
    ['estado desconocido', { status: 'publicado' }, 'status'],
    ['versión desconocida', { version: 2 }, 'version'],
    ['control en el texto', { tagline: 'hola\u0007' }, 'tagline'],
  ])('rechaza %s', (_name, patch, field) => {
    expect(parseDropConfig({ ...BASE, ...patch })).toMatchObject({
      ok: false,
      error: { code: 'DROP_INVALID', field },
    });
  });

  it('rechaza lo que no es un objeto', () => {
    expect(parseDropConfig(null).ok).toBe(false);
    expect(parseDropConfig([BASE]).ok).toBe(false);
    expect(parseDropConfig(42).ok).toBe(false);
  });

  it('acepta textos vacíos y fechas en UTC con Z', () => {
    const result = parseDropConfig({
      ...BASE,
      tagline: '',
      story: '',
      launchAt: '2026-11-13T19:00:00Z',
      endsAt: null,
    });
    expect(result.ok).toBe(true);
  });
});

describe('estado público del drop', () => {
  const drop = { ...BASE };

  it('un borrador nunca es público, tenga las fechas que tenga', () => {
    expect(dropState({ ...drop, status: 'borrador' }, at('2026-11-15T12:00:00Z'))).toBe(
      DROP_STATES.DRAFT
    );
  });

  it('a las 19:59 está anunciado y a las 20:00 en la calle', () => {
    expect(dropState(drop, at('2026-11-13T19:59:59+01:00'))).toBe(DROP_STATES.ANNOUNCED);
    expect(dropState(drop, at('2026-11-13T20:00:00+01:00'))).toBe(DROP_STATES.LIVE);
  });

  it('entra en últimas horas 48 h antes del cierre y en archivo al cerrar', () => {
    const ends = at(drop.endsAt).getTime();
    expect(dropState(drop, new Date(ends - LAST_HOURS_MS - 1))).toBe(DROP_STATES.LIVE);
    expect(dropState(drop, new Date(ends - LAST_HOURS_MS))).toBe(DROP_STATES.LAST_HOURS);
    expect(dropState(drop, new Date(ends - 1))).toBe(DROP_STATES.LAST_HOURS);
    expect(dropState(drop, new Date(ends))).toBe(DROP_STATES.ARCHIVE);
  });

  it('sin cierre sigue en la calle hasta que se agota todo', () => {
    const open = { ...drop, endsAt: null };
    const now = at('2027-06-01T00:00:00Z');
    expect(dropState(open, now)).toBe(DROP_STATES.LIVE);
    expect(dropState(open, now, { soldOut: true })).toBe(DROP_STATES.ARCHIVE);
  });

  it('agotado con cierre por delante sigue en la calle', () => {
    expect(dropState(drop, at('2026-11-14T12:00:00Z'), { soldOut: true })).toBe(DROP_STATES.LIVE);
  });

  it('agotado antes del lanzamiento sigue anunciado', () => {
    expect(dropState(drop, at('2026-11-10T12:00:00Z'), { soldOut: true })).toBe(
      DROP_STATES.ANNOUNCED
    );
  });

  it('solo está a la venta en la calle o en últimas horas', () => {
    expect(isOnSale(DROP_STATES.LIVE)).toBe(true);
    expect(isOnSale(DROP_STATES.LAST_HOURS)).toBe(true);
    expect(isOnSale(DROP_STATES.ANNOUNCED)).toBe(false);
    expect(isOnSale(DROP_STATES.ARCHIVE)).toBe(false);
    expect(isOnSale(DROP_STATES.DRAFT)).toBe(false);
  });
});

describe('drop destacado y orden del muro', () => {
  const make = (handle, state, launchAt) => ({ handle, state, launchAt });

  it('destaca el anunciado más próximo', () => {
    const drops = [
      make('rocky-drop-7', DROP_STATES.ANNOUNCED, '2026-12-01T20:00:00Z'),
      make('rocky-drop-6', DROP_STATES.ANNOUNCED, '2026-11-13T19:00:00Z'),
      make('rocky-drop-5', DROP_STATES.LIVE, '2026-11-01T19:00:00Z'),
    ];
    expect(featuredDrop(drops).handle).toBe('rocky-drop-6');
  });

  it('sin anunciados, destaca el último lanzado que sigue a la venta', () => {
    const drops = [
      make('rocky-drop-4', DROP_STATES.LAST_HOURS, '2026-10-01T19:00:00Z'),
      make('rocky-drop-5', DROP_STATES.LIVE, '2026-11-01T19:00:00Z'),
      make('rocky-drop-3', DROP_STATES.ARCHIVE, '2026-09-01T19:00:00Z'),
    ];
    expect(featuredDrop(drops).handle).toBe('rocky-drop-5');
  });

  it('con todo en archivo no hay destacado', () => {
    expect(featuredDrop([make('rocky-drop-3', DROP_STATES.ARCHIVE, '2026-09-01T19:00:00Z')])).toBe(
      null
    );
    expect(featuredDrop([])).toBe(null);
  });

  it('ordena: anunciados por cercanía, a la venta y archivo del más nuevo al más viejo', () => {
    const drops = [
      make('rocky-drop-3', DROP_STATES.ARCHIVE, '2026-09-01T19:00:00Z'),
      make('rocky-drop-5', DROP_STATES.LIVE, '2026-11-01T19:00:00Z'),
      make('rocky-drop-7', DROP_STATES.ANNOUNCED, '2026-12-01T20:00:00Z'),
      make('rocky-drop-2', DROP_STATES.ARCHIVE, '2026-08-01T19:00:00Z'),
      make('rocky-drop-4', DROP_STATES.LAST_HOURS, '2026-10-01T19:00:00Z'),
      make('rocky-drop-6', DROP_STATES.ANNOUNCED, '2026-11-13T19:00:00Z'),
    ];
    expect(sortForWall(drops).map((d) => d.handle)).toEqual([
      'rocky-drop-6',
      'rocky-drop-7',
      'rocky-drop-5',
      'rocky-drop-4',
      'rocky-drop-3',
      'rocky-drop-2',
    ]);
  });

  it('no muta la lista que recibe', () => {
    const drops = [make('a', DROP_STATES.ARCHIVE, '2026-09-01T19:00:00Z')];
    const copy = [...drops];
    sortForWall(drops);
    expect(drops).toEqual(copy);
  });
});

describe('handles y slugs', () => {
  it('reconoce los handles de drop', () => {
    expect(isDropHandle('rocky-drop-6')).toBe(true);
    expect(isDropHandle('rocky-drop-invierno-26')).toBe(true);
    expect(isDropHandle('frontpage')).toBe(false);
    expect(isDropHandle('rocky-drop-')).toBe(false);
    expect(isDropHandle('rocky-drop-Mayus')).toBe(false);
    expect(isDropHandle(`rocky-drop-${'x'.repeat(60)}`)).toBe(false);
    expect(isDropHandle(undefined)).toBe(false);
  });

  it('normaliza un slug y construye su handle', () => {
    expect(normalizeSlug('  Invierno Ñandú 26! ')).toBe('invierno-nandu-26');
    expect(normalizeSlug('---')).toBe(null);
    expect(normalizeSlug('')).toBe(null);
    expect(normalizeSlug(7)).toBe(null);
    expect(dropHandleFromSlug('7')).toBe('rocky-drop-7');
  });
});

describe('cuenta atrás', () => {
  it('parte los milisegundos en días, horas, minutos y segundos', () => {
    const ms = ((3 * 24 + 14) * 60 * 60 + 5 * 60 + 9) * 1000 + 400;
    expect(countdownParts(ms)).toEqual({ days: 3, hours: 14, minutes: 5, seconds: 9, done: false });
  });

  it('no baja de cero', () => {
    expect(countdownParts(-5000)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      done: true,
    });
  });
});

describe('forma pública del drop', () => {
  const source = {
    handle: 'rocky-drop-6',
    title: 'ROCKY DROP 6',
    poster: { url: 'https://cdn.shopify.com/cartel.png', alt: 'Cartel del Drop 6' },
    config: { ...BASE, endsAt: null },
    designs: [
      { handle: 'rocky-el-jefe', availableForSale: true },
      { handle: 'rocky-en-las-nubes', availableForSale: false },
    ],
  };

  it('anunciado: solo el teaser, sin diseños ni historia', () => {
    const drop = publicDrop(source, at('2026-11-10T12:00:00Z'));
    expect(drop).toEqual({
      handle: 'rocky-drop-6',
      number: 6,
      title: 'ROCKY DROP 6',
      tagline: 'Cae dentro de poco',
      story: '',
      poster: source.poster,
      launchAt: BASE.launchAt,
      endsAt: null,
      state: DROP_STATES.ANNOUNCED,
      designCount: 2,
      designs: null,
      soldOut: false,
    });
    expect(JSON.stringify(drop)).not.toContain('el-jefe');
  });

  it('en la calle: con sus diseños y su historia', () => {
    const drop = publicDrop(source, at('2026-11-14T12:00:00Z'));
    expect(drop.state).toBe(DROP_STATES.LIVE);
    expect(drop.designs).toEqual(['rocky-el-jefe', 'rocky-en-las-nubes']);
    expect(drop.story).toBe(BASE.story);
  });

  it('sin cierre y todo agotado: al archivo', () => {
    const agotado = {
      ...source,
      designs: source.designs.map((d) => ({ ...d, availableForSale: false })),
    };
    const drop = publicDrop(agotado, at('2026-11-14T12:00:00Z'));
    expect(drop).toMatchObject({ state: DROP_STATES.ARCHIVE, soldOut: true });
  });

  it('un drop sin diseños no cuenta como agotado', () => {
    const drop = publicDrop({ ...source, designs: [] }, at('2026-11-14T12:00:00Z'));
    expect(drop).toMatchObject({ state: DROP_STATES.LIVE, soldOut: false, designCount: 0 });
  });

  it('un borrador no tiene forma pública', () => {
    expect(publicDrop({ ...source, config: { ...BASE, status: 'borrador' } }, new Date())).toBe(
      null
    );
  });
});
