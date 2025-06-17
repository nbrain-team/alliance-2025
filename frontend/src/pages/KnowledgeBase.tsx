import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { Checkbox, IconButton } from '@radix-ui/themes';
import { TrashIcon } from '@radix-ui/react-icons';
import axios from 'axios';

// Define an interface for the document structure
interface Document {
    name: string;
    type: string;
    status: string;
}

const KnowledgeBase = () => {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [docType, setDocType] = useState('brand_content');
    const [url, setUrl] = useState('');
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
    const [query, setQuery] = useState('');
    const [queryResponse, setQueryResponse] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');

    // --- Data Fetching ---
    const { data: documents = [], isLoading: isLoadingDocs } = useQuery<Document[]>({
        queryKey: ['documents'],
        queryFn: async () => {
            const response = await api.get('/documents');
            return response.data;
        }
    });

    // --- Mutations ---
    const uploadMutation = useMutation({
        mutationFn: async (uploadFile: File) => {
            // 1. Get pre-signed URL
            setUploadStatus('Getting upload link...');
            const presignedUrlResponse = await api.post('/generate-upload-url', {
                file_name: uploadFile.name,
                content_type: uploadFile.type,
            });
            
            const { upload_url, file_name } = presignedUrlResponse.data;

            // 2. Upload file to GCS
            setUploadStatus('Uploading file...');
            await axios.put(upload_url, uploadFile, {
                headers: { 'Content-Type': uploadFile.type },
            });

            // 3. Notify backend
            setUploadStatus('Processing file...');
            const notifyResponse = await api.post('/notify-upload', {
                file_name: file_name,
                content_type: uploadFile.type,
                doc_type: docType,
            });
            
            return notifyResponse.data;
        },
        onSuccess: () => {
            setUploadStatus('Upload successful! Refreshing list...');
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            setFile(null);
            // Clear the success message after a few seconds
            setTimeout(() => {
                setUploadStatus('');
            }, 5000);
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.detail || "Upload failed";
            setUploadStatus(`Error: ${errorMessage}`);
        },
    });
    
    const deleteMutation = useMutation({
        mutationFn: (fileName: string) => {
            return api.delete(`/documents/${fileName}`);
        },
        onSuccess: (_data, fileName) => {
            alert(`Document "${fileName}" deleted successfully!`);
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        },
        onError: (error: any, fileName) => {
            const errorMessage = error.response?.data?.detail || "Deletion failed";
            alert(`Error deleting "${fileName}": ${errorMessage}`);
        },
    });
    
    const queryMutation = useMutation({
        mutationFn: (variables: { query: string; file_names: string[] }) => {
            const { query, file_names } = variables;
            const params = new URLSearchParams();
            params.append('query', query);
            file_names.forEach(name => params.append('file_names', name));
            return api.post('/query', params);
        },
        onSuccess: (data) => {
            setQueryResponse(data.data.answer);
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.detail || "Query failed";
            setQueryResponse(`Error: ${errorMessage}`);
        },
    });

    // --- Event Handlers ---
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
        uploadMutation.mutate(file);
    };
    
    const handleCrawlSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        alert('Crawling functionality is not yet implemented.');
    };

    const handleDocSelectionChange = (fileName: string, isSelected: boolean) => {
        if (isSelected) {
            setSelectedDocs(prev => [...prev, fileName]);
        } else {
            setSelectedDocs(prev => prev.filter(name => name !== fileName));
        }
    };
    
    const handleQuerySubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!query.trim()) {
            alert("Please enter a question.");
            return;
        }
        if (selectedDocs.length === 0) {
            alert("Please select at least one document to query.");
            return;
        }
        queryMutation.mutate({ query, file_names: selectedDocs });
    };

    return (
        <div style={{ height: '100vh', overflowY: 'auto' }}>
            <style>{STYLES}</style>
            
            {/* --- Header --- */}
            <div
                style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--header-bg)',
                    boxShadow: 'var(--shadow)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <h1 style={{ 
                    fontSize: '1.75rem', 
                    color: 'var(--primary)',
                    fontWeight: 600,
                    margin: 0
                }}>Knowledge Base</h1>
            </div>

            {/* --- Main Content --- */}
            <div className="knowledge-base-container">
                <section className="management-section">
                    <h2>Add to Knowledge Base</h2>
                    <div className="upload-area">
                        {/* File Upload Form */}
                        <form onSubmit={handleUploadSubmit} className="form-group">
                            <label htmlFor="file-input">Upload a Document</label>
                            <input type="file" id="file-input" onChange={handleFileChange} key={file ? file.name : ''} />
                            <label htmlFor="doc-type-upload">Document Type</label>
                            <select id="doc-type-upload" value={docType} onChange={e => setDocType(e.target.value)}>
                                <option value="brand_content">Brand Content</option>
                                <option value="industry_data">Industry Data</option>
                                <option value="sop_best_practices">SOP Documents / Best Practices</option>
                                <option value="other">Other</option>
                            </select>
                            <button type="submit" className="submit-btn" disabled={uploadMutation.isPending || !!uploadStatus}>
                                {uploadMutation.isPending || uploadStatus ? uploadStatus : 'Upload File'}
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
                                <th><Checkbox disabled/></th>
                                <th>Title / Source</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingDocs ? (
                                <tr><td colSpan={5}>Loading documents...</td></tr>
                            ) : (
                                documents.map(doc => (
                                    <tr 
                                        key={doc.name} 
                                        onClick={() => handleDocSelectionChange(doc.name, !selectedDocs.includes(doc.name))}
                                        style={{ 
                                            cursor: 'pointer',
                                            backgroundColor: selectedDocs.includes(doc.name) ? 'var(--blue-2)' : 'transparent'
                                        }}
                                    >
                                        <td>
                                            <Checkbox 
                                                checked={selectedDocs.includes(doc.name)}
                                                onCheckedChange={(checked) => handleDocSelectionChange(doc.name, !!checked)} 
                                            />
                                        </td>
                                        <td>{doc.name}</td>
                                        <td>{doc.type}</td>
                                        <td>
                                            <span className={`status status-ready`}>
                                                {doc.status}
                                            </span>
                                        </td>
                                        <td>
                                            <IconButton 
                                                variant="ghost" 
                                                color="red" 
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevents the row's onClick from firing
                                                    deleteMutation.mutate(doc.name);
                                                }} 
                                                disabled={deleteMutation.isPending}
                                            >
                                                <TrashIcon />
                                            </IconButton>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                     <form onSubmit={handleQuerySubmit}>
                        <div className="query-area">
                            <h3>Query Selected Documents</h3>
                            <div className="query-controls">
                                <input 
                                    type="text" 
                                    id="query-input" 
                                    placeholder="Ask a question to the selected documents..." 
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                />
                                <button id="query-btn" type="submit" className="submit-btn" disabled={queryMutation.isPending || selectedDocs.length === 0}>
                                    {queryMutation.isPending ? 'Asking...' : 'Ask'}
                                </button>
                            </div>
                            <div id="query-response">
                                <p>{queryMutation.isPending ? 'Thinking...' : queryResponse || 'Your answer will appear here...'}</p>
                            </div>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
};

const STYLES = `
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