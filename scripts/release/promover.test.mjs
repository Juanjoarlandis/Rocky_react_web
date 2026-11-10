import { describe, expect, it } from 'vitest';
import { END_MARK } from './promote-template.mjs';
import { promoteRelease, revertRelease } from './promover.mjs';

const CURRENT = '20260929T100641Z-el-toxico-5617951b';
const NEXT = '20261108T120000Z-prueba-1234abcd';
const BASE = '20260928T101659Z-crew-noche-16-fe7c1d2a';
const NOW = new Date('2026-11-08T13:00:00Z');

// Lecturas permitidas en la Raspberry: cualquier otra cosa por `read` es un error de la orden.
const ALLOWED_READS = [
  /^readlink -f \/opt\/rocky035\/current$/,
  /^docker inspect rocky035 --format '\{\{index \.Config\.Labels "com\.docker\.compose\.project"\}\}'$/,
  /^sudo -n true 2>\/dev\/null && echo si \|\| echo no$/,
  /^test -d \/opt\/rocky035\/releases\/[\w-]+ && echo si \|\| echo no$/,
  /^docker image inspect rocky035:[\w-]+ >\/dev\/null 2>&1 && echo si \|\| echo no$/,
  /^if \[ -e \/opt\/rocky035\/releases\/[\w-]+\/(anterior\.txt|release\.json|imagen-verificada\.txt) \]; then cat \/opt\/rocky035\/releases\/[\w-]+\/(anterior\.txt|release\.json|imagen-verificada\.txt); else echo __NO_EXISTE__; fi$/,
  /^cat \/opt\/rocky035\/releases\/[\w-]+\/promover-\d{8}T\d{6}Z\.log$/,
];

function fakeRemote({
  anterior = null,
  anteriorUnreadable = false,
  manifest = { productionBase: BASE },
  releaseExists = true,
  imageExists = true,
  sudo = true,
  result = 'ok',
  // Lo que dejó `preparar` al verificar la imagen (despliegue-ligero); null = sin marca.
  verified = `sha256:${'ab'.repeat(32)} arm64 1500\n`,
} = {}) {
  const calls = [];
  return {
    calls,
    async read(command) {
      calls.push({ kind: 'read', command });
      if (!ALLOWED_READS.some((re) => re.test(command)))
        throw new Error(`lectura no permitida: ${command}`);
      if (command.startsWith('readlink')) return `/opt/rocky035/releases/${CURRENT}\n`;
      if (command.includes('com.docker.compose.project')) return '20260807t094206z-d4a7bb2\n';
      if (command.startsWith('sudo -n')) return sudo ? 'si\n' : 'no\n';
      if (command.includes('anterior.txt')) {
        if (anteriorUnreadable) throw new Error('cat: anterior.txt: Permiso denegado');
        return anterior === null ? '__NO_EXISTE__\n' : anterior;
      }
      if (command.includes('imagen-verificada.txt'))
        return verified === null ? '__NO_EXISTE__\n' : verified;
      if (command.includes('release.json'))
        return manifest === null ? '__NO_EXISTE__\n' : JSON.stringify(manifest);
      if (command.startsWith('test -d')) return releaseExists ? 'si\n' : 'no\n';
      if (command.startsWith('docker image inspect')) return imageExists ? 'si\n' : 'no\n';
      if (command.endsWith('.log')) return `Container rocky035 Healthy\n${END_MARK}${result}\n`;
      return '';
    },
    async run(command, options) {
      calls.push({ kind: 'run', command, input: options?.input });
    },
    async upload() {
      calls.push({ kind: 'upload' });
    },
  };
}

const changing = (remote) => remote.calls.filter((c) => c.kind !== 'read');
const io = { log: () => {}, sleep: async () => {} };

