import React, { useState } from 'react';
import '../styles/ChatComponent.css';

const ChatComponent = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false); // state to handle loading indicator

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) {
            return;
        }

        setIsLoading(true); // Set loading to true before the request starts

        // Create the messages array including past messages and the new user input
        const messagesPayload = messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant', // Map 'user' or 'ai' to 'user' or 'assistant'
            content: msg.content
        })).concat({
            role: "user",
            content: input // The user's input from the state
        });

        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "messages": messagesPayload,
                "uids": [603],
                "count": 1,
                "return_all": true,
                "exclude_unavailable": true // if you want to exclude unavailable UIDs
            })
        };

        try {
            const response = await fetch('https://www.rocky035.com:443/api/proxy', requestOptions); // This is the endpoint in your server.js
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log(data);

            // Assuming 'data.choices' contains the response from the AI with the latest message
            const aiResponseContent = data.choices[0].message.content;

            // Add the new user message and AI response to the state
            setMessages(messages => [
                ...messages,
                { sender: 'user', content: input },
                { sender: 'ai', content: aiResponseContent }
            ]);
        } catch (error) {
            console.error('There was an error with the AI response', error);
        } finally {
            setIsLoading(false); // Set loading to false after the request is done
            setInput(''); // Clear the input field
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
