import { TextField, Button, Flex } from '@radix-ui/themes';
import { PaperPlaneIcon } from '@radix-ui/react-icons';
import type { Dispatch, SetStateAction } from 'react';

interface ChatInputProps {
    input: string;
    setInput: Dispatch<SetStateAction<string>>;
    handleSubmit: () => void;
}

export const ChatInput = ({ input, setInput, handleSubmit }: ChatInputProps) => {
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Flex gap="2" align="center">
      <TextField.Root 
        placeholder="Ask a question..." 
        style={{ flexGrow: 1 }}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      >
        <TextField.Slot>
            <PaperPlaneIcon height="16" width="16" />
        </TextField.Slot>
      </TextField.Root>
      <Button onClick={handleSubmit}>Send</Button>
    </Flex>
  );
}; 