import React, { useContext, useState } from 'react';
import Papa from 'papaparse';
import { ArrowUpTrayIcon } from '@heroicons/react/20/solid';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Title } from '@/components/Title';
import { NotificationContext } from '@/context/notificationContext';

interface CSVUploadProps {
  vehicleTokenIds: string[];
  onChange: (ids: string[]) => void;
  fileInfo: { name: string; count: number }[];
  onMetadataChange: (files: { name: string; count: number }[]) => void;
  showTitle?: boolean;
}
export const CSV_UPLOAD_ROW_TITLE = 'tokenId';

export const CSVUpload: React.FC<CSVUploadProps> = ({
  vehicleTokenIds,
  onChange,
  fileInfo,
  onMetadataChange,
  showTitle = true,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { setNotification } = useContext(NotificationContext);

  const handleFile = (file: File) => {
    if (fileInfo.some((f) => f.name === file.name)) {
      return setNotification('Duplicate file upload', '', 'error');
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
          <Title className="text-sm font-medium">List of vehicles</Title>
          {fileInfo.map((f, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-[#2A2A2A] px-4 py-3 rounded-lg text-white"
            >
              <span className="text-sm">{f.name}</span>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400">{f.count} vehicles</span>
                <button onClick={() => handleDelete(idx)} className="hover:text-red-400">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showTitle && <Title className="text-sm font-medium">Add vehicles</Title>}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border border-dashed rounded-md p-10 text-center mt-2 transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <p className="font-black">
          Drag and drop or upload CSV with a list of vehicle IDs
        </p>
        <p className="text-sm text-white mt-4">
          Accepts .csv file types
          <br />
          Maximum file size 50 MB.
        </p>

        <label className="mt-4 inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-white text-black border border-gray-300 hover:bg-gray-50 cursor-pointer rounded-[50px]">
          <span className="mr-2">
            <ArrowUpTrayIcon className={'w-5 h-5'} />
          </span>{' '}
          Upload
          <input
            type="file"
            accept=".csv"
            onChange={handleInputChange}
            className="hidden"
          />
        </label>

        {error && <p className="text-red-500 text-sm mt-6">{error}</p>}
      </div>
    </>
  );
};
