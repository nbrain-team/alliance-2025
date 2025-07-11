import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { Checkbox, IconButton, Button, Flex, Heading, Text, Box } from '@radix-ui/themes';
import { TrashIcon, ChevronLeftIcon, ChevronRightIcon, PersonIcon } from '@radix-ui/react-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { properties } from '../constants/properties';

type UploadType = 'files' | 'urls';

// Define an interface for the document structure
interface Document {
    name: string;
    type: string;
    status: string;
}

const KnowledgeBase = () => {
    const queryClient = useQueryClient();
    const [uploadType, setUploadType] = useState<UploadType>('files');
    const [files, setFiles] = useState<FileList | null>(null);
    const [urls, setUrls] = useState('');
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
    const [uploadStatus, setUploadStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedProperty, setSelectedProperty] = useState<{ value: string; label: string; } | null>(null);
    const [librarySelectedProperty, setLibrarySelectedProperty] = useState<{ value: string; label: string; } | null>(null);
    const docsPerPage = 10;
    const [isUploading, setIsUploading] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();

    // --- Data Fetching ---
    const { data: documents = [], isLoading: isLoadingDocs } = useQuery<Document[]>({
        queryKey: ['documents', librarySelectedProperty],
        queryFn: async () => {
            const property = librarySelectedProperty?.value;
            const url = property ? `/documents?property=${encodeURIComponent(property)}` : '/documents';
            const response = await api.get(url);
            return response.data;
        },
        refetchInterval: 30000, // Poll every 30 seconds
    });

    // --- Derived State for Filtering and Pagination ---
    const paginatedDocuments = useMemo(() => {
        const startIndex = (currentPage - 1) * docsPerPage;
        return documents.slice(startIndex, startIndex + docsPerPage);
    }, [documents, currentPage, docsPerPage]);

    const totalPages = Math.ceil(documents.length / docsPerPage);

    // --- Mutations for Uploading ---
    const uploadFilesMutation = useMutation({
        mutationFn: (formData: FormData) => api.post('/upload-files', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
        onSuccess: () => {
            setUploadStatus('File(s) uploaded successfully! Processing in background...');
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            setFiles(null);
            setTimeout(() => setUploadStatus(''), 5000);
        },
        onError: (error: any) => {
            setUploadStatus(`Error: ${error.response?.data?.detail || 'File upload failed'}`);
        },
        onSettled: () => setIsUploading(false),
    });

    const crawlUrlsMutation = useMutation({
        mutationFn: (urlList: string[]) => api.post('/crawl-urls', { urls: urlList }),
        onSuccess: () => {
            setUploadStatus('URLs submitted successfully! Crawling in background...');
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            setUrls('');
        },
        onError: (error: any) => {
            setUploadStatus(`Error: ${error.response?.data?.detail || 'URL submission failed'}`);
        },
        onSettled: () => setIsUploading(false),
    });
    
    // --- Mutation for Deleting ---
    const deleteMutation = useMutation({
        mutationFn: (fileName: string) => api.delete(`/documents/${fileName}`),
        onSuccess: (_data, fileName) => {
            alert(`Document "${fileName}" will be deleted.`);
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        },
        onError: (error: any, fileName) => {
            alert(`Error deleting "${fileName}": ${error.response?.data?.detail || 'Deletion failed'}`);
        },
    });
    
    // --- Event Handlers ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFiles(e.target.files);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        setUploadStatus('Submitting...');

        if (uploadType === 'files') {
            if (!files || files.length === 0) {
                setUploadStatus('Please select one or more files.');
                setIsUploading(false);
                return;
            }
            if (!selectedProperty) {
                setUploadStatus('Please select a property.');
                setIsUploading(false);
                return;
            }
            const formData = new FormData();
            Array.from(files).forEach(file => {
                formData.append('files', file);
            });
            formData.append('property', selectedProperty.value);
            uploadFilesMutation.mutate(formData);
        } else {
            const urlList = urls.split('\n').map(u => u.trim()).filter(u => u);
            if (urlList.length === 0) {
                setUploadStatus('Please enter one or more URLs.');
                setIsUploading(false);
                return;
            }
            crawlUrlsMutation.mutate(urlList);
        }
    };

    const handleDocSelectionChange = (fileName: string, isSelected: boolean) => {
        if (isSelected) {
            setSelectedDocs(prev => [...prev, fileName]);
        } else {
            setSelectedDocs(prev => prev.filter(name => name !== fileName));
        }
    };
    
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <Flex direction="column" style={{ height: '100vh' }}>
            <style>{STYLES}</style>
            
            <Box style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--gray-4)', backgroundColor: 'white',  position: 'sticky', top: 0, zIndex: 1 }}>
                <Heading size="7" style={{ color: 'var(--gray-12)' }}>Knowledge Base</Heading>
                <Text as="p" size="3" style={{ color: 'var(--gray-10)', marginTop: '0.25rem' }}>
                    Search and manage the documents that power the AI chat.
                </Text>
            </Box>

            {/* --- Main Content --- */}
            <div className="knowledge-base-container" style={{ flex: 1, overflowY: 'auto' }}>
                <section className="management-section">
                    <h2>Add to Knowledge Base</h2>
                    <form onSubmit={handleSubmit} className="upload-area">
                        <div className="upload-inputs">
                            <div className="form-group">
                                <label htmlFor="upload-type-select">Upload Type</label>
                                <select 
                                    id="upload-type-select"
                                    value={uploadType} 
                                    onChange={e => setUploadType(e.target.value as UploadType)}
                                >
                                    <option value="files">Upload Files (.txt, .pdf, .docx)</option>
                                    <option value="urls">Crawl URLs</option>
                                </select>
                            </div>

                            {uploadType === 'files' ? (
                                <>
                                    <div className="form-group">
                                        <label>Select Property</label>
                                        <Select
                                            options={properties.map(p => ({ value: p, label: p }))}
                                            value={selectedProperty}
                                            onChange={(selected) => setSelectedProperty(selected as any)}
                                            placeholder="Select a property..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Select Files</label>
                                        <div className="custom-file-input-container">
                                            <input
                                                type="file"
                                                id="file-input"
                                                multiple
                                                onChange={handleFileChange}
                                                className="custom-file-input"
                                            />
                                            <label htmlFor="file-input" className="custom-file-label">
                                                {files ? `${files.length} file(s) chosen` : 'Choose Files'}
                                            </label>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="form-group">
                                    <label htmlFor="url-input">Enter URLs (one per line)</label>
                                    <textarea 
                                        id="url-input"
                                        value={urls} 
                                        onChange={e => setUrls(e.target.value)} 
                                        placeholder="https://example.com/page1&#10;https://anothersite.com/article"
                                        rows={4}
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div className="form-group">
                            <button type="submit" className="submit-btn" disabled={isUploading}>
                                {isUploading ? uploadStatus : 'Submit to Knowledge Base'}
                            </button>
                            {uploadStatus && !isUploading && (
                                <p className="status-message">{uploadStatus}</p>
                            )}
                        </div>
                    </form>
                </section>

                <section className="library-section">
                    <h2>Document Library</h2>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label>Select Property to View Documents</label>
                        <Select
                            options={[{ value: '', label: 'All Properties' }, ...properties.map(p => ({ value: p, label: p }))]}
                            value={librarySelectedProperty}
                            onChange={(selected) => setLibrarySelectedProperty(selected as any)}
                            placeholder="Select a property to view its documents..."
                        />
                    </div>
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
                            ) : paginatedDocuments.length > 0 ? (
                                paginatedDocuments.map(doc => (
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
                            ) : (
                                <tr><td colSpan={5}>No documents found.</td></tr>
                            )}
                        </tbody>
                    </table>
                    {totalPages > 1 && (
                        <div className="pagination-controls">
                            <Button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                variant="soft"
                            >
                                <ChevronLeftIcon /> Previous
                            </Button>
                            <span>
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                variant="soft"
                            >
                                Next <ChevronRightIcon />
                            </Button>
                        </div>
                    )}
                </section>
            </div>
        </Flex>
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
        flex-direction: column;
        gap: 1.5rem;
    }
    .upload-inputs {
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
    .custom-file-input-container {
        display: flex;
        align-items: center;
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 8px;
        box-sizing: border-box;
        background-color: #fff;
    }
    .file-name-display {
        padding: 0.6rem 0.8rem;
        flex-grow: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #555;
    }
    .custom-file-input {
        display: none;
    }
    .custom-file-label {
        padding: 0.6rem 1rem;
        background-color: #f0f0f0;
        cursor: pointer;
        border-right: 1px solid var(--border);
        white-space: nowrap;
        border-top-left-radius: 7px;
        border-bottom-left-radius: 7px;
        transition: background-color 0.2s;
    }
    .custom-file-label:hover {
        background-color: #e0e0e0;
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
        padding: 0.75rem 1rem;
        border-radius: 8px;
        border: 1px solid var(--border);
        font-size: 1rem;
        transition: border-color 0.2s, box-shadow 0.2s;
    }
    .search-input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-translucent);
    }
    .pagination-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1.5rem;
        padding: 1rem;
        background-color: var(--table-header-bg);
        border-radius: 0 0 12px 12px;
        border-top: 1px solid var(--border);
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