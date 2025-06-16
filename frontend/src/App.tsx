import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import KnowledgeBase from './pages/KnowledgeBase';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/knowledge-base" element={<KnowledgeBase />} />
      </Routes>
    </Router>
  );
}

export default App; 