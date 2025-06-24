import { useState, useEffect } from 'react';
import { Box, Flex, Heading, Text, Table } from '@radix-ui/themes';
import { useAuth } from '../context/AuthContext';

interface Feedback {
    id: string;
    conversation_id: string;
    message_text: string;
    rating: 'good' | 'bad';
    notes: string | null;
    created_at: string;
}

const FeedbackLogPage = () => {
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuth();

    useEffect(() => {
        const fetchFeedback = async () => {
            if (!token) {
                setError("Authentication token not found.");
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/feedback`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const data = await response.json();
                setFeedback(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchFeedback();
    }, [token]);

    return (
        <Flex direction="column" style={{ height: '100vh', backgroundColor: 'var(--gray-1)' }}>
            <Box style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--gray-4)', backgroundColor: 'white' }}>
                <Heading size="7" style={{ color: 'var(--gray-12)' }}>Feedback Log</Heading>
                <Text as="p" size="3" style={{ color: 'var(--gray-10)', marginTop: '0.25rem' }}>
                    A log of all user feedback submitted for AI responses.
                </Text>
            </Box>

            <Box style={{ padding: '2rem' }}>
                {isLoading && <Text>Loading feedback...</Text>}
                {error && <Text color="red">{error}</Text>}
                {!isLoading && !error && (
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Rating</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>AI Response</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Notes</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {feedback.map((item) => (
                                <Table.Row key={item.id}>
                                    <Table.RowHeaderCell>{new Date(item.created_at).toLocaleString()}</Table.RowHeaderCell>
                                    <Table.Cell>
                                        <span style={{ textTransform: 'capitalize', color: item.rating === 'good' ? 'var(--green-11)' : 'var(--red-11)' }}>
                                            {item.rating}
                                        </span>
                                    </Table.Cell>
                                    <Table.Cell style={{ maxWidth: '500px', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                                        {item.message_text}
                                    </Table.Cell>
                                    <Table.Cell>{item.notes || 'N/A'}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                )}
            </Box>
        </Flex>
    );
};

export default FeedbackLogPage; 