'use client';

import { useState, useRef, useEffect } from 'react';
import { fileApi, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FileUploadProps {
    onUploadSuccess: () => void;
}

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-clear success message after 3 seconds
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                setSuccess('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                setError('Seuls les fichiers CSV sont acceptés');
                setSelectedFile(null);
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                setError('Le fichier ne doit pas dépasser 10MB');
                setSelectedFile(null);
                return;
            }
            setSelectedFile(file);
            setError('');
        }
    }

    async function handleUpload() {
        if (!selectedFile) {
            setError('Veuillez sélectionner un fichier');
            return;
        }

        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await fileApi.uploadFile(selectedFile);
            setSuccess('Fichier uploadé avec succès !');
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            onUploadSuccess();
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Erreur lors de l\'upload du fichier');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Upload CSV File</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                    Uploadez un nouveau fichier CSV (max 10MB)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950">
                        <AlertDescription className="text-green-800 dark:text-green-200">
                            {success}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="space-y-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileSelect}
                        className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900"
                    />
                    {selectedFile && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Fichier sélectionné: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                        </p>
                    )}
                </div>

                <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                    {loading ? 'Upload en cours...' : 'Upload File'}
                </Button>
            </CardContent>
        </Card>
    );
}
