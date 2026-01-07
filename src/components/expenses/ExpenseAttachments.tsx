'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Paperclip, Eye, Download } from 'lucide-react';
import { Attachment } from '@/data/accounting/journalEntryTypes';
import { formatFileSize, isImageFile, isPdfFile } from '@/lib/expenses/utils';

interface ExpenseAttachmentsProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  readOnly?: boolean;
  label?: string;
  description?: string;
}

export function ExpenseAttachments({
  attachments,
  onChange,
  readOnly = false,
  label = 'Attachments',
  description = 'Upload receipts, invoices, or supporting documents',
}: ExpenseAttachmentsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  const handleFiles = (files: FileList | File[]) => {
    const newAttachments: Attachment[] = [];
    let processedCount = 0;
    const fileArray = Array.from(files);

    fileArray.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        alert(`File type not supported: ${file.name}. Only JPEG, PNG, GIF, and PDF are allowed.`);
        processedCount++;
        return;
      }

      if (file.size > maxSize) {
        alert(`File too large: ${file.name}. Maximum size is 10MB.`);
        processedCount++;
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const attachment: Attachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: e.target?.result as string,
          uploadedAt: new Date().toISOString(),
        };
        newAttachments.push(attachment);
        processedCount++;

        if (processedCount === fileArray.length && newAttachments.length > 0) {
          onChange([...attachments, ...newAttachments]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    handleFiles(files);

    // Reset input
    event.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!readOnly) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (readOnly) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    onChange(attachments.filter((att) => att.id !== attachmentId));
  };

  const handlePreview = (attachment: Attachment) => {
    if (isImageFile(attachment.type) || isPdfFile(attachment.type)) {
      setPreviewUrl(attachment.url);
    }
  };

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type === 'application/pdf') return FileText;
    return Paperclip;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {description && (
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        )}
      </div>

      {/* Drop Zone */}
      {!readOnly && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${
              isDragging
                ? 'border-[#5A7A8F] bg-[#5A7A8F]/5'
                : 'border-gray-300 hover:border-gray-400'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            <span className="font-medium text-[#5A7A8F]">Click to upload</span> or drag and
            drop
          </p>
          <p className="text-xs text-gray-500 mt-1">
            JPEG, PNG, GIF, or PDF (max 10MB each)
          </p>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.type);
            const isImage = isImageFile(attachment.type);

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group"
              >
                {/* Thumbnail or Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-white border border-gray-200 flex items-center justify-center">
                  {isImage ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileIcon className="h-6 w-6 text-gray-400" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(isImage || isPdfFile(attachment.type)) && (
                    <button
                      type="button"
                      onClick={() => handlePreview(attachment)}
                      className="p-1.5 text-gray-400 hover:text-[#5A7A8F] hover:bg-white rounded transition-colors"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownload(attachment)}
                    className="p-1.5 text-gray-400 hover:text-[#5A7A8F] hover:bg-white rounded transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded transition-colors"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            {previewUrl.startsWith('data:image/') ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-[85vh] mx-auto rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <iframe
                src={previewUrl}
                className="w-full h-[85vh] bg-white rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
