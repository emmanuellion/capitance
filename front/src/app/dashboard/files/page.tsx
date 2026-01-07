'use client';

import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fileApi, FileInfo } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, RefreshCw, Trash2, FileText, Calendar, HardDrive } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';

export default function FilesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch files with TanStack Query
  const { data: filesData, isLoading, error, refetch } = useQuery({
    queryKey: ['files', user?._id],
    queryFn: () => fileApi.getFiles(user!._id),
    enabled: !!user,
  });

  // Sort files by upload date (memoized)
  const files = useMemo(() => {
    if (!filesData) return [];

    return [...filesData].sort((a: FileInfo, b: FileInfo) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [filesData]);

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => fileApi.uploadFile(file),
    onSuccess: () => {
      setSuccess('Fichier importé avec succès');
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['files', user?._id] });
      queryClient.invalidateQueries({ queryKey: ['snapshots', user?._id] });
      queryClient.invalidateQueries({ queryKey: ['timeline', user?._id] });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: () => {
      // Error is handled via mutation.error
    },
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: (filename: string) => fileApi.deleteFile(filename),
    onSuccess: () => {
      setSuccess('Fichier supprimé avec succès');
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['files', user?._id] });
      queryClient.invalidateQueries({ queryKey: ['snapshots', user?._id] });
      queryClient.invalidateQueries({ queryKey: ['timeline', user?._id] });
    },
    onError: () => {
      // Error is handled via mutation.error
    },
  });

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSuccess('');
    uploadMutation.mutate(file);
  }

  function handleDeleteFile(filename: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) {
      return;
    }

    setSuccess('');
    deleteMutation.mutate(filename);
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));

  // Combine error states
  const displayError = error || uploadMutation.error || deleteMutation.error;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 dark:border-slate-700 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Fichiers
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gérez vos imports et snapshots de portefeuille
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {displayError && (
        <Alert variant="destructive">
          <AlertDescription>
            {displayError instanceof Error ? displayError.message : 'Une erreur est survenue'}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950">
          <AlertDescription className="text-green-800 dark:text-green-200">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Card */}
      <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">
            Importer un nouveau fichier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
            <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-700 dark:text-slate-300 mb-2">
              Glissez-déposez votre fichier CSV ici ou cliquez pour sélectionner
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Formats supportés: Boursobank, Fortuneo, Bourse Direct
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              disabled={uploadMutation.isPending}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploadMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Sélectionner un fichier
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">
            Fichiers importés ({files.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">
              Aucun fichier importé pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file._id}
                  className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-white">
                        {file.originalName}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {formatFileSize(file.size)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(file.uploadedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteFile(file.filename)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:border-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </PageTransition>
  );
}
