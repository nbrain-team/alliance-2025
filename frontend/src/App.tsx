import { Box, Grid, Card, Flex, Text, Button } from '@radix-ui/themes';
import { ChatInput } from './components/ChatInput';
import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

interface Message {
  text: string;
  sender: 'user' | 'ai';
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (newQuery: string) => {
      const formData = new FormData();
      formData.append('query', newQuery);
      return axios.post('http://localhost:8000/query', formData);
    },
    onSuccess: (response) => {
      setMessages((prev) => [...prev, { text: response.data.answer, sender: 'ai' }]);
    },
    onError: (error) => {
      console.error("Error querying backend:", error);
      setMessages((prev) => [...prev, { text: "Sorry, something went wrong.", sender: 'ai' }]);
    }
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return axios.post('http://localhost:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: () => {
      // You can add a success message here, e.g., using a toast notification
      console.log("File uploaded successfully");
    },
    onError: (error) => {
      console.error("Error uploading file:", error);
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = () => {
    if (!input.trim()) return;

    const newQuery = input;
    setMessages((prev) => [...prev, { text: newQuery, sender: 'user' }]);
    setInput('');
    mutation.mutate(newQuery);
  };

  return (
    <Grid columns="300px 1fr" style={{ height: '100vh' }}>
      {/* Sidebar */}
      <Box style={{ backgroundColor: '#f7f7f7', borderRight: '1px solid #e0e0e0' }}>
        <Flex direction="column" p="4">
          <Text size="5" weight="bold">ADTV AI</Text>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept=".pdf,.docx,.txt"
          />
          <Button onClick={handleUploadClick} mt="4">
            Upload File
          </Button>
          {/* Sidebar content will go here */}
        </Flex>
      </Box>

      {/* Main Content */}
      <Box p="4">
        <Card style={{ height: '100%' }}>
          <Flex direction="column" justify="between" style={{ height: '100%' }}>
            {/* Chat messages will go here */}
            <Box style={{ flexGrow: 1, overflowY: 'auto' }}>
              {messages.map((msg, index) => (
                <Flex key={index} direction="column" my="2">
                  <Card style={{ 
                    maxWidth: '70%', 
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    backgroundColor: msg.sender === 'user' ? '#007aff' : '#f0f0f0',
                    color: msg.sender === 'user' ? 'white' : 'black'
                  }}>
                    <Text>{msg.text}</Text>
                  </Card>
                </Flex>
              ))}
              {mutation.isPending && (
                <Flex direction="column" my="2">
                  <Card style={{ 
                    maxWidth: '70%', 
                    alignSelf: 'flex-start',
                    backgroundColor: '#f0f0f0',
                    color: 'black'
                  }}>
                    <Text>Thinking...</Text>
                  </Card>
                </Flex>
              )}
            </Box>
            
            {/* Input area */}
            <Box>
              <ChatInput 
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
              />
            </Box>
          </Flex>
        </Card>
      </Box>
    </Grid>
  )
}

export default App
