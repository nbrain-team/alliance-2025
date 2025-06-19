import { Box, Flex, Text, ScrollArea } from '@radix-ui/themes';
import { CommandCenter } from '../components/CommandCenter';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Define the structure for a message
interface Message {
  text: string;
  sender: 'user' | 'ai';
  sources?: string[];
}

interface HomePageProps {
    messages: Message[];
    setMessages: Dispatch<SetStateAction<Message[]>>;
}

const HomePage = ({ messages, setMessages }: HomePageProps) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleSendMessage = async (query: string) => {
        if (!query.trim()) return;

        const newUserMessage: Message = { text: query, sender: 'user' };
        const currentMessages = [...messages, newUserMessage];
        setMessages(currentMessages);
        setIsLoading(true);

        // Prepare form data, including history
        const params = new URLSearchParams();
        params.append('query', query);
        // We send all messages *except* the last one (the new user query) as history
        params.append('history', JSON.stringify(currentMessages.slice(0, -1)));

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
            setMessages(prev => [...prev, { text: '', sender: 'ai', sources: [] }]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            // Read the stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || ''; // Keep the last, possibly incomplete, line

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.type === 'token') {
                                setMessages(prev => {
                                    const lastMessage = prev[prev.length - 1];
                                    if (lastMessage && lastMessage.sender === 'ai') {
                                        lastMessage.text += data.payload;
                                        return [...prev.slice(0, -1), lastMessage];
                                    }
                                    return prev;
                                });
                            } else if (data.type === 'sources') {
                                setMessages(prev => {
                                    const lastMessage = prev[prev.length - 1];
                                    if (lastMessage && lastMessage.sender === 'ai') {
                                        lastMessage.sources = data.payload;
                                        return [...prev.slice(0, -1), lastMessage];
                                    }
                                    return prev;
                                });
                            } else if (data.type === 'error') {
                                throw new Error(data.payload);
                            }
                        } catch (e) {
                            console.error("Error parsing stream data:", e);
                        }
                    }
                }
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

            <ScrollArea style={{ flex: 1, padding: '1rem', width: '100%' }}>
                <Box style={{ maxWidth: '1000px', margin: '0' }}>
                    {messages.map((msg, index) => (
                        <div key={index} className="message-container">
                            <div className={`message-bubble ${msg.sender}`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                            {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                                <div className="citations">
                                    <span className="citation-title">Sources:</span>
                                    {msg.sources.map((source, i) => (
                                        <span key={i} className="citation-source">{source}</span>
                                    ))}
                                </div>
                            )}
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
    .message-container {
        margin-bottom: 1rem;
        display: flex;
        flex-direction: column;
    }
    .message-bubble {
        max-width: 85%;
        padding: 0.8rem 1.2rem;
        border-radius: 18px;
        word-wrap: break-word;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        border: 1px solid var(--gray-4);
    }
    .message-bubble.user {
        background-color: var(--gray-2); /* Light light grey */
        color: var(--gray-12);
        margin-left: auto;
        border-bottom-right-radius: 4px;
        align-self: flex-end;
    }
    .message-bubble.ai {
        background-color: white; /* White */
        color: var(--gray-12);
        margin-right: auto;
        border-bottom-left-radius: 4px;
        align-self: flex-start;
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
    .citations {
        margin-top: 0.5rem;
        margin-left: 0;
        max-width: 85%;
        font-size: 0.75rem;
        color: var(--gray-10);
        align-self: flex-start;
    }
    .citation-title {
        font-weight: 600;
        margin-right: 0.5rem;
        margin-top: 0.25rem;
        font-family: monospace;
    }
    .citation-source {
        display: inline-block;
        background-color: var(--gray-3);
        padding: 0.1rem 0.5rem;
        border-radius: 99px;
        margin-right: 0.5rem;
        margin-top: 0.25rem;
        font-family: monospace;
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
    /* Tighter Markdown Formatting */
    .message-bubble.ai p {
        margin-block-start: 0;
        margin-block-end: 0.5em;
    }
    .message-bubble.ai p:last-child {
        margin-block-end: 0;
    }
    .message-bubble.ai ul, .message-bubble.ai ol {
        margin-block-start: 0.5em;
        margin-block-end: 0.5em;
        padding-inline-start: 2em;
    }
    .message-bubble.ai li {
        margin-bottom: 0.25em;
    }
    .message-bubble.ai li p {
        margin-block-start: 0;
        margin-block-end: 0;
    }
`;

export default HomePage; 