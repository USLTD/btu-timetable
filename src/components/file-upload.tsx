import { UploadCloud } from 'lucide-react';
import { Trans } from '@lingui/react/macro';

interface FileUploadProps {
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  onFiles: (files: FileList) => void;
}

export function FileUpload({ isDragging, setIsDragging, onFiles }: FileUploadProps) {
  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-gray-50 dark:bg-gray-800'}`}
      role="button" tabIndex={0} aria-label="Upload schedule files"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); onFiles(e.dataTransfer.files); }}
      onClick={() => document.getElementById('fileUpload')?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('fileUpload')?.click(); } }}
    >
      <input
        type="file"
        id="fileUpload"
        multiple
        accept=".html,.htm,.json,.csv,.md"
        className="hidden"
        onChange={(e) => { if (e.target.files) onFiles(e.target.files); }}
      />
      <UploadCloud className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
      <p className="text-gray-700 dark:text-gray-200 font-medium"><Trans>Click to upload or drag & drop schedule files</Trans></p>
      <p className="text-gray-400 dark:text-gray-500 text-sm mt-1"><Trans>Supports: Raw BTU HTML, Clean HTML, JSON, CSV, Markdown</Trans></p>
    </div>
  );
}
