import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import HomePage from './pages/HomePage';
import KnowledgeBase from './pages/KnowledgeBase';
import Sidebar from './components/Sidebar';
import { Box, Flex } from '@radix-ui/themes';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import { AuthProvider, useAuth } from './context/AuthContext';

// This interface must match the one in HomePage.tsx
interface Message {
  text: string;
  sender: 'user' | 'ai';
  sources?: { source: string }[];
}

// The main App component that ties everything together
const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/*" element={<AppLayout />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
};

// A wrapper component to define the main application layout
const AppLayout = () => {
    const [messages, setMessages] = useState<Message[]>([
        { 
            text: "Hello! I'm the American Dream TV AI Assistant. I can help answer questions about our shows, hosts, and production guidelines. How can I help you today?", 
            sender: 'ai' 
        }
    ]);

    return (
        <Flex>
            <Sidebar />
            <Box style={{ flex: 1, overflow: 'auto' }}>
                <Routes>
                    <Route path="/" element={<HomePage messages={messages} setMessages={setMessages} />} />
                    <Route path="/knowledge" element={<KnowledgeBase />} />
                    {/* Add other main application routes here */}
                </Routes>
            </Box>
        </Flex>
    );
}

// ProtectedRoute checks if a user is authenticated before rendering a component
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/login" />;
};

export default () => (
    <AuthProvider>
        <Theme>
            <App />
        </Theme>
    </AuthProvider>
); 