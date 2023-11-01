import React, { useState } from 'react';
import '../styles/ChatComponent.css';

const ChatComponent = ({ apiEndpoint }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    const handleSubmit = async () => {
        // Aquí llamarías a tu API para obtener la respuesta de la IA.
        // Simularemos una respuesta por ahora:
        const aiResponse = 'Hola, soy una IA. ¿En qué puedo ayudarte?';
        setMessages([...messages, { sender: 'user', content: input }, { sender: 'ai', content: aiResponse }]);
        setInput('');
    };

    return (
        <div className="main-container">
            <h1>Bienvenido a la Rocky-IA</h1>
            <div className="chat-container">
                {messages.map((message, index) => (
                    <div key={index} className={`chat-message ${message.sender}`}>
                        <p>{message.content}</p>
                    </div>
                ))}
            </div>
            <div className="chat-input-box">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe un mensaje..."
                />
                <button onClick={handleSubmit}>Enviar</button>
            </div>
        </div>
    );
};

export default ChatComponent;