describe('promover una release', () => {
  it('en simulacro solo lee y genera el script con la release activa como anterior', async () => {
    const remote = fakeRemote();
    const plan = await promoteRelease({ release: NEXT, now: NOW }, { remote, ...io });
    expect(plan.previous).toBe(CURRENT);
    expect(plan.script).toContain(`release=/opt/rocky035/releases/${NEXT}`);
    expect(plan.script).toContain(`previous=/opt/rocky035/releases/${CURRENT}`);
    expect(plan.script).toContain('stamp=20261108T130000Z');
    expect(plan.warnings).toEqual([]);
    expect(changing(remote)).toEqual([]);
  });

  it('avisa en el simulacro si sudo pide contraseña', async () => {
    const plan = await promoteRelease(
      { release: NEXT, now: NOW },
      { remote: fakeRemote({ sudo: false }), ...io }
    );
    expect(plan.warnings.join()).toMatch(/sudo pide contraseña/);
  });

  it('con --aplicar guarda el script junto a la release, lo lanza desacoplado y sigue su log', async () => {
    const remote = fakeRemote();
    const plan = await promoteRelease({ release: NEXT, apply: true, now: NOW }, { remote, ...io });
    const dir = `/opt/rocky035/releases/${NEXT}`;
    expect(changing(remote)).toEqual([
      { kind: 'run', command: `cat > ${dir}/promover-20261108T130000Z.sh`, input: plan.script },
      {
        kind: 'run',
        command: `sudo -n setsid -f bash ${dir}/promover-20261108T130000Z.sh > ${dir}/promover-20261108T130000Z.log 2>&1 < /dev/null`,
        input: undefined,
      },
    ]);
    expect(plan.logFile).toBe(`${dir}/promover-20261108T130000Z.log`);
  });

  it.each([
    ['vuelta-atras', /se ha restaurado la anterior/],
    ['precondicion', /no se cumplía una precondición/],
    ['vuelta-atras-fallida', /VUELTA ATRÁS HA FALLADO/],
  ])('si el log acaba en «%s», la orden falla con su explicación', async (result, message) => {
    await expect(
      promoteRelease(
        { release: NEXT, apply: true, now: NOW },
        { remote: fakeRemote({ result }), ...io }
      )
    ).rejects.toThrow(message);
  });

  it('se niega a promover la release que ya está activa', async () => {
    const remote = fakeRemote();
    await expect(
      promoteRelease({ release: CURRENT, apply: true }, { remote, ...io })
    ).rejects.toThrow(/ya está activa/);
    expect(changing(remote)).toEqual([]);
  });

  it('se niega si la release o su imagen no existen en la Raspberry', async () => {
    await expect(
      promoteRelease(
        { release: NEXT, apply: true },
        { remote: fakeRemote({ releaseExists: false }), ...io }
      )
    ).rejects.toThrow(/no existe/);
    await expect(
      promoteRelease(
        { release: NEXT, apply: true },
        { remote: fakeRemote({ imageExists: false }), ...io }
      )
    ).rejects.toThrow(/imagen/);
  });

  it('se niega a promover una release cuya imagen no se verificó al prepararla', async () => {
    const remote = fakeRemote({ verified: null });
    await expect(
      promoteRelease({ release: NEXT, apply: true, now: NOW }, { remote, ...io })
    ).rejects.toThrow(/no está verificada/);
    // Tampoco en simulacro se da por buena
    await expect(
      promoteRelease({ release: NEXT, now: NOW }, { remote: fakeRemote({ verified: null }), ...io })
    ).rejects.toThrow(/no está verificada/);
    expect(changing(remote)).toEqual([]);
  });

  it('una marca que no tiene la forma esperada tampoco vale', async () => {
    const remote = fakeRemote({ verified: 'verificada a mano\n' });
    await expect(
      promoteRelease({ release: NEXT, apply: true, now: NOW }, { remote, ...io })
    ).rejects.toThrow(/no está verificada/);
    expect(changing(remote)).toEqual([]);
  });

  it('el script que genera exige la marca como precondición', async () => {
    const plan = await promoteRelease({ release: NEXT, now: NOW }, { remote: fakeRemote(), ...io });
    expect(plan.script).toContain('imagen-verificada.txt');
  });

  it('rechaza un identificador o una raíz no válidos sin contactar con la Raspberry', async () => {
    const remote = fakeRemote();
    await expect(
      promoteRelease({ release: 'x; reboot', apply: true }, { remote, ...io })
    ).rejects.toThrow(/release/i);
    await expect(
      promoteRelease({ release: NEXT, root: '/opt/x;echo INYECTADO' }, { remote, ...io })
    ).rejects.toThrow(/ruta/i);
    expect(remote.calls).toEqual([]);
  });
});

