import { Flex } from '@radix-ui/themes';
import { useNavigate } from 'react-router-dom';

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
                zIndex: 100,
                overflowY: 'auto',
                overflowX: 'hidden'
            }}
        >
            <button className="sidebar-icon" title="Home" onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: '2rem' }}>
                <img src="/new-icons/1.png" alt="Alliance Logo" style={{ width: '60px', height: '60px' }} />
            </button>
            
            <Flex direction="column" align="center" gap="3" style={{ flex: 1 }}>
                <button className="sidebar-icon" title="New Chat" onClick={handleNewChatClick}>
                    <img src="/new-icons/13.png" alt="New Chat" />
                </button>
                <button className="sidebar-icon" title="Chat History" onClick={() => navigate('/history')}>
                    <img src="/new-icons/2.png" alt="History" />
                </button>
                <button className="sidebar-icon" title="Knowledge Base" onClick={() => navigate('/knowledge')}>
                    <img src="/new-icons/4.png" alt="Upload" />
                </button>
                <button className="sidebar-icon" title="AI Agent Ideator" onClick={() => navigate('/agent-ideas')}>
                    <img src="/new-icons/3.png" alt="Agent Ideator" />
                </button>
                <button className="sidebar-icon" title="Score My Deal" onClick={() => navigate('/score-my-deal')}>
                    <img src="/new-icons/5.png" alt="Score My Deal" />
                </button>
                <button className="sidebar-icon" title="CRM" onClick={() => navigate('/crm')}>
                    <img src="/new-icons/14.webp" alt="CRM" />
                </button>
                <button className="sidebar-icon" title="Email Campaigns" onClick={() => navigate('/email-campaigns')}>
                    <img src="/new-icons/15.png" alt="Email Campaigns" />
                </button>
                <button className="sidebar-icon" title="HR Onboarding" onClick={() => navigate('/hr-onboarding')}>
                    <img src="/new-icons/7.png" alt="HR Onboarding" />
                </button>
                <button className="sidebar-icon" title="Alliance AI Automation" onClick={() => navigate('/adtv-campaigns')}>
                    <img src="/new-icons/8.png" alt="Alliance AI Automation" />
                </button>
                <button className="sidebar-icon" title="AI Automation Inbox" onClick={() => navigate('/adtv-inbox')}>
                    <img src="/new-icons/9.png" alt="AI Automation Inbox" />
                </button>
            </Flex>
        </Flex>
    );
}; 