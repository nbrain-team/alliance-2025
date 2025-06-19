import { Box, Flex, Text } from '@radix-ui/themes';

const HistoryPage = () => {
    return (
        <Flex direction="column" style={{ height: '100vh', backgroundColor: 'var(--gray-1)' }}>
            <Box style={{
                padding: '1rem',
                borderBottom: '1px solid var(--gray-4)',
                backgroundColor: 'white'
            }}>
                <Text size="5" weight="bold" style={{ color: 'var(--gray-12)' }}>Chat History</Text>
            </Box>

            <Box style={{ flex: 1, padding: '1rem' }}>
                <Text>Chat history will be displayed here. The backend is being updated to support this feature.</Text>
            </Box>
        </Flex>
    );
};

export default HistoryPage; 