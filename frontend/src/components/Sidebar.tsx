import { Flex } from '@radix-ui/themes';
import { useNavigate } from 'react-router-dom';
import {
    HomeIcon,
    ChatBubbleIcon,
    ReaderIcon,
    FileTextIcon,
    BackpackIcon,
    BarChartIcon,
    ExitIcon,
    RocketIcon
} from '@radix-ui/react-icons';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { name: 'Knowledge Base', href: '/knowledge-base', icon: BackpackIcon },
    { name: 'AI Report Generator', href: '/generator', icon: FileTextIcon },
    { name: 'Chat History', href: '/history', icon: ReaderIcon },
    { name: 'Feedback Log', href: '/feedback', icon: BarChartIcon }
];

export const Sidebar = ({ onNewChat }: { onNewChat: () => void }) => {
    const navigate = useNavigate();

    const handleNewChatClick = () => {
        navigate('/');
        onNewChat();
    };

    return (
        <Flex 
            direction="column" 
            align="center" 
            gap="4"
            style={{ 
                width: 'var(--sidebar-width)', 
                height: '100vh', 
                padding: '1.5rem 0',
                backgroundColor: 'var(--sidebar-bg)',
                borderRight: '1px solid var(--border)',
                boxShadow: 'var(--shadow)',
                position: 'fixed',
                left: 0,
                top: 0,
                zIndex: 100
            }}
        >
            <button className="sidebar-icon" title="Home" onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                <img src="/new-icons/1.png" alt="Alliance Logo" style={{ width: '60px', height: '60px', marginBottom: '1rem' }} />
            </button>
            
            <Flex direction="column" align="center" gap="8" style={{ marginTop: '125px' }}>
                <button className="sidebar-icon" title="New Chat" onClick={handleNewChatClick}>
                    <img src="/new-icons/13.png" alt="New Chat" />
                </button>
                <button className="sidebar-icon" title="Chat History" onClick={() => navigate('/history')}>
                    <img src="/new-icons/2.png" alt="History" />
                </button>
                <button className="sidebar-icon" title="Knowledge Base" onClick={() => navigate('/knowledge')}>
                    <img src="/new-icons/4.png" alt="Upload" />
                </button>
                <button className="sidebar-icon" title="AI Generator" onClick={() => navigate('/generator')}>
                    <img src="/new-icons/7.png" alt="AI Generator" />
                </button>
                <button className="sidebar-icon" title="AI Agent Ideator" onClick={() => navigate('/agent-ideas')}>
                    <img src="/new-icons/3.png" alt="Agent Ideator" />
                </button>
                <button className="sidebar-icon" title="Score My Deal" onClick={() => navigate('/score-my-deal')}>
                    <img src="/new-icons/5.png" alt="Score My Deal" />
                </button>
                <button className="sidebar-icon" title="CRM" onClick={() => navigate('/crm')}>
                    <img src="/new-icons/6.png" alt="CRM" />
                </button>
            </Flex>
        </Flex>
    );
}; 