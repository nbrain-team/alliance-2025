import { Box, Flex, Text, ScrollArea } from '@radix-ui/themes';
import { ChatInput } from '../components/ChatInput';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Define the structure for a message
interface Message {
  text: string;
  sender: 'user' | 'ai';
}

// --- Main App Component ---
function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const navigate = useNavigate();

  // --- Backend Mutations ---
  const queryMutation = useMutation({
    mutationFn: (newQuery: string) => axios.post('http://localhost:8000/query', new URLSearchParams({ query: newQuery })),
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
      setMessages(prev => [...prev, { text: input, sender: 'user' }, { text: 'Thinking...', sender: 'ai' }]);
      queryMutation.mutate(input);
      setInput('');
    }
  };

  return (
    <Flex style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <style>{STYLES}</style>
      {/* --- Sidebar --- */}
      <Sidebar onNavigate={navigate} />

      {/* --- Main Content --- */}
      <Flex direction="column" style={{ flexGrow: 1, height: '100vh' }}>
        {/* --- Header --- */}
        <Header />

        {/* --- Chat Area --- */}
        <ScrollArea style={{ flexGrow: 1 }}>
          <Box style={{ padding: '1.5rem' }}>
            {messages.length === 0 ? (
              <InitialView />
            ) : (
              <Flex direction="column" gap="3">
                {messages.map((msg, index) => (
                  <ChatBubble key={index} message={msg} />
                ))}
              </Flex>
            )}
          </Box>
        </ScrollArea>

        {/* --- Input Area --- */}
        <Box style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
          <ChatInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onSend={handleSend}
            isLoading={queryMutation.isPending}
          />
        </Box>
      </Flex>
    </Flex>
  );
}

// --- Sub-components ---

const Sidebar = ({ onNavigate }: { onNavigate: (path: string) => void }) => (
  <Flex
    direction="column"
    align="center"
    gap="4"
    style={{
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      padding: '1.5rem 0.5rem',
      boxShadow: 'var(--shadow)',
    }}
  >
    <img src="/new-icons/1.png" alt="Company Logo" style={{ width: '48px', height: '48px' }} />
    <SidebarButton icon="/new-icons/2.png" title="History" />
    <SidebarButton icon="/new-icons/4.png" title="Upload" onClick={() => onNavigate('/knowledge-base')} />
    <SidebarButton icon="/new-icons/5.png" title="Industry Feed" />
    <SidebarButton icon="/new-icons/11.png" title="Reporting Queue" />
    <Box style={{ flexGrow: 1 }} />
    <SidebarButton icon="/new-icons/6.png" title="Logout" />
  </Flex>
);

const SidebarButton = ({ icon, title, onClick }: { icon: string; title: string, onClick?: () => void }) => (
  <button className="sidebar-icon-placeholder" title={title} onClick={onClick}>
    <img src={icon} alt={title} style={{ width: '28px', height: '28px' }} />
  </button>
);


const Header = () => (
  <Flex
    align="center"
    justify="between"
    style={{
      padding: '1rem 1.5rem',
      borderBottom: '1px solid var(--border)',
      boxShadow: 'var(--shadow)',
      backgroundColor: 'var(--header-bg)',
    }}
  >
    <Text size="5" weight="bold" style={{ color: 'var(--primary)' }}>AdsIntelligence</Text>
    {/* Placeholder for future controls */}
    <Box />
  </Flex>
);

const InitialView = () => (
  <Box className="initial-view-container">
    <Box className="initial-text-content">
      <h1>Welcome to ADTV</h1>
      <p>Your AI-powered command center. Upload documents or ask questions to get started.</p>
    </Box>
  </Box>
);

const ChatBubble = ({ message }: { message: Message }) => {
  const isUser = message.sender === 'user';
  const bubbleClass = isUser ? 'user-bubble' : 'assistant-bubble';
  const textContent = message.text;

  const createMarkup = (text: string) => {
    return { __html: text };
  };

  return (
    <Box
      className={`chat-bubble ${bubbleClass}`}
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        whiteSpace: 'pre-wrap', // Ensures formatting is preserved
      }}
    >
      {/* Using dangerouslySetInnerHTML to render potential HTML content from the LLM */}
      {textContent.includes('<') ? (
        <div dangerouslySetInnerHTML={createMarkup(textContent)} />
      ) : (
        <Text>{textContent}</Text>
      )}
    </Box>
  );
};


// --- Styles from base.html and index.html ---
const STYLES = `
  :root {
    --primary: #313d74;
    --primary-light: #e8eaf6;
    --bg: #f7fafd;
    --sidebar-bg: #ffffff;
    --sidebar-width: 125px;
    --card-bg: #fff;
    --shadow: 0 2px 16px rgba(0,0,0,0.06);
    --border: #e5e7eb;
    --radius: 14px;
    --gray: #64748b;
    --gray-light: #f1f5f9;
    --accent: #313d74;
    --text-primary: #222;
    --text-secondary: #4b5563;
    --icon-color: #6b7280;
    --icon-hover-color: var(--primary);
    --input-bg: #fff;
    --input-border: var(--border);
    --command-center-bg: #ffffff;
    --header-bg: #ffffff;
  }
  .sidebar-icon-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
    border-radius: var(--radius);
    cursor: pointer;
    transition: background-color 0.2s, color 0.2s;
    color: var(--icon-color);
    width: 48px;
    height: 48px;
    background: none;
    border: none;
  }
  .sidebar-icon-placeholder:hover {
    background-color: var(--primary-light);
    color: var(--primary);
  }
  .initial-view-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    text-align: center;
    color: var(--text-secondary);
  }
  .initial-text-content {
    max-width: 500px;
  }
  .initial-text-content h1 {
    font-size: 2.5rem;
    color: var(--primary);
    margin-bottom: 0.5rem;
  }
  .chat-bubble {
    max-width: 75%;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    line-height: 1.5;
  }
  .user-bubble {
    background-color: var(--primary);
    color: white;
    border-bottom-right-radius: 0;
  }
  .assistant-bubble {
    background-color: var(--card-bg);
    color: var(--text-primary);
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
    border-bottom-left-radius: 0;
  }
`;

export default HomePage; 