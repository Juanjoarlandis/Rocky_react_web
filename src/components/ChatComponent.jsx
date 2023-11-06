import React, { useState } from 'react';
import '../styles/ChatComponent.css';

const ChatComponent = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) {
            return;
        }

        setIsLoading(true); // Set loading to true before the request starts

        // Create the messages array including past messages and the new user input
        const messagesPayload = messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
        })).concat({
            role: "user",
            content: input
        });

        const requestOptions = {
            method: 'POST',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': '6b337c13-24f2-4eb4-b180-c01a5fc9f622',
            },
            body: JSON.stringify({
                "messages": messagesPayload,
                "uids": [603],
                "count": 1,
                "return_all": true,
                "exclude_unavailable": true
            })
        };

        try {
            const response = await fetch('/api/proxi', requestOptions);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Check for the expected structure and existence of choices
            if (!data.choices || !data.choices.length || !data.choices[0].message) {
                console.error('AI response is not in the expected format', data);
                throw new Error('AI response is not in the expected format');
            }

            // Extract the content from the first available message from the choices
            const aiResponseContent = data.choices[0].message.content;

            setMessages(messages => [
                ...messages,
                { sender: 'user', content: input },
                { sender: 'ai', content: aiResponseContent }
            ]);
        } catch (error) {
            console.error('There was an error with the AI response', error);
        } finally {
            setIsLoading(false);
            setInput('');
        }
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
                {isLoading && <div className="chat-message loading">Loading...</div>}
            </div>
            <div className="chat-input-box">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                />
                <button onClick={handleSubmit} disabled={isLoading}>Enviar</button>
            </div>
        </div>
    );
};

export default ChatComponent;
