import React, { useState } from 'react';
import { Container, Flex, Text, Button, TextField, Select, Card, Box, Heading, Spinner } from '@radix-ui/themes';
import axios from 'axios';

const DealScorerPage = () => {
    const [formData, setFormData] = useState({
        property_address: '',
        property_type: 'Multifamily',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        contact_office_address: '',
    });
    const [responseHtml, setResponseHtml] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [submissionSuccess, setSubmissionSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (value: string) => {
        setFormData({ ...formData, property_type: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setResponseHtml('');
        setSubmissionSuccess(false);

        // Simple anti-spam check
        if (formData.contact_phone && !/^[0-9\\s()+ -]*$/.test(formData.contact_phone)) {
             setError('Please enter a valid phone number.');
             setIsLoading(false);
             return;
        }

        try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.post(`${apiBaseUrl}/score-deal`, formData);
            setResponseHtml(res.data.html_response);
            setSubmissionSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (submissionSuccess) {
        return (
            <Container size="3" mt="6">
                <Card>
                    <Box p="4">
                        <Heading align="center" mb="4">Submission Result</Heading>
                        <div dangerouslySetInnerHTML={{ __html: responseHtml }} />
                        <Flex justify="center" mt="4">
                           <Button onClick={() => {
                               setSubmissionSuccess(false);
                               setFormData({
                                property_address: '',
                                property_type: 'Multifamily',
                                contact_name: '',
                                contact_email: '',
                                contact_phone: '',
                                contact_office_address: '',
                               });
                           }}>
                                Submit Another Deal
                           </Button>
                        </Flex>
                    </Box>
                </Card>
            </Container>
        );
    }

    return (
        <Container size="2" mt="6">
            <Card>
                <Box p="5">
                    <Heading align="center" mb="5">Alliance Offer Engine</Heading>
                    <Text as="p" align="center" color="gray" mb="6">
                        Submit a property to receive an instant, data-driven evaluation and a preliminary offer if it meets our criteria.
                    </Text>
                    <form onSubmit={handleSubmit}>
                        <Flex direction="column" gap="4">
                            <label>
                                <Text as="div" size="2" weight="bold" mb="1">
                                    Property Street Address*
                                </Text>
                                <TextField.Root
                                    name="property_address"
                                    value={formData.property_address}
                                    onChange={handleChange}
                                    placeholder="e.g., 123 Main St, Anytown, USA"
                                    required
                                />
                            </label>
                            <label>
                                <Text as="div" size="2" weight="bold" mb="1">
                                    Property Type*
                                </Text>
                                <Select.Root
                                    name="property_type"
                                    value={formData.property_type}
                                    onValueChange={handleSelectChange}
                                >
                                    <Select.Trigger style={{width: '100%'}} />
                                    <Select.Content>
                                        <Select.Item value="Multifamily">Multifamily</Select.Item>
                                        <Select.Item value="Medical Office">Medical Office</Select.Item>
                                        <Select.Item value="Industrial">Industrial</Select.Item>
                                        <Select.Item value="Other">Other</Select.Item>
                                    </Select.Content>
                                </Select.Root>
                            </label>
                            
                            <Heading size="4" mt="3" mb="1">Contact Information</Heading>

                            <label>
                                <Text as="div" size="2" weight="bold" mb="1">
                                    Full Name*
                                </Text>
                                <TextField.Root
                                    name="contact_name"
                                    value={formData.contact_name}
                                    onChange={handleChange}
                                    placeholder="e.g., Jane Doe"
                                    required
                                />
                            </label>
                            <label>
                                <Text as="div" size="2" weight="bold" mb="1">
                                    Email Address*
                                </Text>
                                <TextField.Root
                                    name="contact_email"
                                    type="email"
                                    value={formData.contact_email}
                                    onChange={handleChange}
                                    placeholder="e.g., jane.doe@example.com"
                                    required
                                />
                            </label>
                             <label>
                                <Text as="div" size="2" weight="bold" mb="1">
                                    Phone Number
                                </Text>
                                <TextField.Root
                                    name="contact_phone"
                                    value={formData.contact_phone}
                                    onChange={handleChange}
                                    placeholder="(555) 555-5555"
                                />
                            </label>
                             <label>
                                <Text as="div" size="2" weight="bold" mb="1">
                                    Office Address
                                </Text>
                                <TextField.Root
                                    name="contact_office_address"
                                    value={formData.contact_office_address}
                                    onChange={handleChange}
                                    placeholder="e.g., 456 Brokerage Ave, Suite 100"
                                />
                            </label>

                            {error && <Text color="red" size="2" mt="2">{error}</Text>}

                            <Button size="3" mt="4" disabled={isLoading}>
                                {isLoading ? <Spinner /> : 'Score My Deal'}
                            </Button>
                        </Flex>
                    </form>
                </Box>
            </Card>
        </Container>
    );
};

export default DealScorerPage; 