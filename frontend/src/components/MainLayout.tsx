import { Box, Flex } from "@radix-ui/themes";
import { Sidebar } from "./Sidebar";
import React from "react";
import { useAuth } from '../context/AuthContext';
import { PersonIcon } from '@radix-ui/react-icons';
import { useNavigate } from 'react-router-dom';

interface MainLayoutProps {
    children: React.ReactNode;
    onNewChat: () => void;
}

export const MainLayout = ({ children, onNewChat }: MainLayoutProps) => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <Flex style={{ height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg)' }}>
            <Sidebar onNewChat={onNewChat} />
            <Box style={{ 
                flexGrow: 1, 
                height: '100vh', 
                marginLeft: 'var(--sidebar-width)', 
                width: 'calc(100% - var(--sidebar-width))' 
            }}>
                <Flex justify="end" style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--header-bg)' }}>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                        <PersonIcon width="22" height="22" />
                    </button>
                </Flex>
                <main style={{ height: 'calc(100vh - 50px)', overflowY: 'auto' }}>
                    {children}
                </main>
            </Box>
        </Flex>
    );
}; 