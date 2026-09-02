import { useEffect, useRef, useState } from 'react';
import userLogo from '../images/optimized/shell/menu-256.webp';
import botLogo from '../images/optimized/shell/ia-256.webp';
import sentadoBordeRojo from '../images/optimized/characters/sentado-borde-rojo-600.webp';
import estrellaApoyado from '../images/optimized/characters/estrella-apoyado-600.webp';
import ChatProductCard from './ChatProductCard';
import { isAbortError } from '../api/http.js';
import { sendChatMessage } from '../api/chat.js';
import '../styles/pages/chat.css';

const QUICK_PROMPTS = ['Ver camisetas disponibles', '¿Qué hay del DROP 4?', 'Háblame de LA CREW'];

const unavailableCart = async () => {
  throw new Error('El carrito no está disponible.');
};

function storeStatus(commerceMode, canAddToCart) {
  if (commerceMode === 'checking') return 'Conectando con la tienda…';
  if (commerceMode !== 'shopify') return 'Catálogo de muestra · sin stock real';
  if (!canAddToCart) return 'Catálogo conectado · carrito pendiente';
  return 'Catálogo y stock conectados';
}

function ChatComponent({
  addToCart = unavailableCart,
  commerceMode = 'demo',
  canAddToCart = false,
  headerPlayer = null,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const latestTurnRef = useRef(null);
  const nextMessageId = useRef(1);
  // La petición en vuelo se cancela al salir de la pantalla
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (messages.length === 0 && !isLoading) return;
    const element = scrollRef.current;
    if (!element) return;
    if (isLoading || !latestTurnRef.current) {
      element.scrollTop = element.scrollHeight;
      return;
    }
    const turnTop = latestTurnRef.current.getBoundingClientRect().top;
    const messagesTop = element.getBoundingClientRect().top;
    element.scrollTop = Math.max(0, element.scrollTop + turnTop - messagesTop - 16);
  }, [messages, isLoading]);

  const sendMessage = async (requestedText = input) => {
    const text = String(requestedText).trim();
    if (!text || isLoading) return;

    setMessages((current) => [
      ...current,
      { id: nextMessageId.current++, sender: 'user', content: text },
    ]);
    setInput('');
    setIsLoading(true);

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const data = await sendChatMessage(text, { signal: controller.signal });
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          sender: 'ai',
          content: data.message,
          products: data.products,
        },
      ]);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error('Error al hablar con Rocky IA:', error);
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          sender: 'ai',
          content: error.userMessage,
          isError: true,
        },
      ]);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-shell">
        {/* El Estrella vigila desde el lateral, solo cuando sobra pantalla */}
        <img
          src={estrellaApoyado}
          width="784"
          height="1598"
          decoding="async"
          alt=""
          className="doodle chat-lean neon-art al-ritmo"
          style={{ '--fase': '0.5' }}
        />

        <section className="chat-card" aria-label="Conversación con Rocky IA">
          <header className="chat-header">
            <div className="chat-header-identity">
              <div className="chat-header-avatar-wrap">
                <img src={botLogo} alt="" className="chat-header-avatar neon-art--icon" />
                <span className="chat-online-dot" aria-hidden="true" />
              </div>
              <div>
                <p className="kicker chat-header-kicker">Desde dentro de la crew</p>
                <h1 className="chat-header-title">Rocky IA</h1>
              </div>
            </div>
            <p className="chat-header-status">
              <span aria-hidden="true">●</span>
              {storeStatus(commerceMode, canAddToCart)}
            </p>
            {headerPlayer && <div className="chat-header-player">{headerPlayer}</div>}
          </header>

          <div
            className="chat-messages"
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-busy={isLoading}
          >
            {messages.length === 0 && (
              <div className="chat-welcome-wrap">
                {/* El del chándal rojo espera sentado en la tarjeta de bienvenida */}
                <img
                  src={sentadoBordeRojo}
                  width="720"
                  height="1187"
                  decoding="async"
                  alt=""
                  className="doodle chat-welcome-doodle neon-art al-ritmo"
                  style={{ '--fase': '0.9' }}
                />
                <div className="chat-welcome">
                  <p className="chat-welcome-tag">ROCKY 035 · EN LÍNEA</p>
                  <h2>Pregunta sin cortarte.</h2>
                  <p className="chat-welcome-copy">
                    Puedo buscar camisetas, comprobar tallas y stock, o contarte quién firma cada
                    rincón de la crew.
                  </p>
                  <div className="chat-quick-prompts" aria-label="Preguntas rápidas">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="chat-quick-prompt"
                        onClick={() => sendMessage(prompt)}
                        disabled={isLoading}
                      >
                        <span aria-hidden="true">↗</span>
                        {prompt}
                      </button>
                    ))}
                  </div>
                  {commerceMode !== 'shopify' && (
                    <p className="chat-demo-note">
                      Estás viendo un catálogo de muestra: pregunta por diseños, pero el stock y el
                      pago aún no son reales.
                    </p>
                  )}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id}
                ref={index === messages.length - 1 ? latestTurnRef : null}
                className={`chat-turn ${message.sender}`}
              >
                <div className={`chat-message ${message.sender} ${message.isError ? 'error' : ''}`}>
                  <img
                    src={message.sender === 'user' ? userLogo : botLogo}
                    alt=""
                    className="chat-avatar neon-art--icon"
                  />
                  <p className="chat-bubble">{message.content}</p>
                </div>

                {message.products?.length > 0 && (
                  <div className="chat-products" aria-label="Productos recomendados por Rocky IA">
                    {message.products.map((product) => (
                      <ChatProductCard
                        key={product.handle}
                        product={product}
                        addToCart={addToCart}
                        commerceMode={commerceMode}
                        canAddToCart={canAddToCart}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="chat-turn ai">
                <div className="chat-message ai">
                  <img src={botLogo} alt="" className="chat-avatar neon-art--icon" />
                  <p
                    className="chat-bubble chat-typing"
                    aria-label="Rocky IA está buscando y escribiendo"
                  >
                    <span />
                    <span />
                    <span />
                  </p>
                </div>
                <p className="chat-searching">Buscando entre los trazos de la casa…</p>
              </div>
            )}
          </div>

          <form
            className="chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <div className="chat-input-wrap">
              <textarea
                rows="1"
                maxLength="1000"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Escríbele a Rocky IA…"
                aria-label="Mensaje para Rocky IA"
              />
              <span className="chat-input-mark" aria-hidden="true">
                035
              </span>
            </div>
            <button
              type="submit"
              className="chat-send"
              disabled={isLoading || !input.trim()}
              aria-label="Enviar mensaje"
            >
              <span>Enviar</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </button>
            <p className="chat-composer-hint">
              Enter para enviar · Shift + Enter para bajar de línea
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

export default ChatComponent;
