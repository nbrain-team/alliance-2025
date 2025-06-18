import React, { useState } from 'react';
import { Flex, IconButton, TextField } from '@radix-ui/themes';
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
        <Flex gap="3" align="center">
            {/* --- Left-side Icons --- */}
            <Flex gap="2">
                <IconButton variant="ghost" onClick={() => alert('Icon 1 Clicked!')} style={{ cursor: 'pointer' }}>
                    <img src="/new-icons/3.png" alt="Icon 1" style={{ width: 20, height: 20 }}/>
                </IconButton>
                <IconButton variant="ghost" onClick={() => alert('Icon 2 Clicked!')} style={{ cursor: 'pointer' }}>
                    <img src="/new-icons/4.png" alt="Icon 2" style={{ width: 20, height: 20 }}/>
                </IconButton>
                <IconButton variant="ghost" onClick={() => alert('Icon 3 Clicked!')} style={{ cursor: 'pointer' }}>
                    <img src="/new-icons/6.png" alt="Icon 3" style={{ width: 20, height: 20 }}/>
                </IconButton>
            </Flex>

            {/* --- Text Input --- */}
            <TextField.Root
                placeholder="Ask a question..."
                style={{ flexGrow: 1 }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
            />

            {/* --- Send Button --- */}
            <IconButton
                onClick={handleSendClick}
                disabled={isLoading || input.trim() === ''}
                style={{ cursor: 'pointer' }}
            >
                <PaperPlaneIcon width="18" height="18" />
            </IconButton>
        </Flex>
    );
}; 