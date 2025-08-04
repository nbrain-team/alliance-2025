import { Box, Flex, Text, ScrollArea, IconButton, Heading } from '@radix-ui/themes';
import { CommandCenter } from '../components/CommandCenter';
import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ThickArrowUpIcon, ThickArrowDownIcon } from '@radix-ui/react-icons';
import Select from 'react-select';
import { properties } from '../constants/properties';
import { v4 as uuidv4 } from 'uuid';

// Make this interface flexible to avoid conflict with App.tsx
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  sources?: (string | { source: string })[];
}

interface HomePageProps {
    messages: Message[];
    setMessages: Dispatch<SetStateAction<Message[]>>;
}

const selectStyles = {
    control: (provided: any) => ({
        ...provided,
        minHeight: '40px', // Matches Radix TextField size="3"
        height: '40px',
        boxShadow: 'none',
        '&:hover': {
            borderColor: 'var(--gray-8)',
        }
    }),
    valueContainer: (provided: any) => ({
        ...provided,
        height: '40px',
        padding: '0 8px'
    }),
    input: (provided: any) => ({
        ...provided,
        margin: '0px',
    }),
    indicatorsContainer: (provided: any) => ({
        ...provided,
        height: '40px',
    }),
};

const HomePage = ({ messages, setMessages }: HomePageProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProperties, setSelectedProperties] = useState<{ value: string; label: string; }[]>([]);
    const { logout } = useAuth();
    const navigate = useNavigate();
    
    const [feedbackRatings, setFeedbackRatings] = useState<{ [messageId: string]: 'good' | 'bad' | null }>({});
    const [feedbackNotes, setFeedbackNotes] = useState<{ [messageId: string]: string }>({});
    const [feedbackSubmitted, setFeedbackSubmitted] = useState<{ [messageId: string]: boolean }>({});

    useEffect(() => {
        // Find the conversation ID from the very first message if it exists
        const conversationId = messages.length > 0 ? messages[0].id : null;
        if (conversationId) {
            // You could potentially fetch existing feedback for this conversation here if needed
        }
    }, [messages]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSendMessage = async (query: string) => {
        if (!query.trim()) return;

        const conversationId = messages.length > 0 ? messages[0].id : uuidv4();
        const newUserMessage: Message = { id: conversationId, text: query, sender: 'user' };
        
        setMessages(prev => [...prev, newUserMessage]);
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error("Authentication token not found.");
            }

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: query,
                    history: messages.map(({ id, ...rest }) => rest),
                    properties: selectedProperties.map(p => p.value)
                }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid
                    console.error('Authentication failed, redirecting to login');
                    logout();
                    navigate('/login');
                    return;
                }
                throw new Error(`Server error: ${response.status}`);
            }

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let aiResponse = '';
            let isFirstChunk = true;
            const aiMessageId = uuidv4();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const eventLines = chunk.split('\n\n').filter(line => line.startsWith('data:'));

                for (const line of eventLines) {
                    if (isFirstChunk) {
                        setMessages(prev => [...prev, { id: aiMessageId, text: '', sender: 'ai', sources: [] }]);
                        isFirstChunk = false;
                    }

                    const jsonStr = line.substring(6);
                    if (jsonStr.trim() === '[DONE]') continue;
                    try {
                        const parsedData = JSON.parse(jsonStr);
                        if (parsedData.content) {
                            aiResponse += parsedData.content;
                        }
                        
                        setMessages(prev => {
                            const newMessages = [...prev];
                            const lastMessage = newMessages[newMessages.length - 1];
                            if (lastMessage?.sender === 'ai') {
                                lastMessage.text = aiResponse;
                                if (parsedData.sources) {
                                    lastMessage.sources = parsedData.sources;
                                }
                            }
                            return newMessages;
                        });
                    } catch (e) {
                        console.error('Error parsing stream JSON:', e, 'Received:', jsonStr);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching stream:', error);
            if (error instanceof Error && error.message.includes('401')) {
                logout();
                navigate('/login');
            } else {
                setMessages(prev => [...prev, { id: uuidv4(), text: 'Sorry, I ran into an issue.', sender: 'ai' }]);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFeedback = (messageId: string, rating: 'good' | 'bad') => {
        setFeedbackRatings(prev => ({ ...prev, [messageId]: rating }));
        if (rating === 'good') {
            submitFeedback(messageId, rating, '');
        }
    };

    const submitFeedback = async (messageId: string, rating: 'good' | 'bad', notes: string) => {
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        const conversationId = messages[0]?.id || 'standalone_message';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    conversation_id: conversationId,
                    message_id: message.id,
                    message_text: message.text,
                    rating: rating,
                    notes: notes,
                })
            });

            if (!response.ok) {
                throw new Error('Failed to submit feedback.');
            }
            
            setFeedbackSubmitted(prev => ({ ...prev, [messageId]: true }));
        } catch (error) {
            console.error('Error submitting feedback:', error);
            setFeedbackRatings(prev => ({ ...prev, [messageId]: null }));
        }
    };

    return (
        <Flex direction="column" style={{ height: '100vh', backgroundColor: 'var(--gray-1)' }}>
            <Box style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--gray-4)', backgroundColor: 'white' }}>
                <Heading size="7" style={{ color: 'var(--gray-12)' }}>AI Chat</Heading>
                <Text as="p" size="3" style={{ color: 'var(--gray-10)', marginTop: '0.25rem' }}>
                    Ask questions and get answers from your internal knowledge base, powered by AI.
                </Text>
            </Box>

            <ScrollArea style={{ flex: 1, padding: '1rem', width: '100%' }}>
                <Box style={{ maxWidth: '1000px', margin: '0' }}>
                    {messages.map((msg, index) => (
                        <div key={msg.id} className="message-container">
                            <div className={`message-bubble ${msg.sender}`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                            {msg.sender === 'ai' && !feedbackSubmitted[msg.id] && (
                                <div className="feedback-container">
                                    <IconButton
                                        size="1"
                                        variant="ghost"
                                        className={`feedback-button ${feedbackRatings[msg.id] === 'good' ? 'selected' : ''}`}
                                        onClick={() => handleFeedback(msg.id, 'good')}
                                    >
                                        <ThickArrowUpIcon />
                                    </IconButton>
                                    <IconButton
                                        size="1"
                                        variant="ghost"
                                        className={`feedback-button ${feedbackRatings[msg.id] === 'bad' ? 'selected' : ''}`}
                                        onClick={() => handleFeedback(msg.id, 'bad')}
                                    >
                                        <ThickArrowDownIcon />
                                    </IconButton>
                                </div>
                            )}
                            {feedbackRatings[msg.id] === 'bad' && !feedbackSubmitted[msg.id] && (
                                <div className="feedback-input-container">
                                    <input
                                        type="text"
                                        className="feedback-input"
                                        placeholder="Add a note (optional)..."
                                        value={feedbackNotes[msg.id] || ''}
                                        onChange={(e) => setFeedbackNotes(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                    />
                                    <button
                                        className="feedback-submit-button"
                                        onClick={() => submitFeedback(msg.id, 'bad', feedbackNotes[msg.id] || '')}
                                    >
                                        Submit
                                    </button>
                                </div>
                            )}
                            {feedbackSubmitted[msg.id] && (
                                <div className="feedback-thanks">Thank you for your feedback!</div>
                            )}
                            {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                                <div className="citations">
                                    <span className="citation-title">Sources:</span>
                                    {msg.sources.map((source, i) => {
                                        const sourceText = typeof source === 'string' ? source : source.source;
                                        return <span key={i} className="citation-source">{sourceText}</span>
                                    })}
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
                padding: '1.5rem 1rem', 
                borderTop: '1px solid var(--gray-4)', 
                backgroundColor: 'white'
            }}>
                <Flex gap="3" align="center" style={{ maxWidth: '1000px', margin: '0' }}>
                    <Box style={{ width: '350px' }}>
                        <Select
                            isMulti
                            options={properties.map(p => ({ value: p, label: p }))}
                            value={selectedProperties}
                            onChange={(selected) => setSelectedProperties(selected as any)}
                            placeholder="Select properties to search..."
                            styles={selectStyles}
                            menuPlacement="top"
                        />
                    </Box>
                    <Box style={{ flexGrow: 1 }}>
                        <CommandCenter onSend={handleSendMessage} isLoading={isLoading} />
                    </Box>
                </Flex>
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
        padding: 0.8rem 1.2rem;
    }
    .thinking-indicator span {
        height: 8px;
        width: 8px;
        background-color: var(--gray-8);
        border-radius: 50%;
        display: inline-block;
        margin: 0 2px;
        animation: thinking 1.4s infinite ease-in-out both;
    }
    .thinking-indicator span:nth-child(1) {
        animation-delay: -0.32s;
    }
    .thinking-indicator span:nth-child(2) {
        animation-delay: -0.16s;
    }
    @keyframes thinking {
        0%, 80%, 100% {
            transform: scale(0);
        }
        40% {
            transform: scale(1.0);
        }
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
    .feedback-container {
        display: flex;
        gap: 0.5rem;
        align-self: flex-start;
        margin-top: 0.5rem;
        margin-left: 0.5rem;
    }
    .feedback-button.selected {
        background-color: var(--accent-a4);
        color: var(--accent-a11);
    }
    .feedback-input-container {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
        width: 85%;
        align-self: flex-start;
    }
    .feedback-input {
        flex-grow: 1;
        border: 1px solid var(--gray-6);
        border-radius: 4px;
        padding: 0.4rem 0.6rem;
        font-size: 0.875rem;
    }
    .feedback-submit-button {
        background-color: var(--accent-9);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0.4rem 0.8rem;
        cursor: pointer;
        font-size: 0.875rem;
    }
    .feedback-submit-button:hover {
        background-color: var(--accent-10);
    }
    .feedback-thanks {
        align-self: flex-start;
        margin-top: 0.5rem;
        margin-left: 0.5rem;
        font-size: 0.8rem;
        color: var(--gray-10);
        font-style: italic;
    }
`;

export default HomePage; 