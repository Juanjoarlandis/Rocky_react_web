import { useCallback, useEffect, useRef, useState } from 'react';

/* Copia un texto y avisa durante un rato («¡Enlace copiado!»). Si el
   portapapeles no está disponible, devuelve false para que quien llama
   ofrezca el texto de otra forma (un prompt, por ejemplo). */
export function useCopyToClipboard({ resetAfterMs = 2200 } = {}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copy = useCallback(
    async (text) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return false;
      }
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), resetAfterMs);
      return true;
    },
    [resetAfterMs]
  );

  return { copied, copy };
}
