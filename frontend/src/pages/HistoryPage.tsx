import { Box, Flex, Text, Card, Heading, Spinner } from '@radix-ui/themes';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useNavigate } from 'react-router-dom';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

const HistoryPage = () => {
    const navigate = useNavigate();
    const { data: conversations, isLoading, error } = useQuery<Conversation[]>({
        queryKey: ['chatHistory'],
        queryFn: () => api.get('/history').then(res => res.data),
    });

    const handleConversationClick = (id: string) => {
        // This will be used to navigate to the detailed view of a chat.
        // For now, we'll just log it.
        console.log(`Navigate to chat with ID: ${id}`);
        // In the future, this will be something like: navigate(`/history/${id}`);
    };

    return (
        <Flex direction="column" style={{ height: '100vh', backgroundColor: 'var(--gray-1)' }}>
            <Box style={{
                padding: '1rem',
                borderBottom: '1px solid var(--gray-4)',
                backgroundColor: 'white',
                position: 'sticky',
                top: 0,
                zIndex: 1
            }}>
                <Heading size="6" style={{ color: 'var(--gray-12)' }}>Chat History</Heading>
            </Box>

            <Box style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
                {isLoading && (
                    <Flex justify="center" align="center" style={{ height: '100%' }}>
                        <Spinner size="3" />
                    </Flex>
                )}
                {error && <Text color="red">Failed to load chat history. Please try again later.</Text>}
                {conversations && (
                    <Flex direction="column" gap="3">
                        {conversations.length === 0 ? (
                            <Text>No saved conversations found.</Text>
                        ) : (
                            conversations.map(convo => (
                                <Card 
                                    key={convo.id} 
                                    onClick={() => handleConversationClick(convo.id)}
                                    style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                                    className="history-card"
                                >
                                    <Flex direction="column" gap="1">
                                        <Text weight="bold">{convo.title}</Text>
                                        <Text size="1" color="gray">
                                            {new Date(convo.created_at).toLocaleString()}
                                        </Text>
                                    </Flex>
                                </Card>
                            ))
                        )}
                    </Flex>
                )}
            </Box>
            <style>{`
                .history-card:hover {
                    box-shadow: var(--shadow-3);
                }
            `}</style>
        </Flex>
    );
};

export default HistoryPage; 