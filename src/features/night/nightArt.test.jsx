import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import asomadoBorde from '../../images/optimized/characters/asomado-borde-hd.webp';
import perdidoMapa from '../../images/optimized/characters/perdido-mapa-hd.webp';
import miron from '../../images/optimized/night/miron-800.webp';
import recaderoHd from '../../images/optimized/characters/corriendo-bolsa-hd.webp';
import recaderoSplash from '../../images/optimized/splash/corriendo-bolsa.webp';
import freezeHd from '../../images/optimized/characters/breakdance-freeze-hd.webp';
import estrellaHd from '../../images/optimized/characters/estrella-apoyado-hd.webp';
import ollieHd from '../../images/optimized/characters/skater-ollie-hd.webp';
import bombillaHd from '../../images/optimized/characters/bombilla-eureka-hd.webp';
import rockyHd from '../../images/optimized/characters/perro-rocky-hd.webp';
import noEntrega from '../../images/optimized/night/no-entrega-800.webp';
import noEntrega350 from '../../images/optimized/night/no-entrega-350.webp';
import congelao from '../../images/optimized/night/congelao-800.webp';
import estrellao from '../../images/optimized/night/estrellao-800.webp';
import noAterriza from '../../images/optimized/night/no-aterriza-800.webp';
import fundido from '../../images/optimized/night/fundido-800.webp';
import sabuesoNegro from '../../images/optimized/night/sabueso-negro-800.webp';
import lataHd from '../../images/optimized/characters/lata-spray-hd.webp';
import lataPaseo from '../../images/optimized/characters/lata-spray-walk-seedance-224.webp';
import lataPaseoQuieto from '../../images/optimized/characters/lata-spray-walk-seedance-poster-224.webp';
import toxico from '../../images/optimized/night/toxico-800.webp';
import toxicoPaseo from '../../images/optimized/night/toxico-paseo-224.webp';
import toxicoPaseoQuieto from '../../images/optimized/night/toxico-paseo-poster-224.webp';
import { nightArtFor, useNightArt } from './nightArt.js';
import { useNightFicha } from './nightCrew.js';

function Arte({ src }) {
  return <img alt="arte" src={useNightArt(src)} />;
}

function Ficha({ miembro }) {
  return <p>{useNightFicha(miembro).nombre}</p>;
}

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

describe('Modo descontrol', () => {
  it('de día deja el dibujo de siempre y de noche pone su versión malvada', async () => {
    render(<Arte src={asomadoBorde} />);
    expect(screen.getByAltText('arte')).toHaveAttribute('src', asomadoBorde);

    await act(async () => {
      document.documentElement.dataset.theme = 'neon';
    });
    expect(screen.getByAltText('arte')).toHaveAttribute('src', miron);

    await act(async () => {
      delete document.documentElement.dataset.theme;
    });
    expect(screen.getByAltText('arte')).toHaveAttribute('src', asomadoBorde);
  });

  it('los que no tienen versión de noche siguen igual', () => {
    expect(nightArtFor(perdidoMapa)).toBe(perdidoMapa);
  });

  it('los seis nuevos de la noche tienen su dibujo malvado', () => {
    expect(nightArtFor(recaderoHd)).toBe(noEntrega);
    expect(nightArtFor(recaderoSplash)).toBe(noEntrega350);
    expect(nightArtFor(freezeHd)).toBe(congelao);
    expect(nightArtFor(estrellaHd)).toBe(estrellao);
    expect(nightArtFor(ollieHd)).toBe(noAterriza);
    expect(nightArtFor(bombillaHd)).toBe(fundido);
    expect(nightArtFor(rockyHd)).toBe(sabuesoNegro);
  });

  it('El Lata patrulla de noche como El Tóxico, andando y quieto', () => {
    expect(nightArtFor(lataHd)).toBe(toxico);
    expect(nightArtFor(lataPaseo)).toBe(toxicoPaseo);
    expect(nightArtFor(lataPaseoQuieto)).toBe(toxicoPaseoQuieto);
  });

  it('de noche el cromo cambia de alias', async () => {
    render(<Ficha miembro={{ id: 'curioso', nombre: 'El Curioso' }} />);
    expect(screen.getByText('El Curioso')).toBeInTheDocument();
    await act(async () => {
      document.documentElement.dataset.theme = 'neon';
    });
    expect(screen.getByText('El Mirón')).toBeInTheDocument();
  });
});
