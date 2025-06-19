import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import KnowledgeBase from './pages/KnowledgeBase';
import HistoryPage from './pages/HistoryPage';
import { MainLayout } from './components/MainLayout';
import { useState } from 'react';

// Define the structure for a message
interface Message {
  text: string;
  sender: 'user' | 'ai';
}

// Create a client
const queryClient = new QueryClient();

function App() {
  const [messages, setMessages] = useState<Message[]>([]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <MainLayout onNewChat={() => setMessages([])}>
          <Routes>
            <Route path="/" element={<HomePage messages={messages} setMessages={setMessages} />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </MainLayout>
      </Router>
    </QueryClientProvider>
  );
}

export default App; 