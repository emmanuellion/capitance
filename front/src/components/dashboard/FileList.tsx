'use client';

import { useState } from 'react';
import { fileApi, ApiError, FileInfo } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FileListProps {
    files: FileInfo[];
    onDeleteSuccess: () => void;
}

export function FileList({ files, onDeleteSuccess }: FileListProps) {
    const [error, setError] = useState<string>('');
    const [deletingFile, setDeletingFile] = useState<string | null>(null);

    async function handleDelete(filename: string, originalName: string) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer "${originalName}" ?`)) {
            return;
        }

        setError('');
        setDeletingFile(filename);

        try {
            await fileApi.deleteFile(filename);
            onDeleteSuccess();
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Erreur lors de la suppression du fichier');
            }
        } finally {
            setDeletingFile(null);
        }
    }

    function formatDate(date: Date) {
        return new Date(date).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    function formatSize(bytes: number) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    return (
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Mes Fichiers CSV</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                    {files.length === 0 ? 'Aucun fichier uploadé' : `${files.length} fichier(s) uploadé(s)`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {files.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        Aucun fichier uploadé. Commencez par uploader un fichier CSV.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {files.map((file) => (
                            <div
                                key={file._id}
                                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-default"
                            >
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {file.originalName}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {formatSize(file.size)} • Uploadé le {formatDate(file.uploadedAt)}
                                    </p>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(file.filename, file.originalName)}
                                    disabled={deletingFile === file.filename}
                                    className="ml-4 hover:scale-105 transition-all cursor-pointer"
                                >
                                    {deletingFile === file.filename ? 'Suppression...' : 'Supprimer'}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
