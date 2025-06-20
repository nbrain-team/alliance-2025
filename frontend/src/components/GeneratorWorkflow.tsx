import { Box, Card, Text, Button, Flex, TextField, TextArea, Select, Spinner } from '@radix-ui/themes';
import { UploadIcon, DownloadIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import Papa from 'papaparse';

// A modern, reusable file input component
const FileInput = ({ onFileSelect, disabled }: { onFileSelect: (file: File) => void, disabled: boolean }) => {
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileName(file.name);
            onFileSelect(file);
        }
    };

    return (
        <Box>
            <label htmlFor="csv-upload" style={{ cursor: 'pointer' }}>
                <Button asChild variant="soft">
                    <span>
                        <UploadIcon width="16" height="16" />
                        Select CSV File
                    </span>
                </Button>
            </label>
            <input
                type="file"
                id="csv-upload"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={disabled}
            />
            {fileName && <Text as="span" size="2" color="gray" style={{ marginLeft: '1rem' }}>{fileName}</Text>}
        </Box>
    );
};


export const GeneratorWorkflow = () => {
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [currentStep, setCurrentStep] = useState(1);
    const [coreContent, setCoreContent] = useState('');
    const [tone, setTone] = useState('Professional');
    const [style, setStyle] = useState('Paragraph');
    const [isLoading, setIsLoading] = useState(false);
    const [previewContent, setPreviewContent] = useState('');
    const [finalCsv, setFinalCsv] = useState<string | null>(null);

    const handleFileSelect = (file: File) => {
        setCsvFile(file);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            preview: 1, // We only need the headers, so we only parse one row
            complete: (results: Papa.ParseResult<Record<string, unknown>>) => {
                if (results.meta.fields) {
                    setCsvHeaders(results.meta.fields);
                    // Pre-fill mappings for convenience
                    const initialMappings = results.meta.fields.reduce((acc: Record<string, string>, field: string) => {
                        acc[field] = `{{${field.replace(/\s+/g, '_')}}}`;
                        return acc;
                    }, {} as Record<string, string>);
                    setMappings(initialMappings);
                    setCurrentStep(2);
                }
            }
        });
    };

    const handleMappingChange = (header: string, value: string) => {
        setMappings(prev => ({ ...prev, [header]: value }));
    };
    
    const handleGenerate = async (isPreview: boolean) => {
        if (!csvFile || !coreContent) {
            alert("Please upload a file and provide the core content.");
            return;
        }

        setIsLoading(true);
        setPreviewContent('');
        setFinalCsv(null);

        const formData = new FormData();
        formData.append('file', csvFile);
        formData.append('mappings', JSON.stringify(mappings));
        formData.append('core_content', coreContent);
        formData.append('tone', tone);
        formData.append('style', style);
        formData.append('is_preview', String(isPreview));

        try {
            const response = await fetch('/api/generator/process', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Something went wrong');
            }

            if (isPreview) {
                const data = await response.json();
                setPreviewContent(data.preview_content);
                setCurrentStep(4); // Move to preview step
            } else {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                setFinalCsv(url); // Set the URL for the download button
                setCurrentStep(5); // Move to download step
            }

        } catch (error) {
            console.error('Generation failed:', error);
            alert(`Error: ${(error as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <Flex direction="column" gap="4">
                {/* Step 1: Upload */}
                <Box>
                    <Text as="label" weight="bold" size="3" mb="1" style={{ display: 'block' }}>
                        Step 1: Upload Your Prospect List
                    </Text>
                    <Text as="p" size="2" color="gray" mb="3">
                        Upload a CSV file containing your prospect data. The file must contain headers.
                    </Text>
                    <FileInput onFileSelect={handleFileSelect} disabled={currentStep > 1} />
                </Box>

                {/* Step 2: Map Columns */}
                {currentStep >= 2 && (
                    <Box>
                        <Text as="label" weight="bold" size="3" mb="1" style={{ display: 'block' }}>
                            Step 2: Map Your Data
                        </Text>
                        <Text as="p" size="2" color="gray" mb="3">
                            Define the placeholders you'll use in your content template.
                        </Text>
                        <Flex direction="column" gap="3">
                            {csvHeaders.map(header => (
                                <Flex key={header} align="center" gap="3">
                                    <Text size="2" style={{ width: '150px' }}>{header}</Text>
                                    <TextField.Root 
                                        value={mappings[header] || ''}
                                        onChange={(e) => handleMappingChange(header, e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                </Flex>
                            ))}
                        </Flex>
                    </Box>
                )}

                {/* Step 3: Create Content */}
                {currentStep >= 2 && (
                    <Box>
                        <Text as="label" weight="bold" size="3" mb="1" style={{ display: 'block' }}>
                            Step 3: Create Your Content
                        </Text>
                        <Text as="p" size="2" color="gray" mb="3">
                            Write your core message using the placeholders you defined above.
                        </Text>
                        <TextArea
                            placeholder="e.g., Hi {{FirstName}}, I saw you work at {{Company}}. I'd love to connect..."
                            value={coreContent}
                            onChange={(e) => setCoreContent(e.target.value)}
                            rows={10}
                            style={{ marginBottom: '1rem' }}
                        />
                        <Flex gap="4" align="center">
                            <Box>
                                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>Tone</Text>
                                <Select.Root value={tone} onValueChange={setTone}>
                                    <Select.Trigger />
                                    <Select.Content>
                                        <Select.Item value="Professional">Professional</Select.Item>
                                        <Select.Item value="Casual">Casual</Select.Item>
                                        <Select.Item value="Enthusiastic">Enthusiastic</Select.Item>
                                        <Select.Item value="Direct">Direct</Select.Item>
                                    </Select.Content>
                                </Select.Root>
                            </Box>
                            <Box>
                                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>Style</Text>
                                <Select.Root value={style} onValueChange={setStyle}>
                                    <Select.Trigger />
                                    <Select.Content>
                                        <Select.Item value="Paragraph">Paragraph</Select.Item>
                                        <Select.Item value="Bulleted List">Bulleted List</Select.Item>
                                    </Select.Content>
                                </Select.Root>
                            </Box>
                        </Flex>
                        <Flex justify="end" mt="4">
                            <Button onClick={() => handleGenerate(true)} disabled={isLoading}>
                                {isLoading ? <Spinner /> : 'Generate Preview'}
                            </Button>
                        </Flex>
                    </Box>
                )}

                {/* Step 4: Preview Content */}
                {currentStep >= 4 && previewContent && (
                    <Box>
                        <Text as="label" weight="bold" size="3" mb="1" style={{ display: 'block' }}>
                            Step 4: Preview First Result
                        </Text>
                        <Text as="p" size="2" color="gray" mb="3">
                            This is the generated content for the first row of your data.
                        </Text>
                        <Card variant="surface" style={{ padding: '1rem', whiteSpace: 'pre-wrap' }}>
                            <Text as="p" size="2">{previewContent}</Text>
                        </Card>
                        <Flex justify="end" mt="4">
                            <Button onClick={() => handleGenerate(false)} disabled={isLoading}>
                                {isLoading ? <Spinner /> : 'Looks Good! Generate & Download Full CSV'}
                            </Button>
                        </Flex>
                    </Box>
                )}

                {/* Step 5: Download */}
                {currentStep === 5 && finalCsv && (
                     <Box>
                        <Text as="label" weight="bold" size="3" mb="1" style={{ display: 'block' }}>
                            Step 5: Download Your File
                        </Text>
                        <Text as="p" size="2" color="gray" mb="3">
                           Your file is ready. Click the button below to download it.
                        </Text>
                        <a href={finalCsv} download="ai_generated_content.csv" style={{ textDecoration: 'none' }}>
                            <Button>
                                <DownloadIcon />
                                Download CSV
                            </Button>
                        </a>
                    </Box>
                )}
            </Flex>
        </Card>
    );
}; 