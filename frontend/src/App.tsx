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

// Define the structure for a message
interface Message {
  text: string;
  sender: 'user' | 'ai';
  sources?: string[]; // Make sources optional here too
}

// Create a client
const queryClient = new QueryClient();

// A wrapper for routes that require authentication
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <div>Loading...</div>; // Or a spinner
  }
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppRoutes() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        {/* Routes within the main layout */}
        <Route path="/*" element={
          isAuthenticated ? (
            <MainLayout onNewChat={() => setMessages([])}>
              <Routes>
                <Route path="/" element={<HomePage messages={messages} setMessages={setMessages} />} />
                <Route path="/knowledge-base" element={<KnowledgeBase />} />
                <Route path="/history" element={
                  <ProtectedRoute>
                    <HistoryPage />
                  </ProtectedRoute>
                } />
              </Routes>
            </MainLayout>
          ) : <Navigate to="/login" />
        }/>
      </Routes>
    </Router>
  );
}

export default App; 