import { Box, Card, Text, Button, Flex, TextArea, Select, Spinner, Checkbox, Heading, Grid } from '@radix-ui/themes';
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
    const [keyFields, setKeyFields] = useState<string[]>([]);
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
                    // Reset key fields on new file upload
                    setKeyFields([]);
                    setCurrentStep(2);
                }
            }
        });
    };

    const handleKeyFieldChange = (header: string, checked: boolean) => {
        setKeyFields(prev =>
            checked ? [...prev, header] : prev.filter(f => f !== header)
        );
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
        formData.append('key_fields', JSON.stringify(keyFields));
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
                        <Heading as="h2" size="4" mb="1">
                            Step 2: Identify Key Fields for Direct Replacement
                        </Heading>
                        <Text as="p" size="2" color="gray" mb="3">
                            Select fields for simple placeholder replacement (e.g., `{{FirstName}}`). The AI will use all other fields as context to intelligently rewrite the rest.
                        </Text>
                        <Grid columns="3" gap="3">
                            {csvHeaders.map(header => (
                                <Text as="label" size="2" key={header}>
                                    <Flex gap="2" align="center">
                                        <Checkbox
                                            checked={keyFields.includes(header)}
                                            onCheckedChange={(checked) => handleKeyFieldChange(header, checked as boolean)}
                                        />
                                        {header}
                                    </Flex>
                                </Text>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* Step 3: Create Content */}
                {currentStep >= 2 && (
                    <Box>
                        <Heading as="h2" size="4" mb="1" mt="4">
                            Step 3: Write Your Smart Template
                        </Heading>
                        <Text as="p" size="2" color="gray" mb="3">
                            Write your core message. Use placeholders for the Key Fields you selected above.
                        </Text>
                        <TextArea
                            placeholder="Write your smart template here..."
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
                        <Heading as="h2" size="4" mb="1" mt="4">
                            Step 4: Preview First Result
                        </Heading>
                        <Text as="p" size="2" color="gray" mb="3">
                            This is the AI-personalized content for the first row of your data.
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
                        <Heading as="h2" size="4" mb="1" mt="4">
                            Step 5: Download Your File
                        </Heading>
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