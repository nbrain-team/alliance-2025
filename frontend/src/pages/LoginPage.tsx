import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Flex, Heading, Text, TextField, Box } from '@radix-ui/themes';
import api from '../api';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            // The backend expects form data for the login endpoint
            const params = new URLSearchParams();
            params.append('username', email);
            params.append('password', password);

            const response = await api.post('/login', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            if (response.data.access_token) {
                login(response.data.access_token);
                navigate('/'); // Changed from '/home' to go directly to chat
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to login. Please check your credentials.');
        }
    };

    return (
        <Flex direction="column" align="center" justify="center" gap="4" style={{ minHeight: '100vh', padding: '2rem' }}>
            <Box mb="5" style={{ textAlign: 'center' }}>
                <img src="/new-icons/adtv-logo.png" alt="Alliance Logo" style={{ maxWidth: '250px' }} />
            </Box>
            <Card style={{ width: '100%', maxWidth: '400px' }}>
                <Box p="4">
                    <Heading align="center" mb="5">Login</Heading>
                    <form onSubmit={handleSubmit}>
                        <Flex direction="column" gap="4">
                            <TextField.Root
                                placeholder="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <TextField.Root
                                placeholder="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            {error && <Text color="red" size="2">{error}</Text>}
                            <Button type="submit">Log In</Button>
                        </Flex>
                    </form>
                    <Flex mt="4" justify="center">
                        <Text size="2">
                            Don't have an account? <Link to="/signup">Sign up</Link>
                        </Text>
                    </Flex>
                </Box>
            </Card>
        </Flex>
    );
};

export default LoginPage; 