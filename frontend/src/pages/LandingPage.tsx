import { Grid, Card, Text, Heading, Flex, Box, Section } from '@radix-ui/themes';
import { Link } from 'react-router-dom';
import { RocketIcon, FileTextIcon, ChatBubbleIcon, ReaderIcon } from '@radix-ui/react-icons';

const LandingPage = () => {
    const modules = [
        {
            icon: <ChatBubbleIcon width="24" height="24" />,
            title: "AI Chat",
            description: "Engage in intelligent conversations with your data.",
            path: "/"
        },
        {
            icon: <FileTextIcon width="24" height="24" />,
            title: "Content Generator",
            description: "Generate personalized content based on your knowledge.",
            path: "/generator"
        },
        {
            icon: <ReaderIcon width="24" height="24" />,
            title: "Knowledge Base",
            description: "Manage and upload your documents.",
            path: "/knowledge"
        },
    ];

    return (
        <Flex direction="column" align="center" justify="center" style={{ minHeight: '100vh', backgroundColor: 'var(--gray-1)', padding: '2rem' }}>
            <Box style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <img src="/new-icons/adtv-logo.png" alt="Alliance Logo" style={{ maxWidth: '300px', marginBottom: '2rem' }} />
                <Heading align="center" size="8" style={{ color: 'var(--gray-12)', marginBottom: '1rem' }}>
                    Unlock Your Data's Potential
                </Heading>
                <Text as="p" size="4" style={{ color: 'var(--gray-11)', maxWidth: '600px', margin: '0 auto' }}>
                    Welcome to the Alliance AI Platform. Seamlessly integrate your knowledge base, generate personalized content, and engage in intelligent conversations to drive your business forward.
                </Text>
            </Box>

            <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="4" width="100%" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                {modules.map((module, index) => (
                    <Link to={module.path} key={index} style={{ textDecoration: 'none' }}>
                        <Card className="module-card">
                            <Flex direction="column" align="center" gap="3">
                                <div className="icon-circle">{module.icon}</div>
                                <Heading as="h3" size="5">{module.title}</Heading>
                                <Text as="p" size="2" align="center" style={{ color: 'var(--gray-11)' }}>{module.description}</Text>
                            </Flex>
                        </Card>
                    </Link>
                ))}
            </Grid>

            <Box as="div" role="contentinfo" style={{ marginTop: '4rem', textAlign: 'center' }}>
                <Text as="p" size="2" color="gray">© {new Date().getFullYear()} Alliance. All Rights Reserved.</Text>
            </Box>
            <style>{`
                .module-card {
                    transition: transform 0.2s, box-shadow 0.2s;
                    background-color: var(--gray-2);
                    border: 1px solid var(--gray-4);
                    height: 100%;
                }
                .module-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    border-color: var(--accent-9);
                }
                .icon-circle {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background-color: var(--accent-3);
                    color: var(--accent-11);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            `}</style>
        </Flex>
    );
};

export default LandingPage; 