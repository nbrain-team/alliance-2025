import { Box, Card, Text, Button, Flex, TextArea, Select, Spinner, Checkbox, Heading, Grid } from '@radix-ui/themes';
import { UploadIcon, DownloadIcon } from '@radix-ui/react-icons';
import { useState, useRef, ChangeEvent } from 'react';
import Papa from 'papaparse';

// A modern, reusable file input component
const FileInput = ({ onFileSelect, disabled }: { onFileSelect: (file: File) => void, disabled: boolean }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
        inputRef.current?.click();
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onFileSelect(file);
        }
    };

    return (
        <Box>
            <input
                type="file"
                accept=".csv"
                ref={inputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={disabled}
            />
            <Button onClick={handleClick} disabled={disabled} style={{ width: '100%', cursor: disabled ? 'not-allowed' : 'pointer' }}>
                <Flex align="center" gap="2">
                    <UploadIcon />
                    <Text>Upload CSV</Text>
                </Flex>
            </Button>
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

    const openBraces = '{{';
    const closeBraces = '}}';

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
        
        if (isPreview) {
            formData.append('preview', 'true');
        }

        try {
            const response = await fetch('/api/generator/process', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Network response was not ok: ${errorText}`);
            }
            
            if (isPreview) {
                const data = await response.json();
                setPreviewContent(data.preview_content);
            } else {
                const data = await response.json();
                setFinalCsv(data.csv_content);
                setCurrentStep(5);
            }
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
            alert(`An error occurred during generation: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (finalCsv) {
            const blob = new Blob([finalCsv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'personalized_output.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const placeholderText = `Example: Hi ${openBraces}FirstName${closeBraces}, I saw you work at ${openBraces}CompanyName${closeBraces} and wanted to reach out...`;

    return (
        <Card>
            <Flex direction="column" gap="4">
                {/* Step 1: Upload */}
                <Box>
                    <Heading as="h2" size="4" mb="1">Step 1: Upload Your Data</Heading>
                    <Text as="p" size="2" color="gray" mb="3">
                        Upload a CSV file with your customer data. Make sure it has a header row.
                    </Text>
                    <FileInput onFileSelect={handleFileSelect} disabled={currentStep > 1} />
                    {csvFile && <Text mt="2" size="2" color="green">File selected: {csvFile.name}</Text>}
                </Box>

                {/* Step 2: Map Columns */}
                {currentStep >= 2 && (
                    <Box>
                        <Heading as="h2" size="4" mb="1" mt="4">Step 2: Select Key Fields</Heading>
                        <Text as="p" size="2" color="gray" mb="3">
                            {`These fields will be used for direct replacements (e.g., \`${openBraces}FirstName${closeBraces}\`). All other columns will be used by the AI as context.`}
                        </Text>
                        <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="3">
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
                            placeholder={placeholderText}
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
                                    </Select.Content>
                                </Select.Root>
                            </Box>
                            <Box>
                                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>Style</Text>
                                <Select.Root value={style} onValueChange={setStyle}>
                                    <Select.Trigger />
                                    <Select.Content>
                                        <Select.Item value="Paragraph">Paragraph</Select.Item>
                                        <Select.Item value="Bullet Points">Bullet Points</Select.Item>
                                    </Select.Content>
                                </Select.Root>
                            </Box>
                        </Flex>
                        <Button onClick={() => handleGenerate(true)} disabled={isLoading || !coreContent} mt="3">
                            {isLoading ? <Spinner /> : 'Preview First Row'}
                        </Button>
                    </Box>
                )}

                {/* Step 4: Preview */}
                {previewContent && (
                    <Box>
                        <Heading as="h2" size="4" mb="1" mt="4">Step 4: Preview</Heading>
                        <Card>
                            <Text size="2">{previewContent}</Text>
                        </Card>
                        <Button onClick={() => handleGenerate(false)} disabled={isLoading} mt="3">
                            {isLoading ? <Spinner /> : 'Looks Good! Generate Full CSV'}
                        </Button>
                    </Box>
                )}

                {/* Step 5: Download */}
                {currentStep === 5 && finalCsv && (
                    <Box>
                        <Heading as="h2" size="4" mb="1" mt="4">Step 5: Download Your File</Heading>
                        <Text as="p" size="2" color="gray" mb="3">
                            Your personalized CSV is ready.
                        </Text>
                        <Button onClick={handleDownload}>
                            <DownloadIcon />
                            Download Personalized CSV
                        </Button>
                    </Box>
                )}
            </Flex>
        </Card>
    );
}; 