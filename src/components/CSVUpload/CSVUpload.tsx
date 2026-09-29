import React, { useState } from 'react';
import Papa from 'papaparse';
import { ArrowUpTrayIcon } from '@heroicons/react/20/solid';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Title } from '@/components/Title';
import { toast } from 'sonner';
import '@/components/Button/Button.css';

interface CSVUploadProps {
  vehicleTokenIds: string[];
  onChange: (ids: string[]) => void;
  fileInfo: { name: string; count: number }[];
  onMetadataChange: (files: { name: string; count: number }[]) => void;
  showTitle?: boolean;
  onFileUpload: (file: File) => void;
}
export const CSV_UPLOAD_ROW_TITLE = 'tokenId';

export const CSVUpload: React.FC<CSVUploadProps> = ({
  vehicleTokenIds,
  onChange,
  fileInfo,
  onMetadataChange,
  showTitle = true,
  onFileUpload,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (fileInfo.length > 0) {
      return toast.error('Only one file can be uploaded at a time');
    }

    if (fileInfo.some((f) => f.name === file.name)) {
      return toast.error('Duplicate file upload');
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File exceeds 50MB limit.');
      return;
    }

    if (!file.name.endsWith('.csv')) {
      setError('Only .csv files are supported.');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
      complete: (results) => {
        const { data, errors } = results;

        if (errors.length) {
          setError('Invalid CSV format.');
          return;
        }

        const ids: string[] = [];
        for (const row of data as Record<string, string>[]) {
          const id = row[CSV_UPLOAD_ROW_TITLE];
          if (!id || isNaN(Number(id))) {
            setError('Each row must have a numeric tokenId.');
            return;
          }
          ids.push(id);
        }

        setError(null);
        onMetadataChange([...fileInfo, { name: file.name, count: ids.length }]);
        onChange([...vehicleTokenIds, ...ids]);
        onFileUpload(file);
      },
      error: () => setError('Failed to parse CSV.'),
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      for (let i = 0; i < selectedFiles.length; i++) {
        handleFile(selectedFiles[i]);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        handleFile(e.dataTransfer.files[i]);
      }
    }
  };

  const handleDelete = (index: number) => {
    const removed = fileInfo[index];
    onMetadataChange(fileInfo.filter((_, i) => i !== index));
    const newIds = [...vehicleTokenIds];
    newIds.splice(vehicleTokenIds.length - removed.count, removed.count);
    onChange(newIds);
  };

  return (
    <>
      {fileInfo.length > 0 && (
        <div className="space-y-2 text-left mb-6">
          <Title className="text-card-title">List of vehicles</Title>
          {fileInfo.map((f, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-control px-4 py-3 rounded-control text-fg"
            >
              <span className="text-body-sm">{f.name}</span>
              <div className="flex items-center gap-4 text-body-sm">
                <span className="text-muted">{f.count} vehicles</span>
                <button
                  onClick={() => handleDelete(idx)}
                  className="text-muted transition-colors hover:text-negative"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showTitle && <Title className="text-card-title">Add vehicles</Title>}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-card border border-dashed p-10 text-center mt-2 transition-colors ${
          isDragging ? 'border-outline-strong bg-highest' : 'border-outline'
        }`}
      >
        <p className="text-body font-medium text-ink">
          Drag and drop or upload CSV with a list of vehicle IDs
        </p>
        <p className="text-body-sm text-muted mt-4">
          Please format your CSV with a single column and the header{' '}
          <code className="font-mono text-code">tokenId</code>.
        </p>
        <p className="text-body-sm text-muted mt-4">
          Accepts .csv file types
          <br />
          Maximum file size 50 MB.
        </p>

        {/* sr-only (not display:none) keeps the file input in the tab order;
            the label shows the focus ring while the input has keyboard focus. */}
        <label className="button secondary relative mt-4 cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus-ring">
          <span>
            <ArrowUpTrayIcon className={'w-5 h-5'} />
          </span>
          Upload
          <input
            type="file"
            accept=".csv"
            onChange={handleInputChange}
            className="sr-only"
          />
        </label>

        {error && <p className="mt-6 text-body-sm text-negative">{error}</p>}
      </div>
    </>
  );
};
