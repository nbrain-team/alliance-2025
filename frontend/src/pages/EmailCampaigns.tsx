import React, { useState, useEffect } from 'react';
import { Container, Card, Box, Heading, Button, TextField, TextArea, Select, Flex, Badge, Table, Checkbox, Dialog, Text, Tabs, ScrollArea } from '@radix-ui/themes';
import { PlusIcon, MagicWandIcon, PaperPlaneIcon, ClockIcon, PersonIcon, EnvelopeClosedIcon } from '@radix-ui/react-icons';
import axios from 'axios';
import { format } from 'date-fns';

interface Contact {
  id: string;
  name: string;
  email: string;
  selected?: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
  recipients_count: number;
  sent_at?: string;
  scheduled_for?: string;
  created_at: string;
}

const EmailCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('compose');
  
  // Campaign creation state
  const [campaignName, setCampaignName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  // Filters
  const [contactSearch, setContactSearch] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchContacts();
    fetchTemplates();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      const response = await axios.get(`${apiBaseUrl}/api/crm/campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      const response = await axios.get(`${apiBaseUrl}/api/crm/contacts?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(response.data.map((c: Contact) => ({ ...c, selected: false })));
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      const response = await axios.get(`${apiBaseUrl}/api/crm/email-templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const generateEmailWithAI = async () => {
    if (!aiPrompt) return;
    
    setIsGenerating(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${apiBaseUrl}/api/crm/generate-email`,
        { prompt: aiPrompt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEmailSubject(response.data.subject);
      setEmailContent(response.data.content);
      setAiPrompt('');
    } catch (error) {
      console.error('Error generating email:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
    setSelectAll(!selectAll);
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.email.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const saveCampaign = async (status: 'draft' | 'sent' = 'draft') => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      
      const campaignData = {
        name: campaignName,
        subject: emailSubject,
        content: emailContent,
        recipient_ids: selectedContacts,
        status
      };

      await axios.post(
        `${apiBaseUrl}/api/crm/campaigns`,
        campaignData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowNewCampaignDialog(false);
      resetCampaignForm();
      fetchCampaigns();
    } catch (error) {
      console.error('Error saving campaign:', error);
    }
  };

  const sendCampaign = async () => {
    if (!campaignName || !emailSubject || !emailContent || selectedContacts.length === 0) {
      alert('Please fill in all fields and select at least one recipient');
      return;
    }

    if (window.confirm(`Send this campaign to ${selectedContacts.length} recipients?`)) {
      await saveCampaign('sent');
    }
  };

  const resetCampaignForm = () => {
    setCampaignName('');
    setEmailSubject('');
    setEmailContent('');
    setSelectedContacts([]);
    setAiPrompt('');
    setSelectedTemplate('');
    setActiveTab('compose');
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setEmailSubject(template.subject);
      setEmailContent(template.content);
      setSelectedTemplate(templateId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'green';
      case 'scheduled': return 'blue';
      case 'draft': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <Container size="4" style={{ padding: '2rem' }}>
      <Flex justify="between" align="center" mb="4">
        <Box>
          <Heading size="7">Email Campaigns</Heading>
          <Text size="2" color="gray">Create and manage email campaigns with AI assistance</Text>
        </Box>
        <Button size="3" onClick={() => setShowNewCampaignDialog(true)}>
          <PlusIcon />
          New Campaign
        </Button>
      </Flex>

      <Card>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Campaign Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Subject</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Recipients</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {campaigns.map(campaign => (
              <Table.Row key={campaign.id}>
                <Table.Cell>
                  <Text weight="medium">{campaign.name}</Text>
                </Table.Cell>
                <Table.Cell>{campaign.subject}</Table.Cell>
                <Table.Cell>
                  <Badge color={getStatusColor(campaign.status)}>
                    {campaign.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant="soft">
                    <PersonIcon />
                    {campaign.recipients_count}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {campaign.sent_at 
                    ? format(new Date(campaign.sent_at), 'MMM d, yyyy')
                    : format(new Date(campaign.created_at), 'MMM d, yyyy')
                  }
                </Table.Cell>
                <Table.Cell>
                  <Button size="1" variant="soft">View</Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card>

      {/* New Campaign Dialog */}
      <Dialog.Root open={showNewCampaignDialog} onOpenChange={setShowNewCampaignDialog}>
        <Dialog.Content style={{ maxWidth: 900, maxHeight: '90vh', overflow: 'hidden' }}>
          <Dialog.Title>Create New Campaign</Dialog.Title>
          
          <Box mb="3">
            <Text size="2" mb="1">Campaign Name</Text>
            <TextField.Root
              placeholder="e.g., Summer Property Newsletter"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </Box>

          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Trigger value="compose">Compose Email</Tabs.Trigger>
              <Tabs.Trigger value="recipients">Select Recipients ({selectedContacts.length})</Tabs.Trigger>
              <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
            </Tabs.List>

            <Box style={{ height: '400px', overflow: 'hidden' }}>
              <Tabs.Content value="compose" style={{ height: '100%' }}>
                <Flex direction="column" gap="3" style={{ height: '100%' }}>
                  {/* AI Assistant */}
                  <Card>
                    <Flex gap="2">
                      <TextField.Root
                        placeholder="Describe the email you want to create..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <Button 
                        onClick={generateEmailWithAI} 
                        disabled={isGenerating || !aiPrompt}
                      >
                        <MagicWandIcon />
                        {isGenerating ? 'Generating...' : 'Generate with AI'}
                      </Button>
                    </Flex>
                  </Card>

                  {/* Template Selection */}
                  <Box>
                    <Text size="2" mb="1">Use Template</Text>
                    <Select.Root value={selectedTemplate} onValueChange={loadTemplate}>
                      <Select.Trigger placeholder="Choose a template..." />
                      <Select.Content>
                        <Select.Item value="">None</Select.Item>
                        <Select.Separator />
                        {templates.map(template => (
                          <Select.Item key={template.id} value={template.id}>
                            {template.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Box>

                  {/* Email Composition */}
                  <Box>
                    <Text size="2" mb="1">Subject Line</Text>
                    <TextField.Root
                      placeholder="Enter email subject..."
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </Box>

                  <Box style={{ flex: 1 }}>
                    <Text size="2" mb="1">Email Content</Text>
                    <TextArea
                      placeholder="Write your email content here..."
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                      style={{ minHeight: '200px', height: '100%' }}
                    />
                  </Box>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="recipients" style={{ height: '100%' }}>
                <Flex direction="column" gap="3" style={{ height: '100%' }}>
                  <Flex gap="3" align="center">
                    <TextField.Root
                      placeholder="Search contacts..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={toggleSelectAll}
                    />
                    <Text size="2">Select All ({filteredContacts.length})</Text>
                  </Flex>

                  <ScrollArea style={{ flex: 1 }}>
                    <Table.Root>
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeaderCell width="40px"></Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {filteredContacts.map(contact => (
                          <Table.Row key={contact.id}>
                            <Table.Cell>
                              <Checkbox
                                checked={selectedContacts.includes(contact.id)}
                                onCheckedChange={() => toggleContactSelection(contact.id)}
                              />
                            </Table.Cell>
                            <Table.Cell>{contact.name}</Table.Cell>
                            <Table.Cell>{contact.email}</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </ScrollArea>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="preview" style={{ height: '100%' }}>
                <ScrollArea style={{ height: '100%' }}>
                  <Card>
                    <Flex direction="column" gap="3">
                      <Box>
                        <Text size="1" color="gray">SUBJECT</Text>
                        <Text size="4" weight="bold">{emailSubject || 'No subject'}</Text>
                      </Box>
                      <Box>
                        <Text size="1" color="gray">TO</Text>
                        <Text size="2">{selectedContacts.length} recipients selected</Text>
                      </Box>
                      <Box>
                        <Text size="1" color="gray">CONTENT</Text>
                        <Box style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>
                          {emailContent || 'No content'}
                        </Box>
                      </Box>
                    </Flex>
                  </Card>
                </ScrollArea>
              </Tabs.Content>
            </Box>
          </Tabs.Root>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft">Cancel</Button>
            </Dialog.Close>
            <Button variant="soft" onClick={() => saveCampaign('draft')}>
              Save as Draft
            </Button>
            <Button onClick={sendCampaign}>
              <PaperPlaneIcon />
              Send Campaign
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Container>
  );
};

export default EmailCampaigns; 