import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Box, Flex, Text, Heading, Card, Inset, Select, TextField, Button, Checkbox, IconButton } from '@radix-ui/themes';
import { useNavigate } from 'react-router-dom';
import { TrashIcon } from '@radix-ui/react-icons';

const KnowledgeBase = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [docType, setDocType] = useState('brand_content');
    const [url, setUrl] = useState('');

    // Dummy data for the library
    const [documents, setDocuments] = useState([
        { id: 1, name: 'Q4_2023_Earnings_Call.pdf', type: 'Brand Content', status: 'Ready' },
        { id: 2, name: 'Competitor_Analysis_Report.docx', type: 'Industry Data', status: 'Ready' },
        { id: 3, name: 'https://www.some-industry-report.com', type: 'Industry Data', status: 'Processing' },
    ]);

    const uploadMutation = useMutation({
        mutationFn: (formData: FormData) => {
            return axios.post('http://localhost:8000/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: (data) => {
            console.log('Upload successful:', data);
            // Here you would add the new document to the list
            // For now, just show a success message or clear the form
            alert('File uploaded successfully!');
            setFile(null);
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.detail || "Upload failed";
            alert(`Error: ${errorMessage}`);
        },
    });

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };

    const handleUploadSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!file) {
            alert('Please select a file to upload.');
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('doc_type', docType); // Example of sending extra data
        uploadMutation.mutate(formData);
    };

    const handleCrawlSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        alert('Crawling functionality is not yet implemented.');
    };

    return (
        <Flex direction="column" style={{ minHeight: '100vh', background: 'var(--bg)'}}>
            <style>{STYLES}</style>
            
            {/* --- Header --- */}
            <Flex
                align="center"
                justify="between"
                style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--header-bg)',
                    boxShadow: 'var(--shadow)',
                }}
            >
                <Heading size="6" style={{ color: 'var(--primary)' }}>Knowledge Base</Heading>
                <Button variant="soft" onClick={() => navigate('/')}>Back to Chat</Button>
            </Flex>

            {/* --- Main Content --- */}
            <div className="knowledge-base-container">
                <section className="management-section">
                    <h2>Add to Knowledge Base</h2>
                    <div className="upload-area">
                        {/* File Upload Form */}
                        <form onSubmit={handleUploadSubmit} className="form-group">
                            <label htmlFor="file-input">Upload a Document</label>
                            <input type="file" id="file-input" onChange={handleFileChange} />
                            <label htmlFor="doc-type-upload">Document Type</label>
                            <select id="doc-type-upload" value={docType} onChange={e => setDocType(e.target.value)}>
                                <option value="brand_content">Brand Content</option>
                                <option value="industry_data">Industry Data</option>
                                <option value="sop_best_practices">SOP Documents / Best Practices</option>
                                <option value="other">Other</option>
                            </select>
                            <button type="submit" className="submit-btn" disabled={uploadMutation.isPending}>
                                {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
                            </button>
                        </form>
                        <div className="divider"></div>
                        {/* URL Crawl Form */}
                        <form onSubmit={handleCrawlSubmit} className="form-group">
                            <label htmlFor="url-input">Crawl a Website</label>
                            <input type="text" id="url-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
                            <label htmlFor="doc-type-crawl">Document Type</label>
                            <select id="doc-type-crawl">
                                <option value="brand_content">Brand Content</option>
                                <option value="industry_data">Industry Data</option>
                                <option value="sop_best_practices">SOP Documents / Best Practices</option>
                                <option value="other">Other</option>
                            </select>
                            <button type="submit" className="submit-btn" disabled>Crawl URL</button>
                        </form>
                    </div>
                </section>

                <section className="library-section">
                    <h2>Document Library</h2>
                    <input type="text" id="library-search-input" className="search-input" placeholder="Search library..." style={{ backgroundColor: 'white', marginBottom: '1.5rem' }} />
                    <table id="document-table">
                        <thead>
                            <tr>
                                <th><Checkbox id="select-all-checkbox" /></th>
                                <th>Title / Source</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map(doc => (
                                <tr key={doc.id}>
                                    <td><Checkbox /></td>
                                    <td>{doc.name}</td>
                                    <td>{doc.type}</td>
                                    <td>
                                        <span className={`status ${doc.status === 'Ready' ? 'status-ready' : 'status-processing'}`}>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td>
                                        <IconButton variant="ghost" color="red" disabled>
                                            <TrashIcon />
                                        </IconButton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="query-area">
                        <h3>Query Selected Documents</h3>
                        <div className="query-controls">
                            <input type="text" id="query-input" placeholder="Ask a question to the selected documents..." />
                            <button id="query-btn" className="submit-btn" disabled>Ask</button>
                        </div>
                        <div id="query-response">
                            <p>Your answer will appear here...</p>
                        </div>
                    </div>
                </section>
            </div>
        </Flex>
    );
};

const STYLES = `
    :root {
        --primary: #313d74;
        --primary-light: #e8eaf6;
        --bg: #f7fafd;
        --sidebar-bg: #ffffff;
        --sidebar-width: 125px;
        --card-bg: #fff;
        --shadow: 0 2px 16px rgba(0,0,0,0.06);
        --border: #e5e7eb;
        --radius: 14px;
        --gray: #64748b;
        --gray-light: #f1f5f9;
        --accent: #313d74;
        --text-primary: #222;
        --text-secondary: #4b5563;
        --header-bg: #ffffff;
        --icon-color: #6b7280;
        --warning: #f59e0b;
        --success: #10b981;
        --danger: #ef4444;
    }
    .knowledge-base-container {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        padding: 1.5rem;
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
    }
    .management-section, .library-section {
        background: var(--card-bg);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        border: 1px solid var(--border);
        padding: 1.5rem 2rem;
    }
    h2 {
        font-size: 1.5rem;
        color: var(--primary);
        font-weight: 600;
        margin-top: 0;
        margin-bottom: 1.5rem;
    }
    .upload-area {
        display: flex;
        gap: 2rem;
        align-items: flex-start;
    }
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        flex: 1;
    }
    .form-group label {
        font-weight: 500;
        color: var(--text-primary);
    }
    .form-group input[type="text"], .form-group input[type="file"], .form-group select {
        width: 100%;
        padding: 0.6rem 0.8rem;
        font-size: 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        box-sizing: border-box;
        background-color: #fff;
    }
    .form-group input:focus, .form-group select:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 2px var(--primary-light);
    }
    .submit-btn {
        padding: 0.7rem 1.5rem;
        border: none;
        background-color: var(--primary);
        color: white;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        align-self: flex-start;
        margin-top: 0.5rem;
    }
    .submit-btn:hover:not(:disabled) {
        background-color: #222b54;
    }
    .submit-btn:disabled {
        background-color: var(--gray-light);
        color: var(--gray);
        cursor: not-allowed;
    }
    .divider {
        border-left: 1px solid var(--border);
        align-self: stretch;
        margin: 0 1rem;
    }
    #document-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1.5rem;
    }
    #document-table th, #document-table td {
        border-bottom: 1px solid var(--border);
        padding: 0.8rem 1rem;
        text-align: left;
        vertical-align: middle;
    }
    #document-table th {
        font-weight: 600;
        color: var(--text-secondary);
        background-color: var(--gray-light);
    }
    #document-table tr:last-child td {
        border-bottom: none;
    }
    #document-table td .status {
        padding: 0.2rem 0.5rem;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        display: inline-block;
    }
    .status-processing { background-color: var(--warning); color: white; }
    .status-ready { background-color: var(--success); color: white; }
    
    .search-input {
        width: 100%;
        padding: 0.6rem 0.8rem;
        font-size: 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        box-sizing: border-box;
    }

    .query-area {
        margin-top: 2rem;
        border-top: 1px solid var(--border);
        padding-top: 1.5rem;
    }
    .query-controls {
        display: flex;
        gap: 1rem;
    }
    #query-input {
        flex-grow: 1;
        padding: 0.6rem 0.8rem;
        font-size: 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
    }
    #query-response {
        margin-top: 1.5rem;
        padding: 1rem;
        background-color: var(--bg);
        border-radius: 8px;
        border: 1px solid var(--border);
        min-height: 50px;
        white-space: pre-wrap;
    }
`;

export default KnowledgeBase; 