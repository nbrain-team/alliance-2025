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
            <img src="/new-icons/1.png" alt="ADTV Logo" style={{ width: '60px', height: '60px', marginBottom: '1rem' }} />
            
            <Flex direction="column" align="center" gap="8" style={{ marginTop: '125px' }}>
                <button className="sidebar-icon" title="New Chat" onClick={handleNewChatClick}>
                    <img src="/new-icons/13.png" alt="New Chat" />
                </button>
                <button className="sidebar-icon" title="Chat History" onClick={() => navigate('/history')}>
                    <img src="/new-icons/2.png" alt="History" />
                </button>
                <button className="sidebar-icon" title="Knowledge Base" onClick={() => navigate('/knowledge-base')}>
                    <img src="/new-icons/4.png" alt="Upload" />
                </button>
                <button className="sidebar-icon" title="AI Generator" onClick={() => navigate('/generator')}>
                    <img src="/new-icons/7.png" alt="AI Generator" />
                </button>
                <button className="sidebar-icon" title="Icon 3">
                    <img src="/new-icons/3.png" alt="Icon 3" />
                </button>
            </Flex>
        </Flex>
    );
}; 