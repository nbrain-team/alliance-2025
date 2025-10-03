import React, { useState } from 'react';
import { Container, Card, Box, Heading, Text, Button, Flex, Badge, Progress, Tabs, Table, IconButton, Dialog, TextField, Select, Separator, Checkbox } from '@radix-ui/themes';
import { CheckCircledIcon, CrossCircledIcon, ClockIcon, PersonIcon, FileTextIcon, ChevronRightIcon, DownloadIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

// Mock data types
interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  status: 'pre-hire' | 'pre-onboarding' | 'onboarding' | 'day-1' | 'hired' | 'post-hire';
  startDate?: string;
  manager: string;
  department: string;
  progress: number;
  documents: Document[];
  tasks: Task[];
  timeline: TimelineEvent[];
}

interface Document {
  id: string;
  name: string;
  type: 'offer-letter' | 'background-check' | 'i9' | 'w4' | 'handbook' | 'nda';
  status: 'pending' | 'uploaded' | 'signed' | 'completed';
  uploadDate?: string;
  signedDate?: string;
  adobeSignId?: string;
}

interface Task {
  id: string;
  name: string;
  category: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  assignedTo: string;
  dueDate: string;
  completedDate?: string;
  automated: boolean;
}

interface TimelineEvent {
  id: string;
  date: string;
  event: string;
  type: 'success' | 'warning' | 'info' | 'error';
  automated: boolean;
}

