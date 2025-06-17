import { useState, useEffect, useRef } from 'react';
import { Box, Flex, Text, Button, Table, Badge, Heading, TextField } from '@radix-ui/themes';

interface Document {
    name: string;
    type: string;
    status: string;
}

const AdminPage = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [docType, setDocType] = useState('General');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const API_URL = import.meta.env.VITE_API_BASE_URL;

    // Fetch documents on component mount
    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const response = await fetch(`${API_URL}/documents`);
            if (!response.ok) throw new Error('Failed to fetch documents.');
            const data = await response.json();
            setDocuments(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Please select a file to upload.');
            return;
        }
        setUploading(true);
        setError(null);

        try {
            // 1. Get a pre-signed URL from the backend
            const presignResponse = await fetch(`${API_URL}/generate-upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_name: selectedFile.name,
                    content_type: selectedFile.type,
                }),
            });
            if (!presignResponse.ok) throw new Error('Failed to get upload URL.');
            const presignData = await presignResponse.json();

            // 2. Upload the file directly to GCS using the signed URL
            const gcsResponse = await fetch(presignData.upload_url, {
                method: 'PUT',
                headers: { 'Content-Type': selectedFile.type },
                body: selectedFile,
            });
            if (!gcsResponse.ok) throw new Error('Failed to upload file to storage.');

            // 3. Notify the backend that the upload is complete for processing
            const notifyResponse = await fetch(`${API_URL}/notify-upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_name: selectedFile.name,
                    content_type: selectedFile.type,
                    doc_type: docType,
                }),
            });
            if (!notifyResponse.ok) throw new Error('Failed to notify backend.');

            alert('File uploaded successfully! It will be processed in the background.');
            setSelectedFile(null);
            // Optimistically add to UI or refetch
            setTimeout(fetchDocuments, 2000); // Give backend a moment before refetching

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during upload.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fileName: string) => {
        if (!confirm(`Are you sure you want to delete ${fileName}? This action cannot be undone.`)) {
            return;
        }
        setError(null);
        try {
            const response = await fetch(`${API_URL}/documents/${encodeURIComponent(fileName)}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.detail || 'Failed to delete document.');
            }
            alert('Document deleted successfully.');
            fetchDocuments();
        } catch (err) {
             setError(err instanceof Error ? err.message : 'An unknown error occurred during deletion.');
        }
    };


    return (
        <Box p="6">
            <Heading size="7" mb="5">Manage Knowledge Base</Heading>

            {error && <Text color="red" mb="4">{error}</Text>}

            <Flex direction="column" gap="4" mb="6">
                <Heading size="4">Upload New Document</Heading>
                
                {/* Hidden file input, controlled by the button */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                <Flex gap="3" align="center">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} style={{ flexShrink: 0 }}>
                        Choose File
                    </Button>
                    {selectedFile && <Text size="2" color="gray">{selectedFile.name}</Text>}
                </Flex>

                <TextField.Root placeholder="Document Type (e.g., 'FAQ', 'Manual')" value={docType} onChange={(e) => setDocType(e.target.value)}>
                </TextField.Root>
                <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
                    {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
            </Flex>

            <Heading size="4" mb="3">Uploaded Documents</Heading>
            <Table.Root variant="surface">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell>File Name</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {documents.length > 0 ? documents.map(doc => (
                        <Table.Row key={doc.name}>
                            <Table.Cell>{doc.name}</Table.Cell>
                            <Table.Cell>{doc.type}</Table.Cell>
                            <Table.Cell><Badge color="green">{doc.status}</Badge></Table.Cell>
                            <Table.Cell>
                                <Button color="red" variant="soft" onClick={() => handleDelete(doc.name)}>Delete</Button>
                            </Table.Cell>
                        </Table.Row>
                    )) : (
                        <Table.Row>
                            <Table.Cell colSpan={4} align="center">No documents found.</Table.Cell>
                        </Table.Row>
                    )}
                </Table.Body>
            </Table.Root>
        </Box>
    );
};

export default AdminPage; 