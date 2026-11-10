import { describe, expect, it } from 'vitest';
import { END_MARK, renderPromoteScript } from './promote-template.mjs';

const RELEASE = '20260929T100641Z-el-toxico-5617951b';
const PREVIOUS = '20260928T101659Z-crew-noche-16-fe7c1d2a';
const STAMP = '20261108T120000Z';
const base = {
  release: RELEASE,
  previous: PREVIOUS,
  project: '20260807t094206z-d4a7bb2',
  stamp: STAMP,
};

describe('plantilla de promoción (texto)', () => {
  const script = renderPromoteScript(base);

  it('aborta ante el primer error, también dentro de funciones, y declara rutas e imágenes', () => {
    expect(script.startsWith('#!/usr/bin/env bash\n')).toBe(true);
    expect(script).toContain('set -Eeuo pipefail');
    expect(script).toContain(`release=/opt/rocky035/releases/${RELEASE}`);
    expect(script).toContain(`previous=/opt/rocky035/releases/${PREVIOUS}`);
    expect(script).toContain(`image=rocky035:${RELEASE}`);
    expect(script).toContain(`previous_image=rocky035:${PREVIOUS}`);
  });

  it('comprueba precondiciones con mensaje y código 2 antes de cualquier cambio', () => {
    expect(script).toContain('flock -n 9 || fail_pre');
    expect(script).toContain(
      '[ "$(readlink -f /opt/rocky035/current)" = "$previous" ] || fail_pre'
    );
    expect(script).toContain('docker image inspect "$image" >/dev/null || fail_pre');
    expect(script).toMatch(/fail_pre\(\) \{[\s\S]*exit 2/);
    expect(script.indexOf('fail_pre "no existe la imagen')).toBeLessThan(
      script.indexOf('mkdir -p "$backups"')
    );
  });

  it('exige, antes de cualquier cambio, que la imagen sea la que se verificó al preparar la release', () => {
    expect(script).toContain('mark="$release/imagen-verificada.txt"');
    expect(script).toMatch(/\[ -f "\$mark" \] && \[ ! -L "\$mark" \] \|\| fail_pre/);
    expect(script).toContain(`docker image inspect "$image" --format '{{.Id}}'`);
    expect(script.indexOf('imagen-verificada.txt')).toBeLessThan(
      script.indexOf('mkdir -p "$backups"')
    );
  });

  it('para volver a una release anterior no exige la marca', () => {
    const revert = renderPromoteScript({ ...base, requireVerified: false });
    expect(revert).not.toContain('imagen-verificada.txt');
    expect(revert).toContain('docker image inspect "$image" >/dev/null || fail_pre');
  });

  it('el selector nuevo conserva el límite de memoria que ya tuviera, y solo si tiene forma de límite', () => {
    expect(script).toContain(
      `mem_limit=$(grep -E '^ROCKY_MEM_LIMIT=[0-9]+[bkmgBKMG]?$' "$selector" | tail -n 1 || true)`
    );
    expect(script).toMatch(/\[ -z "\$mem_limit" \] \|\| printf '%s\\n' "\$mem_limit"/);
  });

  it('nombra las copias por operación para no pisar las de otras promociones', () => {
    expect(script).toContain(`backup=/opt/rocky035/compose.env.pre-${RELEASE}-${STAMP}`);
    expect(script).toContain(`backups=/var/backups/rocky035/deploy-${RELEASE}-${STAMP}`);
    expect(script).toContain('mv -f "$release/$f" "$release/${f%.txt}-hasta-$stamp.txt"');
  });

  it('borra un current.next residual antes de enlazar', () => {
    expect(script).toMatch(
      /set_current\(\) \{\n {2}rm -f \/opt\/rocky035\/current\.next\n {2}ln -s/
    );
  });

  it('activa solo rocky035, espera salud, anota la anterior y deja una marca final', () => {
    expect(script).toContain(
      'docker compose --env-file "$selector" -f "$release/compose.production.yaml" up -d --no-build --no-deps --pull never --wait --wait-timeout 90 rocky035'
    );
    expect(script).toContain('printf \'%s\\n\' "${previous##*/}" > "$release/anterior.txt"');
    expect(script.trimEnd().endsWith(`echo '${END_MARK}ok'`)).toBe(true);
  });

  it.each([
    [{ release: 'x; rm -rf /' }, /release/i],
    [{ previous: '$(reboot)' }, /release/i],
    [{ project: 'a b' }, /proyecto/i],
    [{ project: 'x;id' }, /proyecto/i],
    [{ root: '/opt/rocky 035' }, /ruta/i],
    [{ root: 'relativa' }, /ruta/i],
    [{ waitTimeout: 5 }, /espera/i],
    [{ release: PREVIOUS }, /misma/i],
    [{ stamp: 'ayer' }, /marca/i],
    [{ owner: 'root; id' }, /propietario/i],
  ])('rechaza %o', (override, error) => {
    expect(() => renderPromoteScript({ ...base, ...override })).toThrow(error);
  });
});
