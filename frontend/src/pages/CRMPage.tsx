import React, { useState, useEffect } from 'react';
import { Container, Card, Box, Heading, Table, Badge, Button, Select, TextField, Flex, IconButton, Dialog, Text, Separator, TextArea } from '@radix-ui/themes';
import { MagnifyingGlassIcon, PlusIcon, TrashIcon, Pencil1Icon, ActivityLogIcon, ChevronDownIcon, ChevronRightIcon, Cross2Icon } from '@radix-ui/react-icons';
import axios from 'axios';
import { format } from 'date-fns';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  office_address?: string;
  created_at: string;
  updated_at?: string;
}

interface Activity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  created_by?: string;
}

interface Opportunity {
  id: string;
  deal_status: string;
  company: string;
  property_address?: string;
  property_type?: string;
  lead_source: string;
  lead_date: string;
  last_activity: string;
  notes?: string;
  deal_value?: number;
  contact: Contact;
  assigned_to?: string;
  created_at: string;
  updated_at?: string;
  activities: Activity[];
}

const CRMPage: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [dealStatuses, setDealStatuses] = useState<string[]>([]);
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('All Deal Statuses');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [activityType, setActivityType] = useState('note');
  const [activityDescription, setActivityDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Add state for editing
  const [editedOpportunity, setEditedOpportunity] = useState<Partial<Opportunity>>({});
  const [isEditing, setIsEditing] = useState(false);
  
  // Add state for expanded rows and tags
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [opportunityTags, setOpportunityTags] = useState<Record<string, string[]>>({});
  const [newTag, setNewTag] = useState<string>('');
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);

  useEffect(() => {
    fetchOpportunities();
    fetchDealStatuses();
    fetchLeadSources();
  }, []);

  useEffect(() => {
    filterOpportunities();
  }, [opportunities, selectedStatus, searchTerm]);

  const fetchOpportunities = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      const response = await axios.get(`${apiBaseUrl}/api/crm/opportunities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOpportunities(response.data);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  };

  const fetchDealStatuses = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await axios.get(`${apiBaseUrl}/api/crm/deal-statuses`);
      setDealStatuses(response.data);
    } catch (error) {
      console.error('Error fetching deal statuses:', error);
    }
  };

  const fetchLeadSources = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await axios.get(`${apiBaseUrl}/api/crm/lead-sources`);
      setLeadSources(response.data);
    } catch (error) {
      console.error('Error fetching lead sources:', error);
    }
  };

  const filterOpportunities = () => {
    let filtered = opportunities;

    if (selectedStatus !== 'All Deal Statuses') {
      filtered = filtered.filter(opp => opp.deal_status === selectedStatus);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(opp => 
        opp.company.toLowerCase().includes(search) ||
        opp.contact.name.toLowerCase().includes(search) ||
        opp.contact.email.toLowerCase().includes(search) ||
        (opp.property_address && opp.property_address.toLowerCase().includes(search))
      );
    }

    setFilteredOpportunities(filtered);
  };

  const updateOpportunityStatus = async (opportunityId: string, newStatus: string) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      await axios.put(
        `${apiBaseUrl}/api/crm/opportunities/${opportunityId}`,
        { deal_status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchOpportunities();
    } catch (error) {
      console.error('Error updating opportunity:', error);
    }
  };

  const deleteOpportunity = async (opportunityId: string) => {
    if (!window.confirm('Are you sure you want to delete this opportunity?')) return;

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      await axios.delete(
        `${apiBaseUrl}/api/crm/opportunities/${opportunityId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchOpportunities();
    } catch (error) {
      console.error('Error deleting opportunity:', error);
    }
  };

  const addActivity = async () => {
    if (!selectedOpportunity || !activityDescription) return;

    setIsLoading(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      await axios.post(
        `${apiBaseUrl}/api/crm/opportunities/${selectedOpportunity.id}/activities`,
        {
          activity_type: activityType,
          description: activityDescription
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setActivityDescription('');
      setShowActivityDialog(false);
      fetchOpportunities();
    } catch (error) {
      console.error('Error adding activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditOpportunity = () => {
    if (selectedOpportunity) {
      setEditedOpportunity({
        company: selectedOpportunity.company,
        property_address: selectedOpportunity.property_address || '',
        notes: selectedOpportunity.notes || '',
        contact: {
          ...selectedOpportunity.contact,
          name: selectedOpportunity.contact.name,
          email: selectedOpportunity.contact.email,
          phone: selectedOpportunity.contact.phone || ''
        }
      });
      setIsEditing(true);
    }
  };

  const saveOpportunityChanges = async () => {
    if (!selectedOpportunity || !editedOpportunity) return;
    
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      
      // Update opportunity
      await axios.put(
        `${apiBaseUrl}/api/crm/opportunities/${selectedOpportunity.id}`,
        {
          company: editedOpportunity.company,
          property_address: editedOpportunity.property_address,
          notes: editedOpportunity.notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update contact if changed
      if (editedOpportunity.contact) {
        await axios.put(
          `${apiBaseUrl}/api/crm/contacts/${selectedOpportunity.contact.id}`,
          {
            name: editedOpportunity.contact.name,
            email: editedOpportunity.contact.email,
            phone: editedOpportunity.contact.phone
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      setIsEditing(false);
      setShowDetailDialog(false);
      fetchOpportunities(); // Refresh data
    } catch (error) {
      console.error('Error updating opportunity:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Research': return 'gray';
      case 'Gather': return 'blue';
      case 'Underwriting PRE': return 'cyan';
      case 'Underwriting EAP': return 'indigo';
      case 'LOI Sent': return 'purple';
      case 'Negotiation': return 'amber';
      case 'Signed LOI': return 'orange';
      case 'PSA-Purchase Sale Agmt': return 'yellow';
      case 'PSA Signed/Diligence': return 'lime';
      case 'Remove Contingencies': return 'teal';
      case 'Close Lost': return 'red';
      case 'Closed Won': return 'green';
      default: return 'gray';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'Email Mkt': return 'green';
      case 'LinkedIn': return 'blue';
      case 'Network': return 'purple';
      case 'LoopNet': return 'orange';
      case 'Score My Deal': return 'amber';
      default: return 'gray';
    }
  };

  const toggleRowExpansion = (opportunityId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(opportunityId)) {
        newSet.delete(opportunityId);
      } else {
        newSet.add(opportunityId);
      }
      return newSet;
    });
  };

  const addTag = (opportunityId: string) => {
    if (!newTag.trim()) return;
    
    setOpportunityTags(prev => ({
      ...prev,
      [opportunityId]: [...(prev[opportunityId] || []), newTag.trim()]
    }));
    setNewTag('');
  };

  const removeTag = (opportunityId: string, tagToRemove: string) => {
    setOpportunityTags(prev => ({
      ...prev,
      [opportunityId]: (prev[opportunityId] || []).filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Container size="4" style={{ padding: '2rem', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Flex justify="between" align="center" mb="4">
        <Heading size="7">REI Deal Pipeline</Heading>
        <Button size="3" onClick={() => window.location.href = '/score-my-deal'}>
          <PlusIcon />
          New Opportunity
        </Button>
      </Flex>
      
      <Text size="2" color="gray" mb="4">
        Manage your opportunities and track agent assignments
      </Text>

      <Card mb="4">
        <Box p="3">
          <Flex gap="3" align="center">
            <TextField.Root 
              placeholder="Search opportunities, contacts, deal status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1 }}
            >
              <TextField.Slot>
                <MagnifyingGlassIcon height="16" width="16" />
              </TextField.Slot>
            </TextField.Root>
            
            <Select.Root value={selectedStatus} onValueChange={setSelectedStatus}>
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="All Deal Statuses">All Deal Statuses</Select.Item>
                <Select.Separator />
                {dealStatuses.map(status => (
                  <Select.Item key={status} value={status}>{status}</Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        </Box>
      </Card>

      <Card style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Box style={{ overflow: 'auto', flex: 1 }}>
          <Table.Root>
            <Table.Header style={{ position: 'sticky', top: 0, backgroundColor: 'var(--color-background)', zIndex: 1 }}>
              <Table.Row>
                <Table.ColumnHeaderCell style={{ width: '40px' }}></Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Deal Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Company</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Contact</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Lead Source</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Lead Date</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredOpportunities.map((opportunity) => (
                <React.Fragment key={opportunity.id}>
                  <Table.Row 
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      // Don't expand if clicking on action buttons or select
                      if (!(e.target as HTMLElement).closest('button, select, [role="combobox"]')) {
                        toggleRowExpansion(opportunity.id);
                      }
                    }}
                  >
                    <Table.Cell>
                      <IconButton size="1" variant="ghost">
                        {expandedRows.has(opportunity.id) ? <ChevronDownIcon /> : <ChevronRightIcon />}
                      </IconButton>
                    </Table.Cell>
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      <Select.Root 
                        value={opportunity.deal_status} 
                        onValueChange={(value) => updateOpportunityStatus(opportunity.id, value)}
                      >
                        <Select.Trigger variant="ghost">
                          <Badge color={getStatusColor(opportunity.deal_status)}>
                            {opportunity.deal_status}
                          </Badge>
                        </Select.Trigger>
                        <Select.Content>
                          {dealStatuses.map(status => (
                            <Select.Item key={status} value={status}>{status}</Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </Table.Cell>
                    <Table.Cell>
                      <Text weight="medium">{opportunity.company}</Text>
                      {opportunity.property_address && (
                        <Text size="1" color="gray" style={{ display: 'block' }}>
                          {opportunity.property_address}
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Text>{opportunity.contact.name}</Text>
                      <Text size="1" color="gray" style={{ display: 'block' }}>
                        {opportunity.contact.email}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={getSourceColor(opportunity.lead_source)}>
                        {opportunity.lead_source}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      {format(new Date(opportunity.lead_date), 'MM/dd/yy')}
                    </Table.Cell>
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      <Flex gap="2">
                        <IconButton 
                          size="1" 
                          variant="ghost"
                          onClick={() => {
                            setSelectedOpportunity(opportunity);
                            setShowDetailDialog(true);
                            setIsEditing(false);
                          }}
                        >
                          <Pencil1Icon />
                        </IconButton>
                        <IconButton 
                          size="1" 
                          variant="ghost"
                          onClick={() => {
                            setSelectedOpportunity(opportunity);
                            setShowActivityDialog(true);
                          }}
                        >
                          <ActivityLogIcon />
                        </IconButton>
                        <IconButton 
                          size="1" 
                          variant="ghost" 
                          color="red"
                          onClick={() => deleteOpportunity(opportunity.id)}
                        >
                          <TrashIcon />
                        </IconButton>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                  
                  {/* Expanded Row Content */}
                  {expandedRows.has(opportunity.id) && (
                    <Table.Row>
                      <Table.Cell colSpan={7} style={{ backgroundColor: 'var(--gray-2)', padding: '1rem' }}>
                        <Box>
                          <Flex gap="6" wrap="wrap">
                            {/* Column 1: Property & Deal Info */}
                            <Box style={{ flex: '1 1 300px' }}>
                              <Text size="2" weight="bold" color="gray" mb="3">Property & Deal Information</Text>
                              
                              {opportunity.property_type && (
                                <Box mb="2">
                                  <Text size="1" color="gray">Property Type</Text>
                                  <Text size="2">{opportunity.property_type}</Text>
                                </Box>
                              )}
                              
                              {opportunity.deal_value && (
                                <Box mb="2">
                                  <Text size="1" color="gray">Deal Value</Text>
                                  <Text size="2">${(opportunity.deal_value / 100).toLocaleString()}</Text>
                                </Box>
                              )}
                              
                              {opportunity.assigned_to && (
                                <Box mb="2">
                                  <Text size="1" color="gray">Assigned To</Text>
                                  <Text size="2">{opportunity.assigned_to}</Text>
                                </Box>
                              )}
                              
                              <Box mb="2">
                                <Text size="1" color="gray">Last Activity</Text>
                                <Text size="2">{format(new Date(opportunity.last_activity), 'MM/dd/yy h:mm a')}</Text>
                              </Box>
                              
                              <Box mb="2">
                                <Text size="1" color="gray">Created</Text>
                                <Text size="2">{format(new Date(opportunity.created_at), 'MM/dd/yy')}</Text>
                              </Box>
                            </Box>

                            {/* Column 2: Contact Details */}
                            <Box style={{ flex: '1 1 300px' }}>
                              <Text size="2" weight="bold" color="gray" mb="3">Contact Details</Text>
                              
                              <Box mb="2">
                                <Text size="1" color="gray">Name</Text>
                                <Text size="2">{opportunity.contact.name}</Text>
                              </Box>
                              
                              <Box mb="2">
                                <Text size="1" color="gray">Email</Text>
                                <Text size="2">
                                  <a href={`mailto:${opportunity.contact.email}`} style={{ color: 'var(--accent-9)' }}>
                                    {opportunity.contact.email}
                                  </a>
                                </Text>
                              </Box>
                              
                              {opportunity.contact.phone && (
                                <Box mb="2">
                                  <Text size="1" color="gray">Phone</Text>
                                  <Text size="2">
                                    <a href={`tel:${opportunity.contact.phone}`} style={{ color: 'var(--accent-9)' }}>
                                      {opportunity.contact.phone}
                                    </a>
                                  </Text>
                                </Box>
                              )}
                              
                              {opportunity.contact.office_address && (
                                <Box mb="2">
                                  <Text size="1" color="gray">Office Address</Text>
                                  <Text size="2">{opportunity.contact.office_address}</Text>
                                </Box>
                              )}
                            </Box>

                            {/* Column 3: Notes & Tags */}
                            <Box style={{ flex: '1 1 300px' }}>
                              <Text size="2" weight="bold" color="gray" mb="3">Notes & Tags</Text>
                              
                              {opportunity.notes && (
                                <Box mb="3">
                                  <Text size="1" color="gray">Notes</Text>
                                  <Text size="2" style={{ whiteSpace: 'pre-wrap' }}>{opportunity.notes}</Text>
                                </Box>
                              )}
                              
                              {/* Tags Section */}
                              <Box>
                                <Text size="1" color="gray" mb="1">Tags</Text>
                                <Flex gap="1" wrap="wrap" mb="2">
                                  {(opportunityTags[opportunity.id] || []).map((tag, index) => (
                                    <Badge key={index} variant="soft" color="blue">
                                      {tag}
                                      <IconButton
                                        size="1"
                                        variant="ghost"
                                        style={{ marginLeft: '4px', padding: '0', height: '14px', width: '14px' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeTag(opportunity.id, tag);
                                        }}
                                      >
                                        <Cross2Icon width="10" height="10" />
                                      </IconButton>
                                    </Badge>
                                  ))}
                                </Flex>
                                
                                {editingTagsFor === opportunity.id ? (
                                  <Flex gap="2" align="center">
                                    <TextField.Root
                                      size="1"
                                      placeholder="Add a tag..."
                                      value={newTag}
                                      onChange={(e) => setNewTag(e.target.value)}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          addTag(opportunity.id);
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <Button 
                                      size="1" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addTag(opportunity.id);
                                        setEditingTagsFor(null);
                                      }}
                                    >
                                      Add
                                    </Button>
                                    <Button 
                                      size="1" 
                                      variant="soft"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTagsFor(null);
                                        setNewTag('');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </Flex>
                                ) : (
                                  <Button 
                                    size="1" 
                                    variant="soft"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingTagsFor(opportunity.id);
                                    }}
                                  >
                                    <PlusIcon width="12" height="12" />
                                    Add Tag
                                  </Button>
                                )}
                              </Box>
                            </Box>
                          </Flex>

                          {/* Recent Activities Section */}
                          {opportunity.activities && opportunity.activities.length > 0 && (
                            <Box mt="4">
                              <Separator size="4" mb="3" />
                              <Text size="2" weight="bold" color="gray" mb="2">Recent Activities</Text>
                              <Box style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {opportunity.activities.slice(0, 5).map((activity) => (
                                  <Flex key={activity.id} justify="between" mb="2">
                                    <Text size="2">
                                      <Badge size="1" variant="soft" mr="2">{activity.activity_type}</Badge>
                                      {activity.description}
                                    </Text>
                                    <Text size="1" color="gray">
                                      {format(new Date(activity.created_at), 'MM/dd h:mm a')}
                                    </Text>
                                  </Flex>
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </React.Fragment>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Card>

      {/* Opportunity Detail Dialog */}
      <Dialog.Root open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <Dialog.Content style={{ maxWidth: 600 }}>
          <Dialog.Title>Opportunity Details</Dialog.Title>
          {selectedOpportunity && (
            <Box>
              <Flex direction="column" gap="3">
                {!isEditing ? (
                  <>
                    <Box>
                      <Text size="2" color="gray">Company</Text>
                      <Text size="3" weight="medium">{selectedOpportunity.company}</Text>
                    </Box>
                    
                    <Box>
                      <Text size="2" color="gray">Status</Text>
                      <Badge color={getStatusColor(selectedOpportunity.deal_status)}>
                        {selectedOpportunity.deal_status}
                      </Badge>
                    </Box>

                    {selectedOpportunity.property_address && (
                      <Box>
                        <Text size="2" color="gray">Property Address</Text>
                        <Text size="3">{selectedOpportunity.property_address}</Text>
                      </Box>
                    )}

                    <Box>
                      <Text size="2" color="gray">Contact</Text>
                      <Text size="3">{selectedOpportunity.contact.name}</Text>
                      <Text size="2" color="gray">{selectedOpportunity.contact.email}</Text>
                      {selectedOpportunity.contact.phone && (
                        <Text size="2" color="gray">{selectedOpportunity.contact.phone}</Text>
                      )}
                    </Box>

                    {selectedOpportunity.notes && (
                      <Box>
                        <Text size="2" color="gray">Notes</Text>
                        <Text size="3">{selectedOpportunity.notes}</Text>
                      </Box>
                    )}
                  </>
                ) : (
                  <>
                    <Box>
                      <Text size="2" color="gray" mb="1">Company</Text>
                      <TextField.Root
                        value={editedOpportunity.company || ''}
                        onChange={(e) => setEditedOpportunity({
                          ...editedOpportunity,
                          company: e.target.value
                        })}
                      />
                    </Box>

                    <Box>
                      <Text size="2" color="gray" mb="1">Property Address</Text>
                      <TextField.Root
                        value={editedOpportunity.property_address || ''}
                        onChange={(e) => setEditedOpportunity({
                          ...editedOpportunity,
                          property_address: e.target.value
                        })}
                      />
                    </Box>

                    <Box>
                      <Text size="2" color="gray" mb="1">Contact Name</Text>
                      <TextField.Root
                        value={editedOpportunity.contact?.name || ''}
                        onChange={(e) => setEditedOpportunity({
                          ...editedOpportunity,
                          contact: {
                            ...editedOpportunity.contact!,
                            name: e.target.value
                          }
                        })}
                      />
                    </Box>

                    <Box>
                      <Text size="2" color="gray" mb="1">Contact Email</Text>
                      <TextField.Root
                        value={editedOpportunity.contact?.email || ''}
                        onChange={(e) => setEditedOpportunity({
                          ...editedOpportunity,
                          contact: {
                            ...editedOpportunity.contact!,
                            email: e.target.value
                          }
                        })}
                      />
                    </Box>

                    <Box>
                      <Text size="2" color="gray" mb="1">Contact Phone</Text>
                      <TextField.Root
                        value={editedOpportunity.contact?.phone || ''}
                        onChange={(e) => setEditedOpportunity({
                          ...editedOpportunity,
                          contact: {
                            ...editedOpportunity.contact!,
                            phone: e.target.value
                          }
                        })}
                      />
                    </Box>

                    <Box>
                      <Text size="2" color="gray" mb="1">Notes</Text>
                      <TextArea
                        value={editedOpportunity.notes || ''}
                        onChange={(e) => setEditedOpportunity({
                          ...editedOpportunity,
                          notes: e.target.value
                        })}
                        style={{ minHeight: 100 }}
                      />
                    </Box>
                  </>
                )}

                <Separator size="4" />

                <Box>
                  <Text size="2" color="gray" weight="medium" mb="2">Activity History</Text>
                  {selectedOpportunity.activities.map((activity) => (
                    <Box key={activity.id} mb="2">
                      <Flex justify="between">
                        <Text size="2">
                          <Badge size="1" variant="soft">{activity.activity_type}</Badge>
                          {' '}{activity.description}
                        </Text>
                        <Text size="1" color="gray">
                          {format(new Date(activity.created_at), 'MM/dd/yy h:mm a')}
                        </Text>
                      </Flex>
                    </Box>
                  ))}
                </Box>
              </Flex>
            </Box>
          )}
          <Flex gap="3" mt="4" justify="end">
            {!isEditing ? (
              <>
                <Button variant="soft" onClick={handleEditOpportunity}>
                  Edit
                </Button>
                <Dialog.Close>
                  <Button variant="soft">Close</Button>
                </Dialog.Close>
              </>
            ) : (
              <>
                <Button variant="soft" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={saveOpportunityChanges}>
                  Save Changes
                </Button>
              </>
            )}
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Add Activity Dialog */}
      <Dialog.Root open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Add Activity</Dialog.Title>
          <Flex direction="column" gap="3">
            <Box>
              <Text size="2" mb="1">Activity Type</Text>
              <Select.Root value={activityType} onValueChange={setActivityType}>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="note">Note</Select.Item>
                  <Select.Item value="email">Email</Select.Item>
                  <Select.Item value="call">Call</Select.Item>
                  <Select.Item value="meeting">Meeting</Select.Item>
                </Select.Content>
              </Select.Root>
            </Box>
            
            <Box>
              <Text size="2" mb="1">Description</Text>
              <TextField.Root
                placeholder="Enter activity description..."
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
              />
            </Box>
          </Flex>
          
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <Button onClick={addActivity} disabled={isLoading || !activityDescription}>
              Add Activity
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Container>
  );
};

export default CRMPage; 