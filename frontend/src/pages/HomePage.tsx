import { Box, Flex, Text, ScrollArea } from '@radix-ui/themes';
import { CommandCenter } from '../components/CommandCenter';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../api';
import React from 'react';

// Define the structure for a message
interface Message {
  text: string;
  sender: 'user' | 'ai';
}

interface HomePageProps {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

// --- Main App Component ---
function HomePage({ messages, setMessages }: HomePageProps) {
  const [input, setInput] = useState('');

  // --- Backend Mutations ---
  const queryMutation = useMutation({
    mutationFn: (newQuery: string) => api.post('/query', new URLSearchParams({ query: newQuery })),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { text: data.data.answer, sender: 'ai' }]);
    },
    onError: () => {
      setMessages((prev) => [...prev, { text: "Sorry, something went wrong.", sender: 'ai' }]);
    },
    onSettled: () => {
      // Remove "Thinking..." message
      setMessages(prev => prev.filter(m => m.text !== 'Thinking...'));
    }
  });

  // --- Event Handlers ---
  const handleSend = () => {
    if (input.trim()) {
      const newMessages: Message[] = [...messages, { text: input, sender: 'user' }];
      if (messages.length === 0) { // Add thinking message only on first send
          newMessages.push({ text: 'Thinking...', sender: 'ai' });
      } else {
           setMessages(prev => [...prev, { text: 'Thinking...', sender: 'ai' }]);
      }
      setMessages(newMessages);
      queryMutation.mutate(input);
      setInput('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return (
    <>
        <style>{STYLES}</style>
        <Flex direction="column" style={{ flexGrow: 1, height: '100vh' }}>
            {messages.length === 0 ? (
                 <div className="initial-view-container">
                    <div className="initial-text-content">
                        <h1>American Dream TV AI Console</h1>
                        <p>Ask questions about your ads, analytics, or performance. Start by typing your query below.</p>
                    </div>
                </div>
            ) : (
                <ScrollArea type="auto" scrollbars="vertical" style={{ flexGrow: 1 }}>
                    <Box style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
                        {messages.map((message, index) => (
                            <div key={index} className={`message ${message.sender}`}>
                                <Text>{message.text}</Text>
                            </div>
                        ))}
                    </Box>
                </ScrollArea>
            )}
            
            <Box style={{ 
                padding: '1rem 1.5rem', 
                borderTop: '1px solid var(--border)',
                backgroundColor: 'var(--card-bg)',
                position: 'sticky',
                bottom: 0,
             }}>
                 <CommandCenter 
                    input={input}
                    onInputChange={handleInputChange}
                    onSend={handleSend}
                    isLoading={queryMutation.isPending}
                />
            </Box>
        </Flex>
    </>
  );
}

const STYLES = `
    .initial-view-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: left;
        padding: 2rem 1.5rem;
        flex-grow: 1;
        padding-left: 3rem;
    }
    .initial-text-content {
        max-width: 600px;
        margin-left: 0;
        text-align: left;
    }
    .initial-view-container h1 {
        font-size: 2rem;
        color: var(--primary);
        margin-bottom: 0.5rem;
    }
    .initial-view-container p {
        font-size: 1.1rem;
        color: var(--text-secondary);
        margin-bottom: 2rem;
    }
    .chat-history {
        flex-grow: 1;
        padding: 1.5rem;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .chat-bubble {
        max-width: 80%;
        padding: 0.7rem 1.1rem;
        border-radius: var(--radius);
        font-size: 1rem;
        box-shadow: var(--shadow);
        line-height: 1.5;
        word-wrap: break-word;
    }
    .user-bubble {
        align-self: flex-end;
        background: var(--primary-light);
        color: var(--text-primary);
        border-top-right-radius: 4px;
    }
    .assistant-bubble {
        align-self: flex-start;
        background: var(--card-bg);
        color: var(--text-primary);
        border: 1px solid var(--border);
        border-top-left-radius: 4px;
        position: relative;
    }
    .loading-dots { font-size: 1.2em; letter-spacing: 2px; animation: blink-smooth 1.4s infinite both; }
    .loading-dots span { animation: blink-smooth 1.4s infinite both; }
    .loading-dots span:nth-child(2) { animation-delay: .2s; }
    .loading-dots span:nth-child(3) { animation-delay: .4s; }
    @keyframes blink-smooth { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }
    
    .command-center {
        padding: 1rem 0;
        width: 100%;
        box-sizing: border-box;
        z-index: 100;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        position: relative;
        overflow: visible;
        flex-wrap: nowrap;
    }
    .command-center-input {
        flex-grow: 1;
    }
    .command-center-icon-button {
        background: none;
        border: none;
        padding: 0.5rem;
        cursor: pointer;
        color: var(--icon-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s, color 0.2s;
        position: relative;
    }
    .command-center-icon-button:hover {
        background-color: var(--gray-light);
        color: var(--icon-hover-color);
    }
    .command-center-icon-button.disabled { opacity: 0.5; pointer-events: none; }
    
    .controls-popover {
        display: block;
        position: absolute;
        bottom: calc(100% + 0.5rem);
        background-color: var(--card-bg);
        border-radius: var(--radius);
        box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
        border: 1px solid var(--border);
        padding: 1rem;
        z-index: 1000;
        width: 300px;
        color: var(--text-primary);
    }
     .controls-popover-content {
        min-height: 100px;
        max-height: 400px;
        overflow-y: auto;
    }
    .scrollable-metric-list {
        max-height: 400px;
        overflow-y: auto;
        margin: 0.5rem 0;
    }
    .popover-option {
        padding: 0.75rem;
        cursor: pointer;
        border-radius: 8px;
        transition: background-color 0.2s;
        font-size: 0.95rem;
    }
    .popover-option:hover {
        background-color: var(--gray-light);
    }
    .popover-label {
        display: block;
        margin: 0.5rem 0;
        font-size: 0.9rem;
    }
    hr {
        border: none;
        border-top: 1px solid var(--border);
        margin: 1rem 0;
    }
    .switch {
        position: relative;
        display: inline-block;
        width: 40px;
        height: 22px;
    }
    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: .4s;
    }
    .slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .4s;
    }
    input:checked + .slider {
        background-color: var(--primary);
    }
    input:checked + .slider:before {
        transform: translateX(18px);
    }
    .slider.round {
        border-radius: 22px;
    }
    .slider.round:before {
        border-radius: 50%;
    }
    #date-controls-popover {
        min-height: 350px !important;
    }
`;


export default HomePage; 