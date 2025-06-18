import React, { useState } from 'react';
import { Flex, IconButton, TextField } from '@radix-ui/themes';
import { ArrowRightIcon, Share2Icon, CalendarIcon, LayersIcon } from '@radix-ui/react-icons';
import { DataSourcesPopup } from './DataSourcesPopup';
import { DateSelectionPopup } from './DateSelectionPopup';
import { TemplateAgentsPopup } from './TemplateAgentsPopup';

interface CommandCenterProps {
  onSend: (query: string) => void;
  isLoading: boolean;
}

export const CommandCenter = ({ onSend, isLoading }: CommandCenterProps) => {
    const [input, setInput] = useState('');
    const [activePopup, setActivePopup] = useState<string | null>(null);

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

    const togglePopup = (popupName: string) => {
        setActivePopup(prev => (prev === popupName ? null : popupName));
    };


    return (
        <Flex gap="3" align="center" style={{ position: 'relative' }}>
            {/* --- Text Input --- */}
            <TextField.Root
                placeholder="Ask a question or type a command..."
                style={{ flexGrow: 1 }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
            />

            {/* --- Right-side Icons & Popups --- */}
            <Flex gap="4">
                <div style={{ position: 'relative' }}>
                    <IconButton variant="ghost" onClick={() => togglePopup('sources')} style={{ cursor: 'pointer' }}>
                        <Share2Icon width={18} height={18} />
                    </IconButton>
                    {activePopup === 'sources' && <DataSourcesPopup />}
                </div>
                
                <div style={{ position: 'relative' }}>
                    <IconButton variant="ghost" onClick={() => togglePopup('date')} style={{ cursor: 'pointer' }}>
                        <CalendarIcon width={18} height={18} />
                    </IconButton>
                    {activePopup === 'date' && <DateSelectionPopup />}
                </div>

                <div style={{ position: 'relative' }}>
                    <IconButton variant="ghost" onClick={() => togglePopup('agents')} style={{ cursor: 'pointer' }}>
                        <LayersIcon width={18} height={18} />
                    </IconButton>
                    {activePopup === 'agents' && <TemplateAgentsPopup />}
                </div>
            </Flex>

            {/* --- Send Button --- */}
            <IconButton
                color="blue"
                onClick={handleSendClick}
                disabled={isLoading || input.trim() === ''}
                style={{ cursor: 'pointer' }}
            >
                <ArrowRightIcon width="18" height="18" />
            </IconButton>
        </Flex>
    );
}; 