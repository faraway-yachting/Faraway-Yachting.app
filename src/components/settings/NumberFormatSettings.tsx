"use client";

import { useState, useEffect } from "react";
import { Pencil, RotateCcw, X } from "lucide-react";
import {
  DocumentType,
  NumberFormatConfig,
  DateFormat,
  Separator,
  documentTypeLabels,
} from "@/data/settings/numberFormatTypes";
import {
  getAllNumberFormats,
  updateNumberFormat,
  resetNumberFormat,
  hasCustomFormat,
  generatePreviewNumber,
  formatConfigAsPattern,
  getDefaultFormat,
} from "@/data/settings/numberFormats";
import { getActiveCompanies } from "@/data/company/companies";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  docType: DocumentType;
  config: NumberFormatConfig;
  onSave: (config: NumberFormatConfig) => void;
}

function EditModal({ isOpen, onClose, docType, config, onSave }: EditModalProps) {
  const [prefix, setPrefix] = useState(config.prefix);
  const [dateFormat, setDateFormat] = useState<DateFormat>(config.dateFormat);
  const [sequenceDigits, setSequenceDigits] = useState(config.sequenceDigits);
  const [separator, setSeparator] = useState<Separator>(config.separator);

  useEffect(() => {
    setPrefix(config.prefix);
    setDateFormat(config.dateFormat);
    setSequenceDigits(config.sequenceDigits);
    setSeparator(config.separator);
  }, [config]);

  if (!isOpen) return null;

  const previewConfig: NumberFormatConfig = {
    prefix,
    dateFormat,
    sequenceDigits,
    separator,
  };

  const handleSave = () => {
    onSave(previewConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Edit {documentTypeLabels[docType]} Number Format
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Prefix */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prefix
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              placeholder="e.g., INV, FYT-INV"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              maxLength={20}
            />
          </div>

          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Format
            </label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value as DateFormat)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="YYMM">YYMM (e.g., 2601)</option>
              <option value="YYYYMM">YYYYMM (e.g., 202601)</option>
              <option value="MMYY">MMYY (e.g., 0126)</option>
              <option value="none">No date</option>
            </select>
          </div>

          {/* Separator */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Separator
            </label>
            <select
              value={separator}
              onChange={(e) => setSeparator(e.target.value as Separator)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="-">Dash (-)</option>
              <option value="/">Slash (/)</option>
              <option value="">None</option>
            </select>
          </div>

          {/* Sequence Digits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sequence Digits
            </label>
            <select
              value={sequenceDigits}
              onChange={(e) => setSequenceDigits(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={4}>4 digits (0001)</option>
              <option value={5}>5 digits (00001)</option>
              <option value={6}>6 digits (000001)</option>
            </select>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <div className="text-sm text-gray-600 mb-1">Preview:</div>
            <div className="text-lg font-mono font-semibold text-blue-600">
              {generatePreviewNumber(previewConfig)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Pattern: {formatConfigAsPattern(previewConfig)}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function NumberFormatSettings() {
  const companies = getActiveCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    companies[0]?.id || ""
  );
  const [formats, setFormats] = useState<Record<DocumentType, NumberFormatConfig>>(
    {} as Record<DocumentType, NumberFormatConfig>
  );
  const [editingDocType, setEditingDocType] = useState<DocumentType | null>(null);

  const docTypes: DocumentType[] = [
    "quotation",
    "invoice",
    "receipt",
    "creditNote",
    "debitNote",
  ];

  useEffect(() => {
    if (selectedCompanyId) {
      setFormats(getAllNumberFormats(selectedCompanyId));
    }
  }, [selectedCompanyId]);

  const handleSave = (docType: DocumentType, config: NumberFormatConfig) => {
    updateNumberFormat(selectedCompanyId, docType, config);
    setFormats(getAllNumberFormats(selectedCompanyId));
  };

  const handleReset = (docType: DocumentType) => {
    resetNumberFormat(selectedCompanyId, docType);
    setFormats(getAllNumberFormats(selectedCompanyId));
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Document Numbering
        </h2>
        <p className="text-sm text-gray-500">
          Customize document number formats for each company and document type.
        </p>
      </div>

      {/* Company Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company
        </label>
        <select
          value={selectedCompanyId}
          onChange={(e) => setSelectedCompanyId(e.target.value)}
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      {/* Formats Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Document Type
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Format Pattern
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Preview
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Status
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {docTypes.map((docType) => {
              const config = formats[docType];
              const isCustom = hasCustomFormat(selectedCompanyId, docType);

              if (!config) return null;

              return (
                <tr
                  key={docType}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-gray-900">
                      {documentTypeLabels[docType]}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {formatConfigAsPattern(config)}
                    </code>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-blue-600">
                      {generatePreviewNumber(config)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {isCustom ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Custom
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Default
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingDocType(docType)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      {isCustom && (
                        <button
                          onClick={() => handleReset(docType)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
                          title="Reset to default"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Changes only affect new documents. Existing documents keep their original numbers.
        </p>
      </div>

      {/* Edit Modal */}
      {editingDocType && (
        <EditModal
          isOpen={!!editingDocType}
          onClose={() => setEditingDocType(null)}
          docType={editingDocType}
          config={formats[editingDocType]}
          onSave={(config) => handleSave(editingDocType, config)}
        />
      )}
    </div>
  );
}
