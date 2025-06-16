import React, { useState, useRef, useEffect } from 'react';
import { IconButton, TextField } from '@radix-ui/themes';
import { PaperPlaneIcon } from '@radix-ui/react-icons';

interface CommandCenterProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  isLoading: boolean;
}

const Popover = ({ trigger, children, align = 'center' }: { trigger: React.ReactNode, children: React.ReactNode, align?: 'center' | 'left' | 'right' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const node = useRef<HTMLDivElement>(null);

    const handleClickOutside = (e: MouseEvent) => {
        if (node.current?.contains(e.target as Node)) {
            return;
        }
        setIsOpen(false);
    };

    useEffect(() => {
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);
    
    const getAlignmentClass = () => {
        if (align === 'left') return { left: 0 };
        if (align === 'right') return { right: 0 };
        return { left: '50%', transform: 'translateX(-50%)' };
    }

    return (
        <div ref={node} style={{ position: 'relative' }}>
            <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
            {isOpen && (
                <div className="controls-popover" style={getAlignmentClass()}>
                    {children}
                </div>
            )}
        </div>
    );
};


export const CommandCenter = ({ input, onInputChange, onSend, isLoading }: CommandCenterProps) => {

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          if (!isLoading && input.trim() !== '') {
            onSend();
          }
        }
    };

    return (
        <div className="command-center">
            <TextField.Root 
                className="command-center-input" 
                placeholder="Ask a question or type a command..."
                value={input}
                onChange={onInputChange}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
            />
           
            <Popover 
                align="center"
                trigger={
                    <button className="command-center-icon-button" title="Template Agents">
                        <img src="/new-icons/7.png" alt="Template Agents" style={{width:'24px',height:'24px',objectFit:'contain'}} />
                    </button>
                }
            >
                <div className="controls-popover-content">
                    <h4>Template Agents</h4>
                    <div className="scrollable-metric-list">
                        <div className="popover-option" data-template="weekly-report">Weekly Performance Report</div>
                        <div className="popover-option" data-template="traffic-analysis">Traffic Analysis</div>
                        <div className="popover-option" data-template="conversion-funnel">Conversion Funnel Analysis</div>
                        <div className="popover-option" data-template="campaign-summary">Campaign Summary</div>
                        <div className="popover-option" data-template="competitor-analysis">Competitor Analysis</div>
                    </div>
                </div>
            </Popover>

            <Popover 
                align="center"
                trigger={
                    <button className="command-center-icon-button" title="Select Dates">
                        <img src="/new-icons/8.png" alt="Select Dates" style={{width:'24px',height:'24px',objectFit:'contain'}} />
                    </button>
                }
            >
                <div className="controls-popover-content" id="date-controls-popover">
                     <h4>Date Selection</h4>
                    <div style={{minHeight: '250px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem'}}>
                            <span style={{fontSize:'0.95rem'}}>Date Range</span>
                            <label className="switch">
                                <input type="checkbox" id="date-range-toggle" />
                                <span className="slider round"></span>
                            </label>
                            <span id="date-range-toggle-label" style={{fontSize:'0.9rem',color:'#64748b'}}>Off</span>
                        </div>
                        <div className="popover-option" data-date-range="last_7_days">Last 7 Days</div>
                        <div className="popover-option" data-date-range="last_30_days">Last 30 Days</div>
                        <div className="popover-option" data-date-range="this_month">This Month</div>
                        <div className="popover-option" data-date-range="last_month">Last Month</div>
                        <hr />
                        <label className="popover-label">Start Date: <input type="date" id="start-date-picker" /></label>
                        <label className="popover-label">End Date: <input type="date" id="end-date-picker" /></label>
                        <hr />
                        <label className="popover-label"><input type="checkbox" id="compare-period-checkbox" /> Compare to previous period</label>
                        <label className="popover-label" style={{marginTop: '10px'}}><input type="checkbox" id="show-graph" /> Show Graph</label>
                    </div>
                </div>
            </Popover>

             <Popover 
                align="center"
                trigger={
                    <button className="command-center-icon-button" title="Data Sources">
                        <img src="/new-icons/10.png" alt="Data Sources" style={{width:'24px',height:'24px',objectFit:'contain'}} />
                    </button>
                }
            >
                <div className="controls-popover-content">
                    <h4>Data Sources</h4>
                    <div className="scrollable-metric-list">
                        <div className="popover-option" data-source="industryData">Industry Data</div>
                        <div className="popover-option" data-source="clientNBrain">Client nBrain</div>
                        <div className="popover-option" data-source="bestPractices">Best Practices</div>
                    </div>
                </div>
            </Popover>
            
            <IconButton 
                onClick={onSend} 
                disabled={isLoading || input.trim() === ''}
                style={{ 
                    backgroundColor: 'var(--primary)', 
                    color: 'white', 
                    cursor: 'pointer',
                    borderRadius: 'var(--radius)'
                }}
                className="command-center-icon-button"
            >
                <img src="/new-icons/13.png" alt="Send" style={{width:'18px',height:'18px',objectFit:'contain'}} />
            </IconButton>
        </div>
    );
} 