import { Box, Flex, Text, Heading } from '@radix-ui/themes';
import { GeneratorWorkflow } from '../components/GeneratorWorkflow';

const GeneratorPage = () => {
    return (
        <Flex direction="column" style={{ height: '100%', backgroundColor: 'var(--gray-1)' }}>
            <Box style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--gray-4)', backgroundColor: 'white' }}>
                <Heading size="7" style={{ color: 'var(--gray-12)' }}>AI Content Generator</Heading>
                <Text as="p" size="3" style={{ color: 'var(--gray-10)', marginTop: '0.25rem' }}>
                    Create personalized content at scale by uploading a CSV and providing a core prompt.
                </Text>
            </Box>

            <Box style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
                <GeneratorWorkflow />
            </Box>
        </Flex>
    );
};

export default GeneratorPage; 