import { Box, Flex, Text, ScrollArea } from '@radix-ui/themes';
import { CommandCenter } from '../components/CommandCenter';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link as RouterLink } from 'react-router-dom';

// Define the structure for a message
interface Message {
  text: string;
  sender: 'user' | 'ai';
}

interface HomePageProps {
    messages: Message[];
    setMessages: Dispatch<SetStateAction<Message[]>>;
}

const HomePage = ({ messages, setMessages }: HomePageProps) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleSendMessage = async (query: string) => {
        if (!query.trim()) return;

        // Add user's message to the chat
        setMessages(prev => [...prev, { text: query, sender: 'user' }]);
        setIsLoading(true);

        // Prepare form data
        const params = new URLSearchParams();
        params.append('query', query);

        try {
            // Initiate the streaming request
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/query`, {
                method: 'POST',
                body: params,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server responded with ${response.status}: ${errorText}`);
            }

            if (!response.body) {
                throw new Error("Response body is null");
            }

            // Add a new AI message to the chat that will be updated as chunks arrive
            setMessages(prev => [...prev, { text: '', sender: 'ai' }]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            // Read the stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                
                setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage.sender === 'ai') {
                        // Append the new chunk to the last AI message
                        lastMessage.text += chunk;
                        return [...prev.slice(0, -1), lastMessage];
                    }
                    return prev;
                });
            }

        } catch (error) {
            console.error('Error fetching stream:', error);
            setMessages(prev => [...prev, { text: 'Sorry, something went wrong.', sender: 'ai' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Flex direction="column" style={{ height: '100vh', backgroundColor: 'var(--gray-1)' }}>
            <Box style={{
                padding: '1rem',
                borderBottom: '1px solid var(--gray-4)',
                backgroundColor: 'white'
            }}>
                <Text size="5" weight="bold" style={{ color: 'var(--gray-12)' }}>ADTV AI Assistant</Text>
            </Box>

            <ScrollArea style={{ flex: 1, padding: '1rem' }}>
                <Box style={{ maxWidth: '800px', margin: '0 auto' }}>
                    {messages.map((msg, index) => (
                        <div key={index} className={`message-bubble ${msg.sender}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.text}
                            </ReactMarkdown>
                        </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.sender === 'user' && (
                         <div className="message-bubble ai">
                            <div className="thinking-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                         </div>
                    )}
                </Box>
            </ScrollArea>
            
            <Box style={{ 
                padding: '1rem', 
                borderTop: '1px solid var(--gray-4)', 
                backgroundColor: 'white'
            }}>
                <CommandCenter onSend={handleSendMessage} isLoading={isLoading} />
            </Box>
            <style>{STYLES}</style>
        </Flex>
    );
};

const STYLES = `
    .message-bubble {
        max-width: 85%;
        padding: 0.8rem 1.2rem;
        border-radius: 18px;
        margin-bottom: 1rem;
        word-wrap: break-word;
        white-space: pre-wrap;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    .message-bubble.user {
        background-color: #1c3d7a; /* Dark blue */
        color: white;
        margin-left: auto;
        border-bottom-right-radius: 4px;
    }
    .message-bubble.ai {
        background-color: #f0f4f8; /* Light grey-blue */
        color: var(--gray-12);
        margin-right: auto;
        border: 1px solid var(--gray-5);
        border-bottom-left-radius: 4px;
    }
    .message-bubble.ai table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
        overflow: hidden;
        border-radius: 8px;
        border: 1px solid var(--gray-5);
    }
    .message-bubble.ai th, .message-bubble.ai td {
        padding: 0.8rem;
        text-align: left;
        border-bottom: 1px solid var(--gray-5);
    }
    .message-bubble.ai th {
        background-color: var(--gray-2);
        font-weight: 600;
    }
    .message-bubble.ai tr:last-child td {
        border-bottom: none;
    }
    .thinking-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 20px;
    }
    .thinking-indicator span {
        width: 8px;
        height: 8px;
        margin: 0 2px;
        background-color: var(--gray-8);
        border-radius: 50%;
        display: inline-block;
        animation: bounce 1.4s infinite ease-in-out both;
    }
    .thinking-indicator span:nth-child(1) { animation-delay: -0.32s; }
    .thinking-indicator span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1.0); }
    }
`;

export default HomePage; 