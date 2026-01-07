"use client";

import { useState, useEffect } from "react";
import { X, FileText, Paperclip, Download } from "lucide-react";
import {
  getProjectTransactions,
  formatTHBAmount,
  formatMonthLabel,
  TransactionDetail,
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
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

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
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attachment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(transaction.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-xs text-gray-500">
                            {transaction.documentNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {transaction.category}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        {formatTHBAmount(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {transaction.hasAttachment ? (
                          <button
                            onClick={() => {
                              if (transaction.attachmentUrl) {
                                window.open(transaction.attachmentUrl, "_blank");
                              }
                            }}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <Paperclip className="h-4 w-4" />
                            <span>View</span>
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

          {/* Footer */}
          {transactions.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
                </span>
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
    </div>
  );
}
