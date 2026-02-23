import { UploadCloud } from 'lucide-react';
import { Trans } from '@lingui/react/macro';

interface FileUploadProps {
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  onFiles: (files: FileList) => void;
  hasCourses?: boolean;
}

export function FileUpload({ isDragging, setIsDragging, onFiles, hasCourses }: FileUploadProps) {
  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-xl p-4 sm:p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-gray-50 dark:bg-gray-800'}`}
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
        <UploadCloud className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
        <p className="text-gray-700 dark:text-gray-200 font-medium"><Trans>Click to upload or drag & drop schedule files</Trans></p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1"><Trans>Supports: Raw BTU HTML, Clean HTML, JSON, CSV, Markdown</Trans></p>
      </div>

      {/* How it works — only show when no courses loaded */}
      {!hasCourses && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center justify-center">1</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300"><Trans>Export from BTU</Trans></span>
            <span className="text-xs text-gray-400 dark:text-gray-500"><Trans>Save the timetable page as HTML</Trans></span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center justify-center">2</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300"><Trans>Upload here</Trans></span>
            <span className="text-xs text-gray-400 dark:text-gray-500"><Trans>Drop the file above or click to browse</Trans></span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center justify-center">3</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300"><Trans>Get your schedule</Trans></span>
            <span className="text-xs text-gray-400 dark:text-gray-500"><Trans>We'll find the optimal combination</Trans></span>
          </div>
        </div>
      )}
    </div>
  );
}
