import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const globalCss = readFileSync('src/index.css', 'utf8');
const studioCss = readFileSync('src/styles/Studio.css', 'utf8');
const cartRunnerCss = readFileSync('src/styles/CartRunner.css', 'utf8');
const streetWallCss = readFileSync('src/styles/StreetWall.css', 'utf8');

describe('reduced motion contract', () => {
  it('stops the global loading spinner without removing its status mark', () => {
    expect(globalCss).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.page-loading-spinner\s*\{[\s\S]*?animation:\s*none;/
    );
  });

  it('stops the Studio setlist spinner while keeping the active-track indicator', () => {
    expect(studioCss).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.setlist-spinner\s*\{[\s\S]*?animation:\s*none;/
    );
  });

  // La señal de la antena deja de latir, pero se queda encendida: la radio
  // sigue emitiendo aunque no haya movimiento.
  it('keeps the boombox antenna signal steady instead of pulsing', () => {
    expect(studioCss).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.bb-art\.playing \.bb-senal\s*\{[\s\S]*?animation:\s*none;/
    );
  });

  // Aquí el gesto es el recorrido: parado no cuenta nada y tapa la barra.
  it('keeps the cart runner off screen entirely instead of freezing it mid-run', () => {
    expect(cartRunnerCss).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.cart-runner\s*\{[\s\S]*?display:\s*none;/
    );
  });

  // Un fogonazo a pantalla completa es lo primero que esa preferencia veta.
  it('keeps the paparazzi flash completely off with reduced motion', () => {
    expect(streetWallCss).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.street-flash-blink\s*\{[\s\S]*?display:\s*none;/
    );
  });

  // La web entera cabeceando es lo último que pide quien reduce movimiento.
  it('keeps the groove nod still with reduced motion', () => {
    expect(globalCss).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\[data-groove\] \.al-ritmo\s*\{[\s\S]*?animation:\s*none;/
    );
  });
});
