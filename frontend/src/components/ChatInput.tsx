import { TextField, Button, Flex, IconButton } from '@radix-ui/themes';
import { PaperPlaneIcon, PlusIcon } from '@radix-ui/react-icons';
import React from 'react';

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onUpload: () => void;
  isLoading: boolean;
}

export const ChatInput = ({ value, onChange, onSend, onUpload, isLoading }: ChatInputProps) => {

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLoading) {
      onSend();
    }
  };

  return (
    <Flex gap="3" align="center">
      <IconButton 
        variant="ghost" 
        onClick={onUpload} 
        disabled={isLoading}
        title="Upload File"
      >
        <PlusIcon width="24" height="24" />
      </IconButton>
      <TextField.Root
        placeholder="Ask a follow up, or start a new search..."
        style={{ flexGrow: 1 }}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      />
      <IconButton 
        onClick={onSend} 
        disabled={isLoading || value.trim() === ''}
        title="Send Message"
      >
        <PaperPlaneIcon width="20" height="20" />
      </IconButton>
    </Flex>
  );
}; 