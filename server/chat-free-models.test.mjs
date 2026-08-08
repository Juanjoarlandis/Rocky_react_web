import { describe, expect, it } from 'vitest';
import { assertFreeModels } from './chat.mjs';
import { createConfig, isFreeOpenRouterModel } from './config.mjs';

// La web es pública: si se cuela un modelo de pago, la factura la pagamos nosotros.
// Estas pruebas son el cinturón de seguridad de esa regla.

const ENV_BASE = { OPENROUTER_API_KEY: 'test-key', PUBLIC_ORIGIN: 'http://localhost:3000' };

describe('candado de modelos gratuitos', () => {
  it('reconoce los identificadores gratuitos válidos', () => {
    expect(isFreeOpenRouterModel('google/gemma-4-31b-it:free')).toBe(true);
    expect(isFreeOpenRouterModel('openrouter/free')).toBe(true);
  });

  it('rechaza cualquier modelo de pago', () => {
    const dePago = [
      'openai/gpt-4o',
      'anthropic/claude-3.5-sonnet',
      'google/gemma-4-31b-it',
      'google/gemma-4-31b-it:free-trial',
      'openai/gpt-4o:paid',
    ];
    dePago.forEach((model) => {
      expect(isFreeOpenRouterModel(model), model).toBe(false);
    });
  });

  it('assertFreeModels deja pasar una lista gratuita', () => {
    const models = ['google/gemma-4-31b-it:free', 'openai/gpt-oss-20b:free'];
    expect(assertFreeModels(models)).toEqual(models);
  });

  it('assertFreeModels revienta si hay un modelo de pago', () => {
    expect(() =>
      assertFreeModels(['google/gemma-4-31b-it:free', 'openai/gpt-4o'])
    ).toThrow(/sólo puede usar modelos gratuitos/i);
  });

  it('assertFreeModels revienta con la lista vacía', () => {
    expect(() => assertFreeModels([])).toThrow(/gratuitos/i);
  });

  it('el arranque falla si el entorno pide un modelo de pago', () => {
    expect(() =>
      createConfig({ ...ENV_BASE, OPENROUTER_MODELS: 'openai/gpt-4o' })
    ).toThrow(/gratuitos/i);
  });

  it('el arranque acepta modelos gratuitos del entorno', () => {
    const config = createConfig({
      ...ENV_BASE,
      OPENROUTER_MODELS: 'google/gemma-4-31b-it:free,openai/gpt-oss-20b:free',
    });
    expect(config.chat.models.every(isFreeOpenRouterModel)).toBe(true);
  });

  it('los modelos por defecto también son gratuitos', () => {
    const config = createConfig(ENV_BASE);
    expect(config.chat.models.length).toBeGreaterThan(0);
    expect(config.chat.models.every(isFreeOpenRouterModel)).toBe(true);
  });
});
