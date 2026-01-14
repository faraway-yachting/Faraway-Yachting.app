'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, Loader2, ExternalLink } from 'lucide-react';
import type { WhtFromCustomerRecord } from '@/lib/supabase/api/whtFromCustomer';

interface WhtReceiveModalProps {
  record: WhtFromCustomerRecord;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    certificateNumber?: string;
    certificateDate?: string;
    file?: File;
    notes?: string;
  }) => Promise<void>;
  mode?: 'receive' | 'edit';
}

export function WhtReceiveModal({
  record,
  isOpen,
  onClose,
  onSubmit,
  mode = 'receive',
}: WhtReceiveModalProps) {
  const [certificateNumber, setCertificateNumber] = useState('');
  const [certificateDate, setCertificateDate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill form when editing
  useEffect(() => {
    if (isOpen && mode === 'edit') {
      setCertificateNumber(record.certificateNumber || '');
      setCertificateDate(record.certificateDate || '');
      setNotes(record.notes || '');
    } else if (isOpen && mode === 'receive') {
      setCertificateNumber('');
      setCertificateDate('');
      setNotes('');
    }
    setFile(null);
    setError(null);
  }, [isOpen, mode, record]);

  if (!isOpen) return null;

  const isEditMode = mode === 'edit';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF or image file (JPG, PNG)');
        return;
      }
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setIsSubmitting(true);
    try {
      await onSubmit({
        certificateNumber: certificateNumber.trim() || undefined,
        certificateDate: certificateDate || undefined,
        file: file || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCertificateNumber('');
      setCertificateDate('');
      setNotes('');
      setFile(null);
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditMode ? 'Edit WHT Certificate' : 'Receive WHT Certificate'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              From: {record.customerName}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* WHT Info Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Receipt:</span>
                <span className="ml-2 font-medium">{record.receiptNumber || record.receiptId.slice(0, 8)}</span>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <span className="ml-2 font-medium">
                  {new Date(record.receiptDate).toLocaleDateString('en-GB')}
                </span>
              </div>
              <div>
                <span className="text-gray-500">WHT Rate:</span>
                <span className="ml-2 font-medium">{record.whtRate}%</span>
              </div>
              <div>
                <span className="text-gray-500">WHT Amount:</span>
                <span className="ml-2 font-bold text-amber-600">
                  ฿{record.whtAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Certificate Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Certificate Number <span className="text-gray-400 text-xs font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
              placeholder="e.g., WHT2501001"
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100"
            />
          </div>

          {/* Certificate Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Certificate Date <span className="text-gray-400 text-xs font-normal">(Optional)</span>
            </label>
            <input
              type="date"
              value={certificateDate}
              onChange={(e) => setCertificateDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100"
            />
          </div>

          {/* Existing File (edit mode) */}
          {isEditMode && record.certificateFileUrl && !file && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Certificate File
              </label>
              <a
                href={record.certificateFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 hover:bg-green-100 transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">{record.certificateFileName || 'View Certificate'}</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEditMode && record.certificateFileUrl ? 'Replace Certificate File (Optional)' : 'Upload Certificate (Optional)'}
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                file
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 hover:border-[#5A7A8F] hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                disabled={isSubmitting}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-500">
                  <Upload className="h-6 w-6" />
                  <span className="text-sm">Click to upload PDF or image</span>
                  <span className="text-xs text-gray-400">Max 10MB</span>
                </div>
              )}
            </div>
            {file && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="mt-1 text-xs text-red-600 hover:text-red-700"
              >
                Remove file
              </button>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional notes..."
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Mark as Received'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