// Mock data
const mockCandidates: Candidate[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    phone: '(555) 123-4567',
    position: 'Senior Software Engineer',
    status: 'onboarding',
    startDate: '2024-12-02',
    manager: 'Michael Chen',
    department: 'Engineering',
    progress: 65,
    documents: [
      { id: 'd1', name: 'Offer Letter', type: 'offer-letter', status: 'signed', signedDate: '2024-11-15' },
      { id: 'd2', name: 'Background Check Authorization', type: 'background-check', status: 'completed', signedDate: '2024-11-16' },
      { id: 'd3', name: 'I-9 Form', type: 'i9', status: 'uploaded', uploadDate: '2024-11-18' },
      { id: 'd4', name: 'W-4 Form', type: 'w4', status: 'pending' },
      { id: 'd5', name: 'Employee Handbook', type: 'handbook', status: 'pending' },
    ],
    tasks: [
      { id: 't1', name: 'Send Offer Letter', category: 'Pre-Hire', status: 'completed', assignedTo: 'HR Bot', dueDate: '2024-11-14', completedDate: '2024-11-14', automated: true },
      { id: 't2', name: 'Schedule Interview', category: 'Pre-Hire', status: 'completed', assignedTo: 'HR Bot', dueDate: '2024-11-10', completedDate: '2024-11-10', automated: true },
      { id: 't3', name: 'Create OneDrive Folder', category: 'Onboarding', status: 'in-progress', assignedTo: 'IT Bot', dueDate: '2024-11-30', automated: true },
      { id: 't4', name: 'Setup Workstation', category: 'Day 1', status: 'pending', assignedTo: 'IT Team', dueDate: '2024-12-02', automated: false },
      { id: 't5', name: 'Badge Access Request', category: 'Day 1', status: 'pending', assignedTo: 'Security Bot', dueDate: '2024-12-02', automated: true },
    ],
    timeline: [
      { id: 'e1', date: '2024-11-08', event: 'Application received and screened by AI', type: 'info', automated: true },
      { id: 'e2', date: '2024-11-10', event: 'Interview scheduled via Outlook integration', type: 'success', automated: true },
      { id: 'e3', date: '2024-11-14', event: 'Offer letter sent via Adobe EchoSign', type: 'success', automated: true },
      { id: 'e4', date: '2024-11-15', event: 'Offer accepted and signed', type: 'success', automated: false },
      { id: 'e5', date: '2024-11-18', event: 'Missing W-4 form - HR notified', type: 'warning', automated: true },
    ]
  },
  {
    id: '2',
    name: 'James Wilson',
    email: 'james.wilson@example.com',
    phone: '(555) 987-6543',
    position: 'Marketing Manager',
    status: 'pre-onboarding',
    startDate: '2024-12-09',
    manager: 'Emily Davis',
    department: 'Marketing',
    progress: 40,
    documents: [
      { id: 'd6', name: 'Offer Letter', type: 'offer-letter', status: 'signed', signedDate: '2024-11-20' },
      { id: 'd7', name: 'Background Check Authorization', type: 'background-check', status: 'uploaded', uploadDate: '2024-11-21' },
      { id: 'd8', name: 'I-9 Form', type: 'i9', status: 'pending' },
      { id: 'd9', name: 'W-4 Form', type: 'w4', status: 'pending' },
    ],
    tasks: [
      { id: 't6', name: 'Send Offer Letter', category: 'Pre-Hire', status: 'completed', assignedTo: 'HR Bot', dueDate: '2024-11-19', completedDate: '2024-11-19', automated: true },
      { id: 't7', name: 'Background Check', category: 'Pre-Onboarding', status: 'in-progress', assignedTo: 'HR Bot', dueDate: '2024-11-25', automated: true },
      { id: 't8', name: 'Collect Tax Forms', category: 'Pre-Onboarding', status: 'pending', assignedTo: 'HR Bot', dueDate: '2024-11-28', automated: true },
    ],
    timeline: [
      { id: 'e6', date: '2024-11-18', event: 'Application received and screened by AI', type: 'info', automated: true },
      { id: 'e7', date: '2024-11-19', event: 'Offer letter sent via Adobe EchoSign', type: 'success', automated: true },
      { id: 'e8', date: '2024-11-20', event: 'Offer accepted and signed', type: 'success', automated: false },
    ]
  },
  {
    id: '3',
    name: 'Maria Garcia',
    email: 'maria.garcia@example.com',
    phone: '(555) 456-7890',
    position: 'Financial Analyst',
    status: 'post-hire',
    startDate: '2024-09-02',
    manager: 'Robert Taylor',
    department: 'Finance',
    progress: 100,
    documents: [
      { id: 'd10', name: 'Offer Letter', type: 'offer-letter', status: 'completed', signedDate: '2024-08-15' },
      { id: 'd11', name: 'Background Check Authorization', type: 'background-check', status: 'completed', signedDate: '2024-08-16' },
      { id: 'd12', name: 'I-9 Form', type: 'i9', status: 'completed', signedDate: '2024-08-20' },
      { id: 'd13', name: 'W-4 Form', type: 'w4', status: 'completed', signedDate: '2024-08-20' },
      { id: 'd14', name: 'Employee Handbook', type: 'handbook', status: 'completed', signedDate: '2024-09-02' },
    ],
    tasks: [
      { id: 't9', name: '30-Day Check-in', category: 'Post-Hire', status: 'completed', assignedTo: 'HR Bot', dueDate: '2024-10-02', completedDate: '2024-10-02', automated: true },
      { id: 't10', name: '60-Day Review', category: 'Post-Hire', status: 'completed', assignedTo: 'Manager', dueDate: '2024-11-02', completedDate: '2024-11-02', automated: false },
      { id: 't11', name: '90-Day Performance Review', category: 'Post-Hire', status: 'completed', assignedTo: 'HR Bot', dueDate: '2024-12-02', completedDate: '2024-11-28', automated: true },
    ],
    timeline: [
      { id: 'e9', date: '2024-10-02', event: '30-day check-in completed - positive feedback', type: 'success', automated: true },
      { id: 'e10', date: '2024-11-02', event: '60-day review completed', type: 'success', automated: false },
      { id: 'e11', date: '2024-11-28', event: '90-day performance review completed - meets expectations', type: 'success', automated: true },
    ]
  }
];

