import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import KnowledgeBase from './pages/KnowledgeBase';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { MainLayout } from './components/MainLayout';
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Theme } from '@radix-ui/themes';
import Sidebar from './components/Sidebar';
import { Box, Flex } from '@radix-ui/themes';
import SignUpPage from './pages/SignUpPage';

// Define the structure for a message
interface Message {
  text: string;
  sender: 'user' | 'ai';
  sources?: string[]; // Make sources optional here too
}

// Create a client
const queryClient = new QueryClient();

// A wrapper for routes that require authentication
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <div>Loading...</div>; // Or a spinner
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// The main App component that ties everything together
const App = () => {
  // This is the central state for chat messages
  const [messages, setMessages] = useState<Message[]>([]);

  return (
    <Router>
      <Routes>
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
        <Route path="/auth/*" element={<AuthLayout />} />
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
          <Route path="/history" element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          } />
        </Routes>
      </Box>
    </Flex>
  );
}

// A wrapper for authentication routes like login and signup
const AuthLayout = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignUpPage />} />
  </Routes>
);

// ProtectedRoute checks if a user is authenticated before rendering a component
const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/" />;
};

export default () => (
  <AuthProvider>
    <Theme>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Theme>
  </AuthProvider>
); 