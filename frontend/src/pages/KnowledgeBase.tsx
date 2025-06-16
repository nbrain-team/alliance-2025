import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Box, Flex, Text, Heading, Card, Inset } from '@radix-ui/themes';
import { UploadIcon, FileIcon, CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import { useNavigate } from 'react-router-dom';

interface UploadedFile {
    file: File;
    status: 'pending' | 'uploading' | 'success' | 'error';
    errorMessage?: string;
}

const KnowledgeBase = () => {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const navigate = useNavigate();

    const uploadMutation = useMutation({
        mutationFn: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return axios.post('http://localhost:8000/upload', formData);
        },
        onSuccess: (_data, file) => {
            setUploadedFiles(prevFiles =>
                prevFiles.map(f => f.file === file ? { ...f, status: 'success' } : f)
            );
        },
        onError: (error: any, file) => {
            const errorMessage = error.response?.data?.detail || "Upload failed";
            setUploadedFiles(prevFiles =>
                prevFiles.map(f => f.file === file ? { ...f, status: 'error', errorMessage } : f)
            );
        },
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
            file,
            status: 'uploading',
        }));

        setUploadedFiles(prevFiles => [...prevFiles, ...newFiles]);

        newFiles.forEach(file => {
            uploadMutation.mutate(file.file);
        });
    }, [uploadMutation]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt'],
            'video/mp4': ['.mp4'],
            'video/quicktime': ['.mov'],
            'video/x-msvideo': ['.avi'],
        }
    });

    return (
        <Flex direction="column" style={{ height: '100vh', width: '100vw' }}>
             <style>{STYLES}</style>
            {/* --- Header --- */}
            <Flex
                align="center"
                justify="between"
                style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--header-bg)',
                }}
            >
                <Heading size="6" style={{ color: 'var(--primary)' }}>Knowledge Base</Heading>
                 <button className="sidebar-icon-placeholder" title="Back to Chat" onClick={() => navigate('/')}>
                    Back to Chat
                </button>
            </Flex>

            {/* --- Main Content --- */}
            <Flex style={{ flexGrow: 1, padding: '2rem' }}>
                <Card size="4" style={{ width: '100%' }}>
                    <Inset>
                        <Box {...getRootProps()} style={dropzoneStyles(isDragActive)}>
                            <input {...getInputProps()} />
                            <Flex direction="column" align="center" gap="3">
                                <UploadIcon width="48" height="48" color="var(--gray)" />
                                <Text>Drag & drop files here, or click to select files</Text>
                                <Text size="2" color="gray">Supported formats: PDF, DOCX, TXT, MP4, MOV, AVI</Text>
                            </Flex>
                        </Box>
                    </Inset>

                    {uploadedFiles.length > 0 && (
                        <Box mt="4">
                            <Heading size="4" mb="3">Uploads</Heading>
                            <Flex direction="column" gap="3">
                                {uploadedFiles.map((uploadedFile, index) => (
                                    <FileStatus key={index} {...uploadedFile} />
                                ))}
                            </Flex>
                        </Box>
                    )}
                </Card>
            </Flex>
        </Flex>
    );
};

const FileStatus = ({ file, status, errorMessage }: UploadedFile) => (
    <Card>
        <Flex align="center" justify="between">
            <Flex align="center" gap="3">
                <FileIcon width="24" height="24" />
                <Text>{file.name}</Text>
            </Flex>
            <Flex align="center" gap="2">
                {status === 'uploading' && <Text color="gray">Uploading...</Text>}
                {status === 'success' && <CheckCircledIcon width="24" height="24" color="green" />}
                {status === 'error' && (
                     <Flex align="center" gap="2">
                        <CrossCircledIcon width="24" height="24" color="red" />
                        <Text color="red" size="2">{errorMessage}</Text>
                    </Flex>
                )}
            </Flex>
        </Flex>
    </Card>
);

const dropzoneStyles = (isDragActive: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    border: '2px dashed var(--gray-light)',
    borderRadius: 'var(--radius)',
    backgroundColor: isDragActive ? 'var(--primary-light)' : 'var(--gray-light)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    minHeight: '200px',
    textAlign: 'center',
});

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
  }
    .sidebar-icon-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
    border-radius: var(--radius);
    cursor: pointer;
    transition: background-color 0.2s, color 0.2s;
    color: var(--icon-color);
    width: auto;
    height: 48px;
    background: none;
    border: none;
    font-weight: bold;
  }
  .sidebar-icon-placeholder:hover {
    background-color: var(--primary-light);
    color: var(--primary);
  }
`;


export default KnowledgeBase; 