const HROnboarding: React.FC = () => {
  const [candidates] = useState<Candidate[]>(mockCandidates);
  const navigate = useNavigate();
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showNewCandidateDialog, setShowNewCandidateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pre-hire': return 'blue';
      case 'pre-onboarding': return 'cyan';
      case 'onboarding': return 'purple';
      case 'day-1': return 'orange';
      case 'hired': return 'green';
      case 'post-hire': return 'teal';
      default: return 'gray';
    }
  };

  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'signed':
        return <CheckCircledIcon color="green" />;
      case 'uploaded':
        return <ClockIcon color="orange" />;
      case 'pending':
        return <CrossCircledIcon color="gray" />;
      default:
        return null;
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in-progress': return 'yellow';
      case 'pending': return 'gray';
      case 'blocked': return 'red';
      default: return 'gray';
    }
  };

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircledIcon color="green" />;
      case 'warning': return <ExclamationTriangleIcon color="orange" />;
      case 'error': return <CrossCircledIcon color="red" />;
      default: return <ClockIcon color="blue" />;
    }
  };

  const filteredCandidates = candidates.filter(candidate =>
    candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container size="4" style={{ padding: '2rem' }}>
      {/* Header */}
      <Flex justify="between" align="center" mb="4">
        <Flex align="center" gap="3">
          <img 
            src="/new-icons/7.png" 
            alt="HR Onboarding" 
            style={{ width: '48px', height: '48px' }}
          />
          <Box>
            <Heading size="7">HR Onboarding Automation</Heading>
            <Text size="2" color="gray">AI-powered employee onboarding from pre-hire to 90 days</Text>
          </Box>
        </Flex>
        <Flex gap="3">
          <Button size="3" variant="soft" onClick={() => navigate('/hr-onboarding/org')}>
            View Org
          </Button>
          <Button size="3" onClick={() => setShowNewCandidateDialog(true)}>
            <PersonIcon />
            New Candidate
          </Button>
        </Flex>
      </Flex>

      {/* Stats Overview */}
      <Flex gap="3" mb="4">
        <Card style={{ flex: 1 }}>
          <Box p="3">
            <Text size="2" color="gray">Active Onboardings</Text>
            <Heading size="6">{candidates.filter(c => c.status !== 'post-hire').length}</Heading>
            <Text size="1" color="green">↑ 12% from last month</Text>
          </Box>
        </Card>
        <Card style={{ flex: 1 }}>
          <Box p="3">
            <Text size="2" color="gray">Automation Rate</Text>
            <Heading size="6">87%</Heading>
            <Text size="1" color="green">↑ 5% improvement</Text>
          </Box>
        </Card>
        <Card style={{ flex: 1 }}>
          <Box p="3">
            <Text size="2" color="gray">Avg. Time to Hire</Text>
            <Heading size="6">14 days</Heading>
            <Text size="1" color="green">↓ 3 days faster</Text>
          </Box>
        </Card>
        <Card style={{ flex: 1 }}>
          <Box p="3">
            <Text size="2" color="gray">Compliance Rate</Text>
            <Heading size="6">100%</Heading>
            <Text size="1" color="gray">All documents verified</Text>
          </Box>
        </Card>
      </Flex>

      {/* Main Content */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="overview">Pipeline Overview</Tabs.Trigger>
          <Tabs.Trigger value="candidates">Candidates</Tabs.Trigger>
          <Tabs.Trigger value="automation">Automation Status</Tabs.Trigger>
          <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
        </Tabs.List>

        {/* Pipeline Overview Tab */}
        <Tabs.Content value="overview">
          <Card mt="3">
            <Box p="4">
              <Heading size="5" mb="4">Onboarding Pipeline</Heading>
              
              {/* Pipeline Stages */}
              <Flex gap="2" mb="4" style={{ overflowX: 'auto' }}>
                {['Pre-Hire', 'Pre-Onboarding', 'Onboarding', 'Day 1', 'Hired', '90 Days Post-Hire'].map((stage) => (
                  <Card key={stage} style={{ minWidth: '180px', flex: 1 }}>
                    <Box p="3">
                      <Flex justify="between" align="center" mb="2">
                        <Text size="2" weight="bold">{stage}</Text>
                        <Badge color={getStatusColor(stage.toLowerCase().replace(' ', '-').replace(' ', '-'))}>
                          {candidates.filter(c => {
                            const statusMap: { [key: string]: string } = {
                              'Pre-Hire': 'pre-hire',
                              'Pre-Onboarding': 'pre-onboarding',
                              'Onboarding': 'onboarding',
                              'Day 1': 'day-1',
                              'Hired': 'hired',
                              '90 Days Post-Hire': 'post-hire'
                            };
                            return c.status === statusMap[stage];
                          }).length}
                        </Badge>
                      </Flex>
                      
                      <Box style={{ minHeight: '100px' }}>
                        {candidates.filter(c => {
                          const statusMap: { [key: string]: string } = {
                            'Pre-Hire': 'pre-hire',
                            'Pre-Onboarding': 'pre-onboarding',
                            'Onboarding': 'onboarding',
                            'Day 1': 'day-1',
                            'Hired': 'hired',
                            '90 Days Post-Hire': 'post-hire'
                          };
                          return c.status === statusMap[stage];
                        }).map(candidate => (
                          <Card 
                            key={candidate.id} 
                            mb="2" 
                            style={{ cursor: 'pointer', backgroundColor: 'var(--gray-2)' }}
                            onClick={() => setSelectedCandidate(candidate)}
                          >
                            <Box p="2">
                              <Text size="2" weight="medium">{candidate.name}</Text>
                              <Text size="1" color="gray">{candidate.position}</Text>
                              <Progress value={candidate.progress} size="1" mt="1" />
                            </Box>
                          </Card>
                        ))}
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Flex>

              {/* Process Flow Diagram */}
              <Box mt="4">
                <Heading size="4" mb="3">Automated Workflow</Heading>
                <Card style={{ backgroundColor: 'var(--gray-2)' }}>
                  <Box p="4">
                    <Flex direction="column" gap="3">
                      {[
                        { phase: 'Pre-Hire', tasks: 'Resume screening • Interview scheduling • Offer generation', icon: '🎯' },
                        { phase: 'Pre-Onboarding', tasks: 'Document collection • E-signature routing • Background checks', icon: '📋' },
                        { phase: 'Onboarding', tasks: 'Account provisioning • OneDrive setup • Training assignment', icon: '🚀' },
                        { phase: 'Day 1', tasks: 'IT setup • Badge access • Orientation scheduling', icon: '💼' },
                        { phase: 'Post-Hire', tasks: '30/60/90 day reviews • Feedback collection • Performance tracking', icon: '📊' },
                      ].map((phase, index) => (
                        <Flex key={phase.phase} align="center" gap="3">
                          <Text size="4">{phase.icon}</Text>
                          <Box style={{ flex: 1 }}>
                            <Text weight="bold">{phase.phase}</Text>
                            <Text size="2" color="gray">{phase.tasks}</Text>
                          </Box>
                          {index < 4 && <ChevronRightIcon />}
                        </Flex>
                      ))}
                    </Flex>
                  </Box>
                </Card>
              </Box>
            </Box>
          </Card>
        </Tabs.Content>

        {/* Candidates Tab */}
        <Tabs.Content value="candidates">
          <Card mt="3">
            <Box p="4">
              <Flex justify="between" align="center" mb="4">
                <Heading size="5">All Candidates</Heading>
                <TextField.Root 
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '300px' }}
                />
              </Flex>

              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Position</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Progress</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Start Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Manager</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredCandidates.map(candidate => (
                    <Table.Row key={candidate.id}>
                      <Table.Cell>
                        <Flex align="center" gap="2">
                          <PersonIcon />
                          <Box>
                            <Text weight="medium">{candidate.name}</Text>
                            <Text size="1" color="gray">{candidate.email}</Text>
                          </Box>
                        </Flex>
                      </Table.Cell>
                      <Table.Cell>{candidate.position}</Table.Cell>
                      <Table.Cell>
                        <Badge color={getStatusColor(candidate.status)}>
                          {candidate.status.replace('-', ' ').toUpperCase()}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Flex align="center" gap="2">
                          <Progress value={candidate.progress} style={{ width: '100px' }} />
                          <Text size="2">{candidate.progress}%</Text>
                        </Flex>
                      </Table.Cell>
                      <Table.Cell>
                        {candidate.startDate ? format(new Date(candidate.startDate), 'MMM dd, yyyy') : 'TBD'}
                      </Table.Cell>
                      <Table.Cell>{candidate.manager}</Table.Cell>
                      <Table.Cell>
                        <Button size="1" variant="soft" onClick={() => setSelectedCandidate(candidate)}>
                          View Details
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          </Card>
        </Tabs.Content>

        {/* Automation Status Tab */}
        <Tabs.Content value="automation">
          <Card mt="3">
            <Box p="4">
              <Heading size="5" mb="4">Automation Status</Heading>
              
              <Flex gap="4">
                {/* Integration Status */}
                <Box style={{ flex: 1 }}>
                  <Heading size="4" mb="3">System Integrations</Heading>
                  <Flex direction="column" gap="3">
                    {[
                      { name: 'Microsoft 365', status: 'connected', lastSync: '2 minutes ago' },
                      { name: 'Adobe EchoSign', status: 'connected', lastSync: '5 minutes ago' },
                      { name: 'Outlook Calendar', status: 'connected', lastSync: '1 minute ago' },
                      { name: 'OneDrive', status: 'connected', lastSync: '10 minutes ago' },
                      { name: 'Background Check API', status: 'connected', lastSync: '1 hour ago' },
                    ].map(integration => (
                      <Card key={integration.name}>
                        <Box p="3">
                          <Flex justify="between" align="center">
                            <Box>
                              <Text weight="medium">{integration.name}</Text>
                              <Text size="1" color="gray">Last sync: {integration.lastSync}</Text>
                            </Box>
                            <Badge color={integration.status === 'connected' ? 'green' : 'red'}>
                              {integration.status}
                            </Badge>
                          </Flex>
                        </Box>
                      </Card>
                    ))}
                  </Flex>
                </Box>

                {/* Recent Automated Actions */}
                <Box style={{ flex: 1 }}>
                  <Heading size="4" mb="3">Recent Automated Actions</Heading>
                  <Card>
                    <Box p="3">
                      <Flex direction="column" gap="2">
                        {[
                          { time: '10:30 AM', action: 'Sent offer letter to John Doe', type: 'success' },
                          { time: '10:15 AM', action: 'Scheduled interview for Jane Smith', type: 'info' },
                          { time: '9:45 AM', action: 'Created OneDrive folder for Sarah Johnson', type: 'success' },
                          { time: '9:30 AM', action: 'Background check completed for James Wilson', type: 'success' },
                          { time: '9:00 AM', action: 'Reminder sent for missing W-4 form', type: 'warning' },
                          { time: '8:45 AM', action: '90-day review scheduled for Maria Garcia', type: 'info' },
                        ].map((action, index) => (
                          <Flex key={index} align="center" gap="2">
                            {getTimelineIcon(action.type)}
                            <Box style={{ flex: 1 }}>
                              <Text size="2">{action.action}</Text>
                              <Text size="1" color="gray">{action.time}</Text>
                            </Box>
                          </Flex>
                        ))}
                      </Flex>
                    </Box>
                  </Card>
                </Box>
              </Flex>
            </Box>
          </Card>
        </Tabs.Content>

        {/* Analytics Tab */}
        <Tabs.Content value="analytics">
          <Card mt="3">
            <Box p="4">
              <Heading size="5" mb="4">Performance Analytics</Heading>
              
              <Flex gap="4" wrap="wrap">
                <Card style={{ flex: '1 1 300px' }}>
                  <Box p="3">
                    <Heading size="4" mb="3">Time to Hire Metrics</Heading>
                    <Flex direction="column" gap="2">
                      <Flex justify="between">
                        <Text size="2">Average Time to Hire</Text>
                        <Text size="2" weight="bold">14 days</Text>
                      </Flex>
                      <Flex justify="between">
                        <Text size="2">Fastest Hire</Text>
                        <Text size="2" weight="bold">7 days</Text>
                      </Flex>
                      <Flex justify="between">
                        <Text size="2">Industry Average</Text>
                        <Text size="2" color="gray">24 days</Text>
                      </Flex>
                      <Separator size="4" />
                      <Text size="1" color="green">41% faster than industry average</Text>
                    </Flex>
                  </Box>
                </Card>

                <Card style={{ flex: '1 1 300px' }}>
                  <Box p="3">
                    <Heading size="4" mb="3">Document Processing</Heading>
                    <Flex direction="column" gap="2">
                      <Flex justify="between">
                        <Text size="2">Documents Processed</Text>
                        <Text size="2" weight="bold">342</Text>
                      </Flex>
                      <Flex justify="between">
                        <Text size="2">E-Signatures Collected</Text>
                        <Text size="2" weight="bold">156</Text>
                      </Flex>
                      <Flex justify="between">
                        <Text size="2">Auto-Verification Rate</Text>
                        <Text size="2" weight="bold">94%</Text>
                      </Flex>
                      <Separator size="4" />
                      <Text size="1" color="green">6% manual intervention rate</Text>
                    </Flex>
                  </Box>
                </Card>

                <Card style={{ flex: '1 1 300px' }}>
                  <Box p="3">
                    <Heading size="4" mb="3">Cost Savings</Heading>
                    <Flex direction="column" gap="2">
                      <Flex justify="between">
                        <Text size="2">Hours Saved/Month</Text>
                        <Text size="2" weight="bold">320 hrs</Text>
                      </Flex>
                      <Flex justify="between">
                        <Text size="2">Cost Reduction</Text>
                        <Text size="2" weight="bold">$48,000</Text>
                      </Flex>
                      <Flex justify="between">
                        <Text size="2">ROI</Text>
                        <Text size="2" weight="bold">425%</Text>
                      </Flex>
                      <Separator size="4" />
                      <Text size="1" color="green">90% reduction in operational costs</Text>
                    </Flex>
                  </Box>
                </Card>
              </Flex>
            </Box>
          </Card>
        </Tabs.Content>
      </Tabs.Root>

      {/* Candidate Detail Dialog */}
      {selectedCandidate && (
        <Dialog.Root open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
          <Dialog.Content style={{ maxWidth: 800 }}>
            <Dialog.Title>
              <Flex align="center" gap="3">
                <PersonIcon />
                {selectedCandidate.name} - {selectedCandidate.position}
              </Flex>
            </Dialog.Title>

            <Tabs.Root defaultValue="details">
              <Tabs.List>
                <Tabs.Trigger value="details">Details</Tabs.Trigger>
                <Tabs.Trigger value="documents">Documents</Tabs.Trigger>
                <Tabs.Trigger value="tasks">Tasks</Tabs.Trigger>
                <Tabs.Trigger value="timeline">Timeline</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="details">
                <Box mt="3">
                  <Flex gap="4">
                    <Box style={{ flex: 1 }}>
                      <Text size="2" color="gray">Email</Text>
                      <Text size="3">{selectedCandidate.email}</Text>
                      
                      <Text size="2" color="gray" mt="3">Phone</Text>
                      <Text size="3">{selectedCandidate.phone}</Text>
                      
                      <Text size="2" color="gray" mt="3">Department</Text>
                      <Text size="3">{selectedCandidate.department}</Text>
                    </Box>
                    
                    <Box style={{ flex: 1 }}>
                      <Text size="2" color="gray">Manager</Text>
                      <Text size="3">{selectedCandidate.manager}</Text>
                      
                      <Text size="2" color="gray" mt="3">Start Date</Text>
                      <Text size="3">
                        {selectedCandidate.startDate ? format(new Date(selectedCandidate.startDate), 'MMMM dd, yyyy') : 'TBD'}
                      </Text>
                      
                      <Text size="2" color="gray" mt="3">Status</Text>
                      <Badge color={getStatusColor(selectedCandidate.status)} mt="1">
                        {selectedCandidate.status.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </Box>
                  </Flex>
                  
                  <Box mt="4">
                    <Text size="2" color="gray">Overall Progress</Text>
                    <Flex align="center" gap="2" mt="1">
                      <Progress value={selectedCandidate.progress} style={{ flex: 1 }} />
                      <Text size="3" weight="bold">{selectedCandidate.progress}%</Text>
                    </Flex>
                  </Box>
                </Box>
              </Tabs.Content>

              <Tabs.Content value="documents">
                <Box mt="3">
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>Document</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {selectedCandidate.documents.map(doc => (
                        <Table.Row key={doc.id}>
                          <Table.Cell>
                            <Flex align="center" gap="2">
                              <FileTextIcon />
                              {doc.name}
                            </Flex>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant="soft">{doc.type}</Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Flex align="center" gap="2">
                              {getDocumentStatusIcon(doc.status)}
                              <Text size="2">{doc.status}</Text>
                            </Flex>
                          </Table.Cell>
                          <Table.Cell>
                            {doc.signedDate || doc.uploadDate || '-'}
                          </Table.Cell>
                          <Table.Cell>
                            {doc.status === 'pending' ? (
                              <Button size="1" variant="soft">Send Reminder</Button>
                            ) : (
                              <IconButton size="1" variant="ghost">
                                <DownloadIcon />
                              </IconButton>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              </Tabs.Content>

              <Tabs.Content value="tasks">
                <Box mt="3">
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>Task</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Assigned To</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Due Date</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {selectedCandidate.tasks.map(task => (
                        <Table.Row key={task.id}>
                          <Table.Cell>
                            <Flex align="center" gap="2">
                              {task.automated && <Badge size="1" color="blue">AI</Badge>}
                              {task.name}
                            </Flex>
                          </Table.Cell>
                          <Table.Cell>{task.category}</Table.Cell>
                          <Table.Cell>
                            <Badge color={getTaskStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>{task.assignedTo}</Table.Cell>
                          <Table.Cell>
                            {task.completedDate || task.dueDate}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              </Tabs.Content>

              <Tabs.Content value="timeline">
                <Box mt="3">
                  <Flex direction="column" gap="3">
                    {selectedCandidate.timeline.map(event => (
                      <Flex key={event.id} align="start" gap="3">
                        {getTimelineIcon(event.type)}
                        <Box style={{ flex: 1 }}>
                          <Flex justify="between">
                            <Text size="2">
                              {event.event}
                              {event.automated && (
                                <Badge size="1" color="blue" ml="2">Automated</Badge>
                              )}
                            </Text>
                            <Text size="2" color="gray">{event.date}</Text>
                          </Flex>
                        </Box>
                      </Flex>
                    ))}
                  </Flex>
                </Box>
              </Tabs.Content>
            </Tabs.Root>

            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft">Close</Button>
              </Dialog.Close>
              <Button>Process Next Step</Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      )}

      {/* New Candidate Dialog */}
      <Dialog.Root open={showNewCandidateDialog} onOpenChange={setShowNewCandidateDialog}>
        <Dialog.Content style={{ maxWidth: 500 }}>
          <Dialog.Title>Add New Candidate</Dialog.Title>
          
          <Flex direction="column" gap="3" mt="3">
            <Box>
              <Text size="2" mb="1">Full Name</Text>
              <TextField.Root placeholder="Enter candidate name" />
            </Box>
            
            <Box>
              <Text size="2" mb="1">Email</Text>
              <TextField.Root placeholder="candidate@example.com" type="email" />
            </Box>
            
            <Box>
              <Text size="2" mb="1">Phone</Text>
              <TextField.Root placeholder="(555) 123-4567" type="tel" />
            </Box>
            
            <Box>
              <Text size="2" mb="1">Position</Text>
              <TextField.Root placeholder="Job title" />
            </Box>
            
            <Box>
              <Text size="2" mb="1">Department</Text>
              <Select.Root defaultValue="engineering">
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="engineering">Engineering</Select.Item>
                  <Select.Item value="marketing">Marketing</Select.Item>
                  <Select.Item value="sales">Sales</Select.Item>
                  <Select.Item value="finance">Finance</Select.Item>
                  <Select.Item value="hr">Human Resources</Select.Item>
                  <Select.Item value="operations">Operations</Select.Item>
                </Select.Content>
              </Select.Root>
            </Box>
            
            <Box>
              <Text size="2" mb="1">Hiring Manager</Text>
              <TextField.Root placeholder="Manager name" />
            </Box>
            
            <Box>
              <Text size="2" mb="1">Proposed Start Date</Text>
              <TextField.Root type="date" />
            </Box>
            
            <Box>
              <Checkbox />
              <Text size="2" ml="2">Automatically start pre-hire workflow</Text>
            </Box>
          </Flex>
          
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft">Cancel</Button>
            </Dialog.Close>
            <Button>Add Candidate</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Container>
  );
};

export default HROnboarding; 