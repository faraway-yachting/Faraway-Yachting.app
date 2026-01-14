'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Paperclip, Eye, Download, Loader2 } from 'lucide-react';
import { Attachment } from '@/data/accounting/journalEntryTypes';
import { formatFileSize, isImageFile, isPdfFile } from '@/lib/expenses/utils';
import { createClient } from '@/lib/supabase/client';

interface ExpenseAttachmentsProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  readOnly?: boolean;
  label?: string;
  description?: string;
  expenseId?: string; // Used for organizing files in storage
}

export function ExpenseAttachments({
  attachments,
  onChange,
  readOnly = false,
  label = 'Attachments',
  description = 'Upload receipts, invoices, or supporting documents',
  expenseId,
}: ExpenseAttachmentsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  const uploadToStorage = async (file: File): Promise<Attachment | null> => {
    const supabase = createClient();

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const folder = expenseId ? `expense-attachments/${expenseId}` : 'expense-attachments/temp';
    const filePath = `${folder}/${uniqueId}.${fileExt}`;

    console.log('[ExpenseAttachments] Starting upload:', { file: file.name, folder, filePath });

    try {
      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Documents')
        .upload(filePath, file);

      console.log('[ExpenseAttachments] Upload result:', { uploadData, uploadError });

      if (uploadError) {
        console.error('[ExpenseAttachments] Upload error:', uploadError);
        throw new Error(uploadError.message || 'Failed to upload file');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('Documents')
        .getPublicUrl(filePath);

      console.log('[ExpenseAttachments] Public URL:', urlData.publicUrl);

      return {
        id: `att-${uniqueId}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: urlData.publicUrl,
        uploadedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[ExpenseAttachments] Error uploading file:', error);
      throw error;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newAttachments: Attachment[] = [];

    setIsUploading(true);
    setUploadError(null);

    for (const file of fileArray) {
      if (!allowedTypes.includes(file.type)) {
        setUploadError(`File type not supported: ${file.name}. Only JPEG, PNG, GIF, and PDF are allowed.`);
        continue;
      }

      if (file.size > maxSize) {
        setUploadError(`File too large: ${file.name}. Maximum size is 10MB.`);
        continue;
      }

      try {
        const attachment = await uploadToStorage(file);
        if (attachment) {
          newAttachments.push(attachment);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        setUploadError(`Failed to upload ${file.name}: ${message}`);
      }
    }

    if (newAttachments.length > 0) {
      onChange([...attachments, ...newAttachments]);
    }

    setIsUploading(false);
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
    if (!readOnly && !isUploading) {
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

    if (readOnly || isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    const attachment = attachments.find(a => a.id === attachmentId);

    // Try to delete from storage if it's a Supabase URL
    if (attachment?.url?.includes('supabase')) {
      try {
        const supabase = createClient();
        // Extract file path from URL
        const url = new URL(attachment.url);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/Documents\/(.+)/);
        if (pathMatch) {
          await supabase.storage.from('Documents').remove([pathMatch[1]]);
        }
      } catch (error) {
        console.warn('Could not delete file from storage:', error);
      }
    }

    onChange(attachments.filter((att) => att.id !== attachmentId));
  };

  const handlePreview = (attachment: Attachment) => {
    if (isImageFile(attachment.type) || isPdfFile(attachment.type)) {
      // For Supabase URLs, open in new tab
      if (attachment.url.startsWith('http')) {
        window.open(attachment.url, '_blank');
      } else {
        setPreviewUrl(attachment.url);
      }
    }
  };

  const handleDownload = (attachment: Attachment) => {
    // For Supabase URLs, open in new tab to trigger download
    if (attachment.url.startsWith('http')) {
      window.open(attachment.url, '_blank');
    } else {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isUploading ? 'cursor-wait opacity-70' : ''}
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
            disabled={isUploading}
          />
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 mx-auto text-[#5A7A8F] mb-2 animate-spin" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                <span className="font-medium text-[#5A7A8F]">Click to upload</span> or drag and
                drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                JPEG, PNG, GIF, or PDF (max 10MB each)
              </p>
            </>
          )}
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{uploadError}</p>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.type);
            const isImage = isImageFile(attachment.type);
            const isStorageUrl = attachment.url.startsWith('http');

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group"
              >
                {/* Thumbnail or Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-white border border-gray-200 flex items-center justify-center">
                  {isImage && isStorageUrl ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-full h-full object-cover"
                    />
                  ) : isImage && !isStorageUrl ? (
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

      {/* Preview Modal (for base64 images only) */}
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
