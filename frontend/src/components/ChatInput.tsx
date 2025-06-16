import { TextField, Flex, IconButton } from '@radix-ui/themes';
import { PaperPlaneIcon, PlusIcon } from '@radix-ui/react-icons';
import React from 'react';

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  isLoading: boolean;
}

export const ChatInput = ({ value, onChange, onSend, isLoading }: ChatInputProps) => {

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLoading) {
      onSend();
    }
  };

  return (
    <Flex gap="3" align="center">
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