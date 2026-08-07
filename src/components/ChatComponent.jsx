import React, { useEffect, useRef, useState } from 'react';
import userLogo from '../images/menu.png';
import botLogo from '../images/ia.png';
import sentadoBordeRojo from '../images/characters/sentado-borde-rojo.png';
import '../styles/ChatComponent.css';

const ERROR_MESSAGE =
    'Ahora mismo no puedo responder (el servidor de la IA no está disponible). Inténtalo más tarde.';

const ChatComponent = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages, isLoading]);

    const handleSubmit = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const history = messages.map((msg) => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content,
        }));

        // El mensaje del usuario se muestra inmediatamente
        setMessages((prev) => [...prev, { sender: 'user', content: text }]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...history, { role: 'user', content: text }],
                }),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            const content = data?.message;
            if (!content) {
                throw new Error('Respuesta con formato inesperado');
            }
            setMessages((prev) => [...prev, { sender: 'ai', content }]);
        } catch (error) {
            console.error('Error al hablar con Rocky IA:', error);
            setMessages((prev) => [
                ...prev,
                { sender: 'ai', content: ERROR_MESSAGE, isError: true },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-page">
            <div className="chat-shell">
                {/* Un chaval sentado en lo alto del chat, piernas sobre la cabecera */}
                <img
                    src={sentadoBordeRojo}
                    width="720"
                    height="1187"
                    decoding="async"
                    alt=""
                    className="chat-doodle"
                />
                <div className="chat-card">
                <div className="chat-header">
                    <img src={botLogo} alt="" className="chat-header-avatar" />
                    <div>
                        <p className="chat-header-title">Rocky IA</p>
                        <p className="chat-header-status">El asistente de la banda</p>
                    </div>
                </div>

                <div className="chat-messages" ref={scrollRef}>
                    {messages.length === 0 && (
                        <div className="chat-welcome">
                            <p>Pregúntame lo que quieras sobre ROCKY 035.</p>
                        </div>
                    )}
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`chat-message ${message.sender} ${message.isError ? 'error' : ''}`}
                        >
                            <img
                                src={message.sender === 'user' ? userLogo : botLogo}
                                alt=""
                                className="chat-avatar"
                            />
                            <p className="chat-bubble">{message.content}</p>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="chat-message ai">
                            <img src={botLogo} alt="" className="chat-avatar" />
                            <p className="chat-bubble chat-typing" aria-label="Rocky IA está escribiendo">
                                <span></span><span></span><span></span>
                            </p>
                        </div>
                    )}
                </div>

                <form
                    className="chat-input"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit();
                    }}
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        aria-label="Mensaje para Rocky IA"
                    />
                    <button type="submit" className="btn btn-primary" disabled={isLoading || !input.trim()}>
                        Enviar
                    </button>
                </form>
                </div>
            </div>
        </div>
    );
};

export default ChatComponent;
