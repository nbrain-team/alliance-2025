import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Flex, Heading, Text, TextField } from '@radix-ui/themes';
import api from '../api';

const SignupPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const response = await api.post('/signup', { email, password });
            if (response.data.access_token) {
                login(response.data.access_token);
                navigate('/');
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to sign up. Please try again.');
        }
    };

    return (
        <Flex direction="column" align="center" justify="center" gap="5" style={{ height: '100vh', backgroundColor: 'var(--gray-2)' }}>
            <img src="/new-icons/adtv-logo.png" alt="Alliance Logo" style={{ maxWidth: '250px' }} />
            <Card style={{ width: 400, padding: '2rem' }}>
                <Heading align="center" mb="5">Create an Account</Heading>
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
                        <Button type="submit">Sign Up</Button>
                    </Flex>
                </form>
                <Flex mt="4" justify="center">
                    <Text size="2">
                        Already have an account? <Link to="/login">Log in</Link>
                    </Text>
                </Flex>
            </Card>
        </Flex>
    );
};

export default SignupPage; 