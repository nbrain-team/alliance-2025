import { Flex } from "@radix-ui/themes";
import { Sidebar } from "./Sidebar";
import React from "react";

interface MainLayoutProps {
    children: React.ReactNode;
    onNewChat: () => void;
}

export const MainLayout = ({ children, onNewChat }: MainLayoutProps) => {
    return (
        <Flex style={{ height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg)' }}>
            <Sidebar onNewChat={onNewChat} />
            <Flex direction="column" style={{ 
                flexGrow: 1, 
                height: '100vh', 
                marginLeft: 'var(--sidebar-width)', 
                width: 'calc(100% - var(--sidebar-width))' 
            }}>
                {/* The main content area will now handle its own header and scrolling */}
                {children}
            </Flex>
        </Flex>
    );
}; 