"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { X, FileText, Paperclip, ChevronDown, ChevronRight, Download } from "lucide-react";
import {
  getProjectTransactions,
  formatTHBAmount,
  formatMonthLabel,
  TransactionDetail,
  AttachmentDetail,
} from "@/lib/reports/projectPLCalculation";

interface ProjectPLDrillDownProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  month: string;
  type: "income" | "expense";
}

export function ProjectPLDrillDown({
  isOpen,
  onClose,
  projectId,
  projectName,
  month,
  type,
}: ProjectPLDrillDownProps) {
  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Attachment viewer state
  const [viewingAttachments, setViewingAttachments] = useState<AttachmentDetail[] | null>(null);
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadTransactions();
    }
  }, [isOpen, projectId, month, type]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const data = await getProjectTransactions(projectId, month, type);
      setTransactions(data);
      // Expand all categories by default
      const categories = new Set(data.map(t => t.categoryName || t.category || 'Other'));
      setExpandedCategories(categories);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group transactions by categoryName
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, TransactionDetail[]> = {};

    for (const t of transactions) {
      const key = t.categoryName || t.category || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }

    // Sort transactions by date within each group
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.date.localeCompare(b.date));
    }

    // Sort groups alphabetically and return as array of [category, transactions]
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [transactions]);

  // Calculate subtotals per category
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const [category, items] of groupedTransactions) {
      totals[category] = items.reduce((sum, t) => sum + t.amount, 0);
    }
    return totals;
  }, [groupedTransactions]);

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Open attachment viewer
  const openAttachmentViewer = (attachments: AttachmentDetail[]) => {
    setViewingAttachments(attachments);
    setCurrentAttachmentIndex(0);
  };

  // Close attachment viewer
  const closeAttachmentViewer = () => {
    setViewingAttachments(null);
    setCurrentAttachmentIndex(0);
  };

  // Download attachment
  const downloadAttachment = (attachment: AttachmentDetail) => {
    const link = document.createElement("a");
    link.href = attachment.url;
    link.download = attachment.name || "attachment";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if attachment is an image
  const isImageAttachment = (attachment: AttachmentDetail) => {
    const url = attachment.url.toLowerCase();
    const type = attachment.type?.toLowerCase() || '';
    return (
      type.startsWith('image/') ||
      url.startsWith('data:image/') ||
      url.endsWith('.jpg') ||
      url.endsWith('.jpeg') ||
      url.endsWith('.png') ||
      url.endsWith('.gif') ||
      url.endsWith('.webp')
    );
  };

  // Export transactions to CSV
  const handleExport = useCallback(() => {
    if (transactions.length === 0) return;

    // CSV headers
    const headers = ["Date", "Description", "Document Number", "Category", "Amount (THB)"];

    // CSV rows - sorted by category then date
    const rows = groupedTransactions.flatMap(([category, items]) =>
      items.map((t) => [
        new Date(t.date).toLocaleDateString("en-GB"),
        `"${(t.description || "").replace(/"/g, '""')}"`,
        t.documentNumber,
        `"${category.replace(/"/g, '""')}"`,
        t.amount.toFixed(2),
      ])
    );

    // Add totals row
    rows.push(["", "", "", "TOTAL", totalAmount.toFixed(2)]);

    // Build CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName}_${type}_${month}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [transactions, groupedTransactions, totalAmount, projectName, type, month]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {projectName} - {type === "income" ? "Income" : "Expense"} Details
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {formatMonthLabel(month)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-auto max-h-[calc(80vh-140px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Loading transactions...</p>
                </div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500">
                  No {type} transactions found for this month.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {groupedTransactions.map(([category, items]) => (
                  <div key={category}>
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between px-6 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedCategories.has(category) ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="font-medium text-gray-900">{category}</span>
                        <span className="text-sm text-gray-500">
                          ({items.length} item{items.length !== 1 ? "s" : ""})
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {formatTHBAmount(categoryTotals[category])}
                      </span>
                    </button>

                    {/* Category Items */}
                    {expandedCategories.has(category) && (
                      <table className="w-full">
                        <thead className="bg-white">
                          <tr className="text-xs text-gray-500 uppercase tracking-wider">
                            <th className="text-left px-6 py-2 font-medium">Date</th>
                            <th className="text-left px-6 py-2 font-medium">Description</th>
                            <th className="text-left px-6 py-2 font-medium">Category</th>
                            <th className="text-right px-6 py-2 font-medium">Amount</th>
                            <th className="text-center px-6 py-2 font-medium">Attachment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {items.map((transaction, index) => (
                            <tr
                              key={`${transaction.id}-${transaction.documentNumber}-${index}`}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                                {new Date(transaction.date).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="px-6 py-3 text-sm text-gray-900">
                                <div>
                                  <div className="font-medium">{transaction.description}</div>
                                  <div className="text-xs text-gray-500">
                                    {transaction.documentNumber}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-sm text-gray-600">
                                {transaction.categoryName || transaction.category}
                              </td>
                              <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                                {formatTHBAmount(transaction.amount)}
                              </td>
                              <td className="px-6 py-3 text-center">
                                {transaction.hasAttachment && transaction.attachments && transaction.attachments.length > 0 ? (
                                  <button
                                    onClick={() => openAttachmentViewer(transaction.attachments!)}
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    <Paperclip className="h-4 w-4" />
                                    <span>View{transaction.attachments.length > 1 ? ` (${transaction.attachments.length})` : ''}</span>
                                  </button>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {transactions.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={handleExport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Total:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatTHBAmount(totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Attachment Viewer Modal */}
      {viewingAttachments && viewingAttachments.length > 0 && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 transition-opacity"
            onClick={closeAttachmentViewer}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {viewingAttachments[currentAttachmentIndex]?.name || 'Attachment'}
                  </h3>
                  {viewingAttachments.length > 1 && (
                    <span className="text-xs text-gray-500">
                      ({currentAttachmentIndex + 1} of {viewingAttachments.length})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadAttachment(viewingAttachments[currentAttachmentIndex])}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    onClick={closeAttachmentViewer}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 bg-gray-100 flex items-center justify-center min-h-[400px] max-h-[calc(90vh-120px)] overflow-auto">
                {isImageAttachment(viewingAttachments[currentAttachmentIndex]) ? (
                  <img
                    src={viewingAttachments[currentAttachmentIndex].url}
                    alt={viewingAttachments[currentAttachmentIndex].name}
                    className="max-w-full max-h-[calc(90vh-180px)] object-contain rounded shadow-lg"
                  />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      {viewingAttachments[currentAttachmentIndex]?.name || 'Attachment'}
                    </p>
                    <button
                      onClick={() => downloadAttachment(viewingAttachments[currentAttachmentIndex])}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4" />
                      Download File
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation for multiple attachments */}
              {viewingAttachments.length > 1 && (
                <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-200 bg-white">
                  <button
                    onClick={() => setCurrentAttachmentIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentAttachmentIndex === 0}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex gap-1">
                    {viewingAttachments.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentAttachmentIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentAttachmentIndex ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentAttachmentIndex(prev => Math.min(viewingAttachments.length - 1, prev + 1))}
                    disabled={currentAttachmentIndex === viewingAttachments.length - 1}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
