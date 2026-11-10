import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PUBLICO, TRACK_IDS } from '../../../data/mesa';
import Publico from './Publico.jsx';

const vacio = () => TRACK_IDS.map(() => Array(16).fill(0));
const nadie = TRACK_IDS.map(() => false);

function grada(props) {
  const { container } = render(
    <Publico pattern={vacio()} mutes={nadie} solos={nadie} playing={false} bpm={92} {...props} />
  );
  const caja = container.querySelector('.publico');
  const miembros = [...caja.querySelectorAll('img')];
  const bailan = () => miembros.filter((m) => m.classList.contains('al-ritmo'));
  return { caja, miembros, bailan };
}

describe('El público de La Colmena', () => {
  it('son ocho personajes decorativos, uno por pista, que no reciben foco', () => {
    const { caja, miembros } = grada();
    expect(caja).toHaveAttribute('aria-hidden', 'true');
    expect(miembros).toHaveLength(TRACK_IDS.length);
    miembros.forEach((m, i) => {
      expect(m).toHaveAttribute('alt', '');
      expect(m.getAttribute('src')).toBeTruthy();
      expect(m.dataset.pista).toBe(TRACK_IDS[i]);
      expect(m.dataset.personaje).toBe(PUBLICO[TRACK_IDS[i]]);
    });
    expect(caja.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
  });

  it('con la mesa sonando bailan los de las pistas que suenan, al BPM de la mesa', () => {
    const pattern = vacio();
    pattern[0][0] = 3;
    pattern[1][4] = 3;
    pattern[2][2] = 1;
    const { caja, bailan } = grada({ pattern, playing: true, bpm: 124 });
    expect(bailan().map((m) => m.dataset.pista)).toEqual(['bombo', 'caja', 'hat']);
    expect(caja).toHaveAttribute('data-groove');
    expect(caja.style.getPropertyValue('--bpm')).toBe('124');
  });

  it('una pista callada se sienta y los demás siguen', () => {
    const pattern = vacio();
    pattern[0][0] = 3;
    pattern[1][4] = 3;
    const mutes = [...nadie];
    mutes[1] = true;
    const { bailan } = grada({ pattern, mutes, playing: true });
    expect(bailan().map((m) => m.dataset.pista)).toEqual(['bombo']);
  });

  it('la pista silenciada con pasos se duerme; la que no tiene pasos solo se sienta', () => {
    const pattern = vacio();
    pattern[0][0] = 3;
    pattern[1][4] = 3;
    const mutes = [...nadie];
    mutes[1] = true;
    const { caja } = grada({ pattern, mutes, playing: true });
    const dormidos = [...caja.querySelectorAll('.is-dormido img')].map((m) => m.dataset.pista);
    expect(dormidos).toEqual(['caja']);
    expect(caja.querySelectorAll('.is-solo')).toHaveLength(0);
  });

  it('el solo pone el foco en su personaje y duerme a los demás que tenían pasos', () => {
    const pattern = vacio();
    pattern[0][0] = 3;
    pattern[1][4] = 3;
    pattern[2][2] = 1;
    const solos = [...nadie];
    solos[2] = true;
    const { caja, bailan } = grada({ pattern, solos, playing: true });
    expect([...caja.querySelectorAll('.is-solo img')].map((m) => m.dataset.pista)).toEqual(['hat']);
    expect([...caja.querySelectorAll('.is-dormido img')].map((m) => m.dataset.pista)).toEqual([
      'bombo',
      'caja',
    ]);
    expect(bailan().map((m) => m.dataset.pista)).toEqual(['hat']);
  });

  it('con la mesa parada nadie duerme ni tiene foco', () => {
    const pattern = vacio();
    pattern[0][0] = 3;
    pattern[1][4] = 3;
    const mutes = [...nadie];
    mutes[1] = true;
    const solos = [...nadie];
    solos[0] = true;
    const { caja } = grada({ pattern, mutes, solos, playing: false });
    expect(caja.querySelectorAll('.is-dormido, .is-solo')).toHaveLength(0);
  });

  it('con la mesa parada nadie baila', () => {
    const pattern = vacio();
    pattern[0][0] = 3;
    const { caja, bailan } = grada({ pattern, playing: false });
    expect(bailan()).toHaveLength(0);
    expect(caja).not.toHaveAttribute('data-groove');
  });
});
