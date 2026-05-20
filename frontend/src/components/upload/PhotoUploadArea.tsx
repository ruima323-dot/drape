import { useState, useRef, useCallback } from 'react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface PhotoUploadAreaProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function PhotoUploadArea({ onFilesSelected, disabled = false }: PhotoUploadAreaProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `"${file.name}" is not a supported format. Please upload JPEG, PNG, or WebP images.`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `"${file.name}" exceeds 10 MB. Please choose a smaller file.`;
    }
    return null;
  }, []);

  const validateAndSelect = useCallback(
    (files: File[]) => {
      setError(null);

      const errors: string[] = [];
      const validFiles: File[] = [];

      for (const file of files) {
        const fileError = validateFile(file);
        if (fileError) {
          errors.push(fileError);
        } else {
          validFiles.push(file);
        }
      }

      if (errors.length > 0) {
        setError(errors.join(' '));
      }

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [onFilesSelected, validateFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) validateAndSelect(files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) validateAndSelect(files);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect([file]);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-card-lg p-8 text-center transition-colors ${
          disabled
            ? 'border-cream-300 bg-cream-50 opacity-50 cursor-not-allowed'
            : isDragOver
              ? 'border-gold bg-cream-200'
              : 'border-cream-400 bg-cream-50 hover:border-gold hover:bg-cream-100'
        }`}
      >
        {/* Camera icon */}
        <div className="flex justify-center mb-4">
          <svg
            className="w-12 h-12 text-charcoal-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>

        <p className="text-sm text-charcoal-muted mb-4">
          Drag and drop your outfit photos here, or use the buttons below
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-pill hover:bg-charcoal-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Choose Files
          </button>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled}
            className="px-4 py-2 bg-gold text-white text-sm font-medium rounded-pill hover:bg-gold-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Take Photo
            </span>
          </button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          className="hidden"
          aria-label="Choose photo files"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleCameraChange}
          className="hidden"
          aria-label="Take photo with camera"
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
