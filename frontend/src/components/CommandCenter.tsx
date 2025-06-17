import React, { useState } from 'react';
import { IconButton, TextField } from '@radix-ui/themes';
import { PaperPlaneIcon } from '@radix-ui/react-icons';

interface CommandCenterProps {
  onSend: (query: string) => void;
  isLoading: boolean;
}

export const CommandCenter = ({ onSend, isLoading }: CommandCenterProps) => {
    const [input, setInput] = useState('');

    const handleSendClick = () => {
        if (input.trim()) {
            onSend(input);
            setInput('');
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          if (!isLoading && input.trim() !== '') {
            handleSendClick();
          }
        }
    };

    return (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <TextField.Root 
                placeholder="Ask a question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                style={{ flexGrow: 1 }}
            />
            <IconButton 
                onClick={handleSendClick} 
                disabled={isLoading || input.trim() === ''}
                style={{ cursor: 'pointer' }}
            >
                <PaperPlaneIcon width="18" height="18" />
            </IconButton>
        </div>
    );
}; 