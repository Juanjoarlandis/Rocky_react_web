import { fetchJson } from '../../lib/fetch-json.mjs';

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Cliente mínimo de OpenRouter: una sola llamada, con timeout y con la señal
// de cancelación de quien llama (p. ej. el navegador ha colgado).
export function createOpenRouterClient({
  apiKey,
  publicOrigin,
  fetchImpl = globalThis.fetch,
  timeoutMs = 20_000,
}) {
  return {
    async complete({ route, messages, maxTokens = 300, temperature = 0.75, signal = null }) {
      const { response, payload } = await fetchJson({
        url: OPENROUTER_URL,
        fetchImpl,
        timeoutMs,
        signal,
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': publicOrigin,
            'X-Title': 'Rocky IA',
          },
          body: JSON.stringify({
            ...route,
            messages,
            max_tokens: maxTokens,
            temperature,
            usage: { include: true },
          }),
        },
      });
      return { ok: response.ok, status: response.status, data: payload };
    },
  };
}
