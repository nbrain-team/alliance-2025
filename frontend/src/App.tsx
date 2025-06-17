import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import { MainLayout } from './components/MainLayout';
import { useState } from 'react';

// Define the structure for a message
interface Message {
  text: string;
  sender: 'user' | 'ai';
}


function App() {
  const [messages, setMessages] = useState<Message[]>([]);

  return (
    <Router>
      <MainLayout onNewChat={() => setMessages([])}>
        <Routes>
          <Route path="/" element={<HomePage messages={messages} setMessages={setMessages} />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App; 