describe('revertir a la release anterior', () => {
  it('usa la anterior anotada al promover (anterior.txt)', async () => {
    const remote = fakeRemote({
      anterior: `${BASE}\n`,
      manifest: { productionBase: '20260901T000000Z-otra-11111111' },
    });
    const plan = await revertRelease({ now: NOW }, { remote, ...io });
    expect(plan.release).toBe(BASE);
    expect(plan.previous).toBe(CURRENT);
    expect(plan.warnings).toEqual([]);
    expect(changing(remote)).toEqual([]);
  });

  it('volver a una release anterior no exige marca: las de antes de este proceso no la tienen', async () => {
    const remote = fakeRemote({ anterior: `${BASE}\n`, verified: null });
    const plan = await revertRelease({ apply: true, now: NOW }, { remote, ...io });
    expect(plan.release).toBe(BASE);
    expect(plan.script).not.toContain('imagen-verificada.txt');
    expect(remote.calls.some((call) => call.command.includes('imagen-verificada.txt'))).toBe(false);
  });

  it('sin anterior.txt, usa la release de partida de release.json y lo avisa', async () => {
    const plan = await revertRelease({ now: NOW }, { remote: fakeRemote(), ...io });
    expect(plan.release).toBe(BASE);
    expect(plan.warnings.join()).toMatch(/no tiene anterior\.txt/);
  });

  it('con --aplicar lanza la vuelta atrás desacoplada', async () => {
    const remote = fakeRemote({ anterior: `${BASE}\n` });
    const plan = await revertRelease({ apply: true, now: NOW }, { remote, ...io });
    expect(changing(remote)[1].command).toBe(
      `sudo -n setsid -f bash /opt/rocky035/releases/${BASE}/promover-20261108T130000Z.sh > /opt/rocky035/releases/${BASE}/promover-20261108T130000Z.log 2>&1 < /dev/null`
    );
    expect(plan.applied).toBe(true);
  });

  it('aborta si anterior.txt existe pero no se puede leer, sin caer a release.json', async () => {
    const remote = fakeRemote({ anteriorUnreadable: true });
    await expect(revertRelease({ apply: true }, { remote, ...io })).rejects.toThrow(
      /Permiso denegado/
    );
    expect(changing(remote)).toEqual([]);
  });

  it('con --aplicar muestra el destino y los avisos antes de ejecutar nada', async () => {
    const remote = fakeRemote();
    const events = [];
    const log = (line) => events.push(['log', line, changing(remote).length]);
    await revertRelease({ apply: true, now: NOW }, { remote, log, sleep: async () => {} });
    const first = events[0];
    expect(first[1]).toMatch(new RegExp(`${CURRENT} → ${BASE}`));
    expect(first[2]).toBe(0);
    expect(events.some(([, line, n]) => /no tiene anterior\.txt/.test(line) && n === 0)).toBe(true);
  });

  it('se niega si no hay release anterior registrada', async () => {
    const remote = fakeRemote({ manifest: { productionBase: null } });
    await expect(revertRelease({ apply: true }, { remote, ...io })).rejects.toThrow(
      /No hay release anterior/
    );
    expect(changing(remote)).toEqual([]);
  });

  it('rechaza una anterior anotada que no es un identificador válido', async () => {
    const remote = fakeRemote({ anterior: '$(reboot)\n' });
    await expect(revertRelease({ apply: true }, { remote, ...io })).rejects.toThrow(/release/i);
    expect(changing(remote)).toEqual([]);
  });
});
