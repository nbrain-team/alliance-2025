import { Box, Flex, Text, Heading, Card, Grid } from '@radix-ui/themes';
import { ChatBubbleIcon, ReaderIcon, UploadIcon, ArchiveIcon } from '@radix-ui/react-icons';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate();

    const modules = [
        {
            icon: <ChatBubbleIcon width="32" height="32" />,
            title: "AI Chat",
            description: "Engage in intelligent conversations and get instant answers from your knowledge base.",
            path: "/"
        },
        {
            icon: <ReaderIcon width="32" height="32" />,
            title: "Knowledge Base",
            description: "Manage and consult your internal documents and web content with ease.",
            path: "/knowledge"
        },
        {
            icon: <UploadIcon width="32" height="32" />,
            title: "AI Content Generator",
            description: "Create personalized content at scale by combining data with AI-powered templates.",
            path: "/generator"
        },
        {
            icon: <ArchiveIcon width="32" height="32" />,
            title: "Chat History",
            description: "Review and continue your past conversations with the AI assistant.",
            path: "/history"
        }
    ];

    return (
        <Flex direction="column" align="center" justify="center" style={{ minHeight: '100vh', backgroundColor: 'var(--gray-1)', padding: '2rem' }}>
            <Box style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <img src="/new-icons/adtv-logo.png" alt="ADTV Logo" style={{ maxWidth: '300px', marginBottom: '2rem' }} />
                <Heading size="8" style={{ color: 'var(--gray-12)', marginBottom: '1rem' }}>
                    Unlock Your Data's Potential
                </Heading>
                <Text as="p" size="4" style={{ color: 'var(--gray-11)', maxWidth: '600px' }}>
                    Welcome to the ADTV AI Platform. Seamlessly integrate your knowledge base, generate personalized content, and engage in intelligent conversations to drive your business forward.
                </Text>
            </Box>

            <Grid columns={{ initial: '1', sm: '2', md: '4' }} gap="4" width="100%" maxWidth="1200px">
                {modules.map(module => (
                    <Card 
                        key={module.title} 
                        className="module-card" 
                        onClick={() => navigate(module.path)}
                    >
                        <Flex direction="column" align="center" gap="3" style={{ textAlign: 'center' }}>
                            <Box style={{ color: 'var(--accent-9)' }}>{module.icon}</Box>
                            <Heading size="4">{module.title}</Heading>
                            <Text as="p" size="2" color="gray">{module.description}</Text>
                        </Flex>
                    </Card>
                ))}
            </Grid>

            <Box as="div" role="contentinfo" style={{ marginTop: '4rem', textAlign: 'center' }}>
                <Text as="p" size="2" color="gray">© {new Date().getFullYear()} American Dream TV. All Rights Reserved.</Text>
            </Box>
            <style>{`
                .module-card {
                    cursor: pointer;
                    transition: all 0.2s ease-in-out;
                }
                .module-card:hover {
                    transform: translateY(-5px);
                    box-shadow: var(--shadow-4);
                }
            `}</style>
        </Flex>
    );
};

export default LandingPage; 