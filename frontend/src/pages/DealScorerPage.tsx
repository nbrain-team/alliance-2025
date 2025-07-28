import React, { useState, useRef, useEffect } from 'react';
import { Container, Card, Box, Heading, Text, Button, TextField, RadioGroup, Flex, ScrollArea, Table, Badge, Dialog } from '@radix-ui/themes';
import { ChevronRightIcon, ReloadIcon, ExternalLinkIcon, PersonIcon, EnvelopeClosedIcon } from '@radix-ui/react-icons';
import axios from 'axios';
import './DealScorerPage.css';

interface Message {
  id: string;
  type: 'bot' | 'user';
  text: string;
  options?: string[];
  inputType?: 'text' | 'email' | 'phone' | 'radio';
  flag?: 'warning' | 'error' | 'success';
}

interface DealData {
  marketStatus?: 'on-market' | 'off-market';
  listingUrl?: string;
  propertyType?: string;
  property_address?: string;
  unitCount?: number;
  unitMix?: string;
  yearBuilt?: number;
  vacancyRate?: number;
  rentRoll?: number;
  parkingSpaces?: number;
  tenantNames?: string;
  leaseTerms?: string;
  leasableSqFt?: number;
  fullBayAccess?: boolean;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_office_address?: string;
  motivationToSell?: string;
  pricingFlexibility?: string;
  scrapedData?: any;
  [key: string]: any;
}

interface Submission {
  id: string;
  contact_name: string;
  contact_email: string;
  property_address: string;
  property_type: string;
  score: string;
  loopnet_url?: string;
  scraped_data?: any;
  created_at: string;
  status: string;
}

const DealScorerPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState('initial');
  const [dealData, setDealData] = useState<DealData>({});
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultHtml, setResultHtml] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [showSubmissionDetail, setShowSubmissionDetail] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initial greeting
    setTimeout(() => {
      addBotMessage(
        "Hello! I'm the Alliance Deal Concierge. I'll help you evaluate your commercial real estate property. Is your property currently on-market or off-market?",
        ['On-Market', 'Off-Market'],
        'radio'
      );
    }, 500);
    
    // Load submissions
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await axios.get(`${apiBaseUrl}/deal-submissions`);
      setSubmissions(response.data.submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const fetchSubmissionDetail = async (submissionId: string) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await axios.get(`${apiBaseUrl}/deal-submissions/${submissionId}`);
      setSelectedSubmission(response.data);
      setShowSubmissionDetail(true);
    } catch (error) {
      console.error('Error fetching submission detail:', error);
    }
  };

  const addBotMessage = (text: string, options?: string[], inputType?: 'text' | 'email' | 'phone' | 'radio', flag?: 'warning' | 'error' | 'success') => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'bot',
        text,
        options,
        inputType,
        flag
      }]);
      setIsTyping(false);
    }, 800);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      text
    }]);
  };

  const scrapeLoopNetData = async (address: string): Promise<any> => {
    // Check if the address looks like a LoopNet URL
    const loopnetUrlPattern = /loopnet\.com\/Listing\//i;
    if (loopnetUrlPattern.test(address)) {
      try {
        setIsLoading(true);
        addBotMessage("I'm analyzing the LoopNet listing for you...");
        
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
        const response = await axios.post(`${apiBaseUrl}/scrape-loopnet`, {
          url: address
        });
        
        if (response.data.success && response.data.data) {
          return response.data.data;
        } else {
          console.error('LoopNet scraping failed:', response.data.error);
          return null;
        }
      } catch (error) {
        console.error('Error scraping LoopNet:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    }
    return null;
  };

  const evaluateInRealTime = (field: string, value: any): { flag?: 'warning' | 'error'; message?: string } => {
    // Real-time evaluation logic
    if (field === 'capRate' && value < 4.5) {
      return { flag: 'error', message: "That cap rate is below our minimum threshold of 4.5%..." };
    }
    if (field === 'vacancyRate' && value > 15) {
      return { flag: 'warning', message: "That's a relatively high vacancy rate. We typically look for properties under 15% vacancy." };
    }
    if (field === 'yearBuilt' && value < 1980) {
      return { flag: 'warning', message: "Older properties may require additional capital improvements. We'll need to factor that in." };
    }
    return {};
  };

  const handleUserInput = async (input: string) => {
    addUserMessage(input);
    const updatedData = { ...dealData };

    switch (currentStep) {
      case 'initial':
        updatedData.marketStatus = input.toLowerCase() === 'on-market' ? 'on-market' : 'off-market';
        setDealData(updatedData);
        
        if (input.toLowerCase() === 'on-market') {
          setCurrentStep('onMarket_url');
          addBotMessage("Great! Please paste the LoopNet or CoStar listing URL.", undefined, 'text');
        } else {
          setCurrentStep('offMarket_type');
          addBotMessage(
            "Now we're talking! Alliance loves rare deals. Let's learn more. What type of commercial property is this?",
            ['Multifamily', 'Medical Office/Veterinary', 'Industrial', 'Other'],
            'radio'
          );
        }
        break;

      case 'onMarket_url':
        updatedData.listingUrl = input;
        setDealData(updatedData);
        
        // Try to scrape LoopNet data
        const scrapedData = await scrapeLoopNetData(input);
        if (scrapedData) {
          updatedData.scrapedData = scrapedData;
          updatedData.property_address = scrapedData.address;
          if (scrapedData.propertyType) {
            updatedData.propertyType = scrapedData.propertyType;
          }
          
          // Show summary of scraped data
          let summary = `Great! I found the listing. Here's what I gathered:\n\n`;
          if (scrapedData.address) summary += `📍 **Address:** ${scrapedData.address}\n`;
          if (scrapedData.propertyType) summary += `🏢 **Property Type:** ${scrapedData.propertyType}\n`;
          if (scrapedData.price) summary += `💰 **Asking Price:** ${scrapedData.price}\n`;
          if (scrapedData.units) summary += `🏠 **Units:** ${scrapedData.units}\n`;
          if (scrapedData.squareFeet) summary += `📐 **Size:** ${scrapedData.squareFeet}\n`;
          if (scrapedData.yearBuilt) summary += `🏗️ **Year Built:** ${scrapedData.yearBuilt}\n`;
          if (scrapedData.capRate) summary += `📊 **Cap Rate:** ${scrapedData.capRate}\n`;
          if (scrapedData.noi) summary += `💵 **NOI:** ${scrapedData.noi}\n`;
          if (scrapedData.lotSize) summary += `🌳 **Lot Size:** ${scrapedData.lotSize}\n`;
          
          summary += `\nThis looks interesting! Let me get some additional information from you.`;
          
          addBotMessage(summary);
          
          // Wait for the summary to be displayed before asking the next question
          setCurrentStep('contact_name');
          setTimeout(() => {
            addBotMessage("Now I'll need some contact information. What's your full name?", undefined, 'text');
          }, 3500);
        } else {
          // If scraping failed, just continue
          setCurrentStep('contact_name');
          addBotMessage("I couldn't fetch the listing details, but let's continue. What's your full name?", undefined, 'text');
        }
        break;

      case 'offMarket_type':
        updatedData.propertyType = input;
        setDealData(updatedData);
        setCurrentStep('property_address');
        addBotMessage("Excellent choice! Let's start with the basics. What's the property address?", undefined, 'text');
        break;

      case 'property_address':
        updatedData.property_address = input;
        setDealData(updatedData);
        
        // Check if this is a LoopNet URL for off-market flow
        const offMarketScrapedData = await scrapeLoopNetData(input);
        if (offMarketScrapedData) {
          updatedData.scrapedData = offMarketScrapedData;
          updatedData.property_address = offMarketScrapedData.address || input;
          
          let summary = `I see you've provided a LoopNet listing. Here's what I found:\n\n`;
          if (offMarketScrapedData.address) summary += `📍 **Address:** ${offMarketScrapedData.address}\n`;
          if (offMarketScrapedData.price) summary += `💰 **Listed Price:** ${offMarketScrapedData.price}\n`;
          if (offMarketScrapedData.units) summary += `🏠 **Units:** ${offMarketScrapedData.units}\n`;
          if (offMarketScrapedData.squareFeet) summary += `📐 **Size:** ${offMarketScrapedData.squareFeet}\n`;
          if (offMarketScrapedData.yearBuilt) summary += `🏗️ **Year Built:** ${offMarketScrapedData.yearBuilt}\n`;
          if (offMarketScrapedData.capRate) summary += `📊 **Listed Cap Rate:** ${offMarketScrapedData.capRate}\n`;
          
          summary += `\nLet me gather some additional off-market specific information.`;
          
          addBotMessage(summary);
          
          // Wait before continuing
          setTimeout(() => {
            if (dealData.propertyType === 'Multifamily') {
              setCurrentStep('mf_unitCount');
              addBotMessage("Got it! How many units does this property have?", undefined, 'text');
            } else if (dealData.propertyType === 'Medical Office/Veterinary') {
              setCurrentStep('mo_sqft');
              addBotMessage("Thanks! What's the total leasable square footage?", undefined, 'text');
            } else if (dealData.propertyType === 'Industrial') {
              setCurrentStep('ind_sqft');
              addBotMessage("Great! What's the total square footage of the industrial space?", undefined, 'text');
            } else {
              setCurrentStep('contact_name');
              addBotMessage("Thanks! Let me get your contact information. What's your full name?", undefined, 'text');
            }
          }, 3000);
        } else {
          // No scraping, continue normally
          if (dealData.propertyType === 'Multifamily') {
            setCurrentStep('mf_unitCount');
            addBotMessage("Got it! How many units does this property have?", undefined, 'text');
          } else if (dealData.propertyType === 'Medical Office/Veterinary') {
            setCurrentStep('mo_sqft');
            addBotMessage("Thanks! What's the total leasable square footage?", undefined, 'text');
          } else if (dealData.propertyType === 'Industrial') {
            setCurrentStep('ind_sqft');
            addBotMessage("Great! What's the total square footage of the industrial space?", undefined, 'text');
          } else {
            setCurrentStep('contact_name');
            addBotMessage("Thanks! Let me get your contact information. What's your full name?", undefined, 'text');
          }
        }
        break;

      // Multifamily flow
      case 'mf_unitCount':
        updatedData.unitCount = parseInt(input);
        setDealData(updatedData);
        setCurrentStep('mf_unitMix');
        addBotMessage("What's the unit mix? (e.g., 10x 1BR, 15x 2BR, 5x 3BR)", undefined, 'text');
        break;

      case 'mf_unitMix':
        updatedData.unitMix = input;
        setDealData(updatedData);
        setCurrentStep('mf_yearBuilt');
        addBotMessage("What year was the property built?", undefined, 'text');
        break;

      case 'mf_yearBuilt':
        updatedData.yearBuilt = parseInt(input);
        setDealData(updatedData);
        const yearEval = evaluateInRealTime('yearBuilt', parseInt(input));
        if (yearEval.message) {
          addBotMessage(yearEval.message, undefined, undefined, yearEval.flag);
        }
        setCurrentStep('mf_vacancy');
        setTimeout(() => {
          addBotMessage("What's the trailing 12-month vacancy rate (as a percentage)?", undefined, 'text');
        }, yearEval.message ? 1500 : 0);
        break;

      case 'mf_vacancy':
        updatedData.vacancyRate = parseFloat(input);
        setDealData(updatedData);
        const vacancyEval = evaluateInRealTime('vacancyRate', parseFloat(input));
        if (vacancyEval.message) {
          addBotMessage(vacancyEval.message, undefined, undefined, vacancyEval.flag);
        }
        setCurrentStep('mf_rentRoll');
        setTimeout(() => {
          addBotMessage("What's the total monthly rent roll?", undefined, 'text');
        }, vacancyEval.message ? 1500 : 0);
        break;

      case 'mf_rentRoll':
        updatedData.rentRoll = parseFloat(input);
        setDealData(updatedData);
        setCurrentStep('contact_name');
        addBotMessage("Thank you for all that property information! Now I'll need your contact details. What's your full name?", undefined, 'text');
        break;

      // Medical Office flow
      case 'mo_sqft':
        updatedData.leasableSqFt = parseInt(input);
        setDealData(updatedData);
        setCurrentStep('mo_parking');
        addBotMessage("How many parking spaces are available?", undefined, 'text');
        break;

      case 'mo_parking':
        updatedData.parkingSpaces = parseInt(input);
        setDealData(updatedData);
        setCurrentStep('mo_tenants');
        addBotMessage("Who are the current tenants? Please list their names.", undefined, 'text');
        break;

      case 'mo_tenants':
        updatedData.tenantNames = input;
        setDealData(updatedData);
        setCurrentStep('mo_leaseTerms');
        addBotMessage("What are the lease terms and expiration dates?", undefined, 'text');
        break;

      case 'mo_leaseTerms':
        updatedData.leaseTerms = input;
        setDealData(updatedData);
        setCurrentStep('contact_name');
        addBotMessage("Perfect! Now let me get your contact information. What's your full name?", undefined, 'text');
        break;

      // Industrial flow
      case 'ind_sqft':
        updatedData.leasableSqFt = parseInt(input);
        setDealData(updatedData);
        setCurrentStep('ind_bayAccess');
        addBotMessage("Does the property have full-bay distribution truck access?", ['Yes', 'No'], 'radio');
        break;

      case 'ind_bayAccess':
        updatedData.fullBayAccess = input.toLowerCase() === 'yes';
        setDealData(updatedData);
        if (!updatedData.fullBayAccess) {
          addBotMessage("Limited truck access may affect the property's industrial utility rating.", undefined, undefined, 'warning');
        }
        setCurrentStep('contact_name');
        setTimeout(() => {
          addBotMessage("Thanks for that information! Now, what's your full name?", undefined, 'text');
        }, updatedData.fullBayAccess ? 0 : 1500);
        break;

      // Contact information flow
      case 'contact_name':
        updatedData.contact_name = input;
        setDealData(updatedData);
        setCurrentStep('contact_email');
        addBotMessage("Thanks! What's your email address?", undefined, 'email');
        break;

      case 'contact_email':
        updatedData.contact_email = input;
        setDealData(updatedData);
        setCurrentStep('contact_phone');
        addBotMessage("And your phone number?", undefined, 'phone');
        break;

      case 'contact_phone':
        updatedData.contact_phone = input;
        setDealData(updatedData);
        
        if (dealData.marketStatus === 'on-market') {
          setCurrentStep('motivation');
          addBotMessage("Almost done! Can you briefly describe your motivation to sell? (under 200 words)", undefined, 'text');
        } else {
          submitDeal(updatedData);
        }
        break;

      case 'motivation':
        updatedData.motivationToSell = input;
        setDealData(updatedData);
        setCurrentStep('flexibility');
        addBotMessage("Finally, how flexible are you on pricing and terms?", ['Very Flexible', 'Somewhat Flexible', 'Firm on Price'], 'radio');
        break;

      case 'flexibility':
        updatedData.pricingFlexibility = input;
        setDealData(updatedData);
        submitDeal(updatedData);
        break;
    }
  };

  const submitDeal = async (data: DealData) => {
    setIsLoading(true);
    addBotMessage("Analyzing your property based on Alliance criteria...");

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      
      // Prepare submission data
      const submissionData = {
        property_address: data.property_address || data.listingUrl || 'Not provided',
        property_type: data.propertyType || 'Other',
        contact_name: data.contact_name || '',
        contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '',
        contact_office_address: data.contact_office_address || '',
        // Include all collected data for enhanced scoring
        additional_data: JSON.stringify(data)
      };

      const response = await axios.post(`${apiBaseUrl}/score-deal`, submissionData);
      
      setResultHtml(response.data.html_response);
      
      // Parse the score from response
      const score = response.data.score || 'Red';
      
      if (score === 'Green') {
        addBotMessage(
          "🎉 Excellent news! Your property meets our investment criteria. We're prepared to make an offer!",
          undefined,
          undefined,
          'success'
        );
      } else if (score === 'Yellow') {
        addBotMessage(
          "📋 Your property shows promise! We're interested but will need to discuss some contingencies.",
          undefined,
          undefined,
          'warning'
        );
      } else {
        addBotMessage(
          "Thank you for your submission. While this property doesn't meet our current criteria, we encourage you to submit other opportunities.",
          undefined,
          undefined,
          'error'
        );
      }

      setTimeout(() => {
        setShowResult(true);
        // Refresh submissions list after new submission
        fetchSubmissions();
      }, 2000);

    } catch (error: any) {
      addBotMessage(
        "I encountered an error while processing your submission. Please try again or contact our team directly.",
        undefined,
        undefined,
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRadioSelect = (value: string) => {
    handleUserInput(value);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      handleUserInput(userInput);
      setUserInput('');
    }
  };

  const resetChat = () => {
    setMessages([]);
    setCurrentStep('initial');
    setDealData({});
    setUserInput('');
    setShowResult(false);
    setResultHtml('');
    
    setTimeout(() => {
      addBotMessage(
        "Hello! I'm the Alliance Deal Concierge. I'll help you evaluate your commercial real estate property. Is your property currently on-market or off-market?",
        ['On-Market', 'Off-Market'],
        'radio'
      );
    }, 500);
  };

  const getScoreBadgeColor = (score: string) => {
    switch (score) {
      case 'Green': return 'green';
      case 'Yellow': return 'amber';
      case 'Red': return 'red';
      default: return 'gray';
    }
  };

  if (showResult) {
    return (
      <Container size="4" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <Card style={{ marginBottom: '2rem' }}>
          <Box p="4">
            <Heading align="center" mb="4">Deal Analysis Complete</Heading>
            <div dangerouslySetInnerHTML={{ __html: resultHtml }} />
            <Flex justify="center" mt="4">
              <Button onClick={resetChat}>
                Submit Another Deal
              </Button>
            </Flex>
          </Box>
        </Card>
        
        {/* Submissions List */}
        <Card>
          <Box p="4">
            <Heading size="5" mb="4">Recent Submissions</Heading>
            <SubmissionsList 
              submissions={submissions} 
              onSelectSubmission={fetchSubmissionDetail}
            />
          </Box>
        </Card>
      </Container>
    );
  }

  const lastMessage = messages[messages.length - 1];
  const showInput = lastMessage && lastMessage.type === 'bot' && !lastMessage.options;
  const showOptions = lastMessage && lastMessage.type === 'bot' && lastMessage.options && lastMessage.inputType === 'radio';

  return (
    <Container size="4" style={{ marginTop: '4rem', marginBottom: '2rem' }}>
      <Flex gap="4" direction="column">
        {/* Chat Interface */}
        <Card className="chat-container" style={{ height: 'calc(70vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
          <Box className="chat-header" p="4">
            <Flex direction="column" align="center" gap="3">
              <img 
                src="/new-icons/adtv-logo.png" 
                alt="Alliance Logo" 
                className="chat-logo"
                style={{ 
                  height: '120px',
                  marginBottom: '0.5rem'
                }}
              />
              <Flex align="center" justify="between" style={{ width: '100%' }}>
                <Heading size="6">Alliance Deal Concierge</Heading>
                <Button variant="ghost" size="2" onClick={resetChat}>
                  <ReloadIcon />
                  Start Over
                </Button>
              </Flex>
            </Flex>
          </Box>
          
          <Box style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ScrollArea className="chat-messages" style={{ flex: 1 }}>
              <Box p="4">
                {messages.map((message) => (
                  <Box
                    key={message.id}
                    className={`message ${message.type}`}
                    mb="3"
                    style={{
                      alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      marginLeft: message.type === 'user' ? 'auto' : '0',
                    }}
                  >
                    <Card
                      style={{
                        backgroundColor: message.type === 'user' ? undefined : '#f4f4f5',
                        color: message.type === 'user' ? '#1C2660' : 'inherit',
                        borderLeft: message.flag ? `4px solid ${
                          message.flag === 'error' ? '#e00' : 
                          message.flag === 'warning' ? '#f90' : 
                          '#0a0'
                        }` : 'none',
                      }}
                    >
                      <Box p="3">
                        <Text size="2" style={{ whiteSpace: 'pre-line' }}>{message.text}</Text>
                      </Box>
                    </Card>
                  </Box>
                ))}
                
                {isTyping && (
                  <Box className="message bot" mb="3">
                    <Card style={{ backgroundColor: '#f4f4f5' }}>
                      <Box p="3">
                        <div className="typing-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </Box>
                    </Card>
                  </Box>
                )}
                
                <div ref={messagesEndRef} />
              </Box>
            </ScrollArea>

            <Box className="chat-input-area" p="4">
              {showOptions && (
                <Box mb="3">
                  <RadioGroup.Root onValueChange={handleRadioSelect}>
                    <Flex direction="column" gap="2">
                      {lastMessage.options?.map((option) => (
                        <label key={option} style={{ cursor: 'pointer' }}>
                          <Flex align="center" gap="2" p="2" style={{
                            border: '1px solid var(--gray-6)',
                            borderRadius: '4px'
                          }}>
                            <RadioGroup.Item value={option} />
                            <Text size="2">{option}</Text>
                          </Flex>
                        </label>
                      ))}
                    </Flex>
                  </RadioGroup.Root>
                </Box>
              )}

              {showInput && !isLoading && (
                <form onSubmit={handleTextSubmit}>
                  <Flex gap="2">
                    <TextField.Root
                      placeholder={
                        lastMessage.inputType === 'email' ? 'Enter your email...' :
                        lastMessage.inputType === 'phone' ? 'Enter your phone number...' :
                        'Type your answer...'
                      }
                      type={lastMessage.inputType === 'phone' ? 'tel' : (lastMessage.inputType === 'radio' ? 'text' : lastMessage.inputType)}
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Button type="submit" disabled={!userInput.trim()}>
                      <ChevronRightIcon />
                    </Button>
                  </Flex>
                </form>
              )}

              {isLoading && (
                <Flex justify="center">
                  <Text size="2" color="gray">Processing your submission...</Text>
                </Flex>
              )}
            </Box>
          </Box>
        </Card>

        {/* Submissions List */}
        <Card>
          <Box p="4">
            <Heading size="5" mb="4">Recent Submissions</Heading>
            <SubmissionsList 
              submissions={submissions} 
              onSelectSubmission={fetchSubmissionDetail}
            />
          </Box>
        </Card>
      </Flex>

      {/* Submission Detail Dialog */}
      <Dialog.Root open={showSubmissionDetail} onOpenChange={setShowSubmissionDetail}>
        <Dialog.Content style={{ maxWidth: 650 }}>
          <Dialog.Title>Submission Details</Dialog.Title>
          {selectedSubmission && (
            <Box mt="4">
              <Flex direction="column" gap="3">
                <Box>
                  <Text size="2" weight="bold">Contact Information</Text>
                  <Text size="2" as="div" mt="1">
                    <Flex align="center" gap="2">
                      <PersonIcon />
                      {selectedSubmission.contact_name}
                    </Flex>
                  </Text>
                  <Text size="2" as="div" mt="1">
                    <Flex align="center" gap="2">
                      <EnvelopeClosedIcon />
                      <a href={`mailto:${selectedSubmission.contact_email}`}>{selectedSubmission.contact_email}</a>
                    </Flex>
                  </Text>
                  {selectedSubmission.contact_phone && (
                    <Text size="2" as="div" mt="1">
                      📞 {selectedSubmission.contact_phone}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text size="2" weight="bold">Property Details</Text>
                  <Text size="2" as="div" mt="1">📍 {selectedSubmission.property_address}</Text>
                  <Text size="2" as="div" mt="1">🏢 {selectedSubmission.property_type}</Text>
                  <Flex align="center" gap="2" mt="1">
                    <Text size="2">Score:</Text>
                    <Badge color={getScoreBadgeColor(selectedSubmission.score)}>
                      {selectedSubmission.score}
                    </Badge>
                  </Flex>
                </Box>

                {selectedSubmission.additional_data?.listingUrl && (
                  <Box>
                    <Text size="2" weight="bold">Listing URL</Text>
                    <Text size="2" as="div" mt="1">
                      <a href={selectedSubmission.additional_data.listingUrl} target="_blank" rel="noopener noreferrer">
                        {selectedSubmission.additional_data.listingUrl}
                        <ExternalLinkIcon style={{ marginLeft: '4px', display: 'inline' }} />
                      </a>
                    </Text>
                  </Box>
                )}

                {selectedSubmission.additional_data?.scrapedData && (
                  <Box>
                    <Text size="2" weight="bold">Scraped Property Data</Text>
                    <Box mt="1" p="2" style={{ backgroundColor: 'var(--gray-2)', borderRadius: '4px' }}>
                      {Object.entries(selectedSubmission.additional_data.scrapedData).map(([key, value]) => (
                        <Text key={key} size="2" as="div">
                          <strong>{key}:</strong> {String(value)}
                        </Text>
                      ))}
                    </Box>
                  </Box>
                )}

                <Box>
                  <Text size="2" weight="bold">Generated Response</Text>
                  <Box mt="2" style={{ maxHeight: '300px', overflow: 'auto' }}>
                    <div dangerouslySetInnerHTML={{ __html: selectedSubmission.generated_response }} />
                  </Box>
                </Box>
              </Flex>
            </Box>
          )}
          <Flex gap="3" mt="5" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">Close</Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Container>
  );
};

// Submissions List Component
const SubmissionsList = ({ submissions, onSelectSubmission }: { submissions: Submission[], onSelectSubmission: (id: string) => void }) => {
  const getScoreBadgeColor = (score: string) => {
    switch (score) {
      case 'Green': return 'green';
      case 'Yellow': return 'amber';
      case 'Red': return 'red';
      default: return 'gray';
    }
  };

  if (submissions.length === 0) {
    return (
      <Text size="2" color="gray">No submissions yet. Complete the chat above to submit your first deal!</Text>
    );
  }

  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Contact</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Property</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Score</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {submissions.map((submission) => (
          <Table.Row key={submission.id}>
            <Table.Cell>
              <Text size="2" weight="medium">{submission.contact_name}</Text>
              <Text size="1" color="gray" as="div">{submission.contact_email}</Text>
            </Table.Cell>
            <Table.Cell>
              <Text size="2">{submission.property_address}</Text>
              {submission.loopnet_url && (
                <a href={submission.loopnet_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon style={{ marginLeft: '4px' }} />
                </a>
              )}
            </Table.Cell>
            <Table.Cell>
              <Text size="2">{submission.property_type}</Text>
            </Table.Cell>
            <Table.Cell>
              <Badge color={getScoreBadgeColor(submission.score)}>
                {submission.score}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <Text size="2">{new Date(submission.created_at).toLocaleDateString()}</Text>
            </Table.Cell>
            <Table.Cell>
              <Button 
                size="1" 
                variant="soft" 
                onClick={() => onSelectSubmission(submission.id)}
              >
                View Details
              </Button>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
};

export default DealScorerPage; 