import { Flex } from '@radix-ui/themes';
import { useNavigate } from 'react-router-dom';

export const Sidebar = ({ onNewChat }: { onNewChat: () => void }) => {
    const navigate = useNavigate();
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
            
            <button className="sidebar-icon" title="New Chat" onClick={onNewChat}>
                <img src="/new-icons/13.png" alt="New Chat" />
                <span>New Chat</span>
            </button>
            <button className="sidebar-icon" title="Knowledge Base" onClick={() => navigate('/knowledge-base')}>
                <img src="/new-icons/2.png" alt="Upload" />
                <span>Upload</span>
            </button>
        </Flex>
    );
}; 