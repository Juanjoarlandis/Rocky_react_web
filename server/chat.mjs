const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `Eres Rocky IA, el asistente oficial de ROCKY 035, una marca de streetwear
hecha a mano por una crew de barrio en España. Hablas en español con flow de rapero
y grafitero: cercano, chulesco pero buen tío, con jerga urbana ("bro", "crew",
"drop", "flama") y de vez en cuando soltando una rima corta si cuadra. Nunca eres
ofensivo, machista ni faltas al respeto; buen rollo siempre.

Lo que sabes de la marca:
- ROCKY 035 hace camisetas oversize en ediciones limitadas ("drops"). Cuando vuelan, vuelan.
- El DROP 4 está al caer: los precios y fechas se anunciarán en el Instagram @rocky035.
- El sello de la casa es la diana (crosshair) y los muñecos dibujados a mano.
- También existe el ROCKY35 Muay Thai Club y la crew de los 35ERS.
- La web tiene tienda, drops, carrito, este chat y LA COLMENA: el estudio de música de la casa.
- También está LA CREW (/crew): el álbum de cromos de los muñecos de la casa — El Spray,
  El Productor, El Dormilón, Rocky el perro y compañía. Los cromos se giran para ver su expediente.

Reglas:
- Respuestas CORTAS: de 1 a 3 frases casi siempre.
- No inventes precios, fechas ni stock: indica que la tienda muestra la información disponible.
- Si preguntan algo ajeno a la marca, contesta breve y devuelve la conversación a ROCKY 035.
- Nada de listas largas ni formato markdown: texto plano con flow.`;

function readChatHistory(body) {
  if (!body || !Array.isArray(body.messages)) {
    return null;
  }

  const history = body.messages
    .filter(
      (message) =>
        message &&
        typeof message.content === 'string' &&
        ['user', 'assistant'].includes(message.role)
    )
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 2_000),
    }))
    .filter((message) => message.content.length > 0);

  const totalCharacters = history.reduce((total, message) => total + message.content.length, 0);
  if (!history.some((message) => message.role === 'user') || totalCharacters > 12_000) {
    return null;
  }
  return history;
}

export function createChatHandler({ config, fetchImpl = globalThis.fetch, logger = console }) {
  let activeRequests = 0;

  return async function chatHandler(req, res) {
    if (!config.chat.apiKey) {
      return res.status(503).json({ message: 'Rocky IA no está configurado.' });
    }
    const history = readChatHistory(req.body);
    if (!history) {
      return res.status(400).json({ message: 'Conversación no válida.' });
    }
    if (activeRequests >= config.chat.maxConcurrent) {
      return res.status(503).json({ message: 'Rocky IA está ocupado. Inténtalo en un momento.' });
    }

    activeRequests += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.chat.timeoutMs);
    const cancelOnDisconnect = () => {
      if (!res.writableEnded) controller.abort();
    };
    req.once('aborted', cancelOnDisconnect);
    res.once('close', cancelOnDisconnect);

    try {
      const upstream = await fetchImpl(OPENROUTER_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.chat.apiKey}`,
          'HTTP-Referer': config.publicOrigin,
          'X-Title': 'Rocky IA',
        },
        body: JSON.stringify({
          model: config.chat.models[0],
          models: config.chat.models,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
          max_tokens: 400,
          temperature: 0.9,
        }),
      });
      const data = await upstream.json().catch(() => null);
      const message = data?.choices?.[0]?.message?.content;
      if (!upstream.ok || typeof message !== 'string' || !message.trim()) {
        logger.error('OpenRouter request failed', {
          requestId: req.requestId,
          status: upstream.status,
        });
        return res.status(502).json({ message: 'La IA no está disponible ahora mismo.' });
      }
      return res.json({ message: message.trim() });
    } catch (error) {
      logger.error('OpenRouter request failed', {
        requestId: req.requestId,
        reason: error?.name === 'AbortError' ? 'timeout_or_disconnect' : 'network_error',
      });
      if (!res.headersSent) {
        return res.status(502).json({ message: 'La IA no está disponible ahora mismo.' });
      }
      return undefined;
    } finally {
      activeRequests -= 1;
      clearTimeout(timeout);
      req.off('aborted', cancelOnDisconnect);
      res.off('close', cancelOnDisconnect);
    }
  };
}
