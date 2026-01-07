'use client';

import { Button } from '@/components/ui/button';
import { FileInfo } from '@/lib/api';

interface AnalyticsControlsProps {
  files: FileInfo[];
  selectedFileId: string | 'all';
  onFileSelect: (fileId: string | 'all') => void;
  onReanalyze: () => void;
  loading: boolean;
}

export function AnalyticsControls({
  files,
  selectedFileId,
  onFileSelect,
  onReanalyze,
  loading,
}: AnalyticsControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex-1 w-full sm:w-auto">
        <select
          value={selectedFileId}
          onChange={(e) => onFileSelect(e.target.value)}
          className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white cursor-pointer transition-colors"
        >
          <option value="all">Tous les fichiers (agrégé)</option>
          {files.map((file) => (
            <option key={file._id} value={file._id}>
              {file.originalName}
            </option>
          ))}
        </select>
      </div>

      <Button
        onClick={onReanalyze}
        disabled={loading}
        variant="outline"
        className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-all"
      >
        {loading ? 'Analyse...' : 'Réanalyser'}
      </Button>
    </div>
  );
}
