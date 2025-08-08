import { Grid, Card, Text, Heading, Flex, Box, Section } from '@radix-ui/themes';
import { Link } from 'react-router-dom';
import { RocketIcon, FileTextIcon, ChatBubbleIcon, ReaderIcon, PersonIcon, EnvelopeClosedIcon, BackpackIcon, BarChartIcon } from '@radix-ui/react-icons';

const LandingPage = () => {
    const modules = [
        {
            icon: <img src="/new-icons/13.png" alt="Chat" style={{ width: '32px', height: '32px' }} />,
            title: "AI Chat",
            description: "Engage in intelligent conversations with your property data and documents.",
            path: "/"
        },
        {
            icon: <img src="/new-icons/2.png" alt="History" style={{ width: '32px', height: '32px' }} />,
            title: "Chat History",
            description: "Review and manage your past conversations and insights.",
            path: "/history"
        },
        {
            icon: <img src="/new-icons/4.png" alt="Knowledge" style={{ width: '32px', height: '32px' }} />,
            title: "Knowledge Base",
            description: "Upload and manage your property documents and data.",
            path: "/knowledge"
        },
        {
            icon: <img src="/new-icons/3.png" alt="Agent" style={{ width: '32px', height: '32px' }} />,
            title: "AI Agent Ideator",
            description: "Design and create custom AI agents for your business workflows.",
            path: "/agent-ideas"
        },
        {
            icon: <img src="/new-icons/5.png" alt="Deal Scorer" style={{ width: '32px', height: '32px' }} />,
            title: "Score My Deal",
            description: "AI-powered real estate deal evaluation and scoring.",
            path: "/score-my-deal"
        },
        {
            icon: <img src="/new-icons/14.webp" alt="CRM" style={{ width: '32px', height: '32px' }} />,
            title: "CRM Pipeline",
            description: "Manage your real estate opportunities and contacts.",
            path: "/crm"
        },
        {
            icon: <img src="/new-icons/16.webp" alt="Email" style={{ width: '32px', height: '32px' }} />,
            title: "Email Campaigns",
            description: "Create and manage AI-powered email marketing campaigns.",
            path: "/email-campaigns"
        },
        {
            icon: <img src="/new-icons/15.png" alt="HR" style={{ width: '32px', height: '32px' }} />,
            title: "HR Onboarding",
            description: "Automate employee onboarding from pre-hire to 90 days.",
            path: "/hr-onboarding"
        },
    ];

    return (
        <Flex direction="column" align="center" justify="center" style={{ minHeight: '100vh', backgroundColor: 'var(--gray-1)', padding: '2rem' }}>
            <Box style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <img src="/new-icons/adtv-logo.png" alt="Alliance Logo" style={{ maxWidth: '300px', marginBottom: '2rem' }} />
                <Heading align="center" size="8" style={{ color: 'var(--gray-12)', marginBottom: '1rem' }}>
                    REI Nexus Command Center
                </Heading>
                <Text as="p" size="4" style={{ color: 'var(--gray-11)', maxWidth: '600px', margin: '0 auto' }}>
                    Welcome to the Alliance AI Platform. Your comprehensive real estate investment hub powered by cutting-edge AI technology.
                </Text>
            </Box>

            <Grid columns={{ initial: '1', sm: '2', md: '3', lg: '4' }} gap="4" width="100%" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {modules.map((module, index) => (
                    <Link to={module.path} key={index} style={{ textDecoration: 'none' }}>
                        <Card className="module-card">
                            <Flex direction="column" align="center" gap="3" style={{ padding: '1.5rem' }}>
                                <div className="icon-circle">{module.icon}</div>
                                <Heading as="h3" size="4" align="center">{module.title}</Heading>
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
                    min-height: 200px;
                }
                .module-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    border-color: var(--accent-9);
                }
                .icon-circle {
                    width: 64px;
                    height: 64px;
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