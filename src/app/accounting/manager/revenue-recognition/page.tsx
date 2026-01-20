'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  FileText,
  Ship,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { revenueRecognitionApi } from '@/lib/supabase/api/revenueRecognition';
import type {
  PendingRevenueRecognitionView,
  RevenueRecognition,
  DeferredRevenueSummary,
} from '@/data/revenueRecognition/types';
import {
  recognitionStatusLabels,
  recognitionStatusColors,
  recognitionTriggerLabels,
} from '@/data/revenueRecognition/types';

// Tab configuration
const tabs = [
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'needs_review', label: 'Needs Review', icon: AlertCircle },
  { id: 'recognized', label: 'Recently Recognized', icon: CheckCircle },
];

// Format currency amount
function formatAmount(amount: number, currency: string = 'THB'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const symbols: Record<string, string> = {
    THB: '฿',
    USD: '$',
    EUR: '€',
    GBP: '£',
    SGD: 'S$',
    AED: 'AED ',
  };

  return `${symbols[currency] || ''}${formatter.format(amount)}`;
}

// Format date
function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function RevenueRecognitionPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingRecords, setPendingRecords] = useState<PendingRevenueRecognitionView[]>([]);
  const [needsReviewRecords, setNeedsReviewRecords] = useState<PendingRevenueRecognitionView[]>([]);
  const [recognizedRecords, setRecognizedRecords] = useState<RevenueRecognition[]>([]);
  const [summary, setSummary] = useState<DeferredRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAutoRecognition, setProcessingAutoRecognition] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pending, needsReview, recognized] = await Promise.all([
        revenueRecognitionApi.getPending(),
        revenueRecognitionApi.getNeedsReview(),
        revenueRecognitionApi.getRecentlyRecognized(undefined, 50),
      ]);

      setPendingRecords(pending);
      setNeedsReviewRecords(needsReview);
      setRecognizedRecords(recognized);

      // Calculate summary from pending records
      const totalThb = pending.reduce((sum, r) => sum + r.thbAmount, 0);
      setSummary({
        totalThb,
        pendingCount: pending.length,
        needsReviewCount: needsReview.length,
      });
    } catch (error) {
      console.error('Error fetching revenue recognition data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process automatic recognition
  const handleProcessAutoRecognition = async () => {
    setProcessingAutoRecognition(true);
    try {
      const result = await revenueRecognitionApi.processAutomatic();
      if (result.recognized > 0) {
        alert(`Successfully recognized ${result.recognized} record(s)`);
        fetchData(); // Refresh data
      } else {
        alert('No records ready for automatic recognition');
      }
      if (result.errors.length > 0) {
        console.error('Recognition errors:', result.errors);
      }
    } catch (error) {
      console.error('Error processing auto recognition:', error);
      alert('Error processing automatic recognition');
    } finally {
      setProcessingAutoRecognition(false);
    }
  };

  // Handle manual recognition
  const handleRecognize = async (record: PendingRevenueRecognitionView) => {
    if (!confirm(`Recognize revenue of ${formatAmount(record.thbAmount)} for ${record.projectName}?`)) {
      return;
    }

    try {
      await revenueRecognitionApi.recognize(
        record.id,
        'current-user', // TODO: Get from auth context
        record.charterDateTo ? 'manual' : 'immediate'
      );
      alert('Revenue recognized successfully');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error recognizing revenue:', error);
      alert('Error recognizing revenue');
    }
  };

  // Navigate to receipt
  const handleViewReceipt = (receiptId?: string) => {
    if (receiptId) {
      router.push(`/accounting/manager/income/receipts/${receiptId}`);
    }
  };

  // Get current tab data
  const currentData = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return pendingRecords.filter(r => r.recognitionStatus === 'pending');
      case 'needs_review':
        return needsReviewRecords;
      case 'recognized':
        return recognizedRecords;
      default:
        return [];
    }
  }, [activeTab, pendingRecords, needsReviewRecords, recognizedRecords]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5A7A8F]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Revenue Recognition</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage deferred revenue and track charter completion for proper P&L reporting
          </p>
        </div>
        <button
          onClick={handleProcessAutoRecognition}
          disabled={processingAutoRecognition}
          className="flex items-center gap-2 px-4 py-2 bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4A6A7F] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${processingAutoRecognition ? 'animate-spin' : ''}`} />
          Process Auto Recognition
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Deferred Revenue */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Deferred Revenue</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatAmount(summary?.totalThb || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Pending Recognition */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Recognition</p>
              <p className="text-xl font-semibold text-gray-900">
                {summary?.pendingCount || 0} records
              </p>
            </div>
          </div>
        </div>

        {/* Needs Review */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Needs Review</p>
              <p className="text-xl font-semibold text-gray-900">
                {summary?.needsReviewCount || 0} records
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count =
                tab.id === 'pending'
                  ? pendingRecords.filter(r => r.recognitionStatus === 'pending').length
                  : tab.id === 'needs_review'
                  ? needsReviewRecords.length
                  : recognizedRecords.length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-[#5A7A8F] text-[#5A7A8F]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                        isActive ? 'bg-[#5A7A8F]/10 text-[#5A7A8F]' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {currentData.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                {activeTab === 'pending' && <Clock className="h-12 w-12 mx-auto" />}
                {activeTab === 'needs_review' && <AlertCircle className="h-12 w-12 mx-auto" />}
                {activeTab === 'recognized' && <CheckCircle className="h-12 w-12 mx-auto" />}
              </div>
              <p className="text-gray-500">
                {activeTab === 'pending' && 'No pending revenue recognition'}
                {activeTab === 'needs_review' && 'No records need review'}
                {activeTab === 'recognized' && 'No recently recognized revenue'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTab !== 'recognized' &&
                (currentData as PendingRevenueRecognitionView[]).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        <Ship className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {record.projectName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              recognitionStatusColors[record.recognitionStatus].bg
                            } ${recognitionStatusColors[record.recognitionStatus].text}`}
                          >
                            {recognitionStatusLabels[record.recognitionStatus]}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          {record.receiptNumber && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5" />
                              {record.receiptNumber}
                            </span>
                          )}
                          {record.charterDateTo && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Charter: {formatDate(record.charterDateTo)}
                            </span>
                          )}
                          {record.clientName && (
                            <span>{record.clientName}</span>
                          )}
                        </div>
                        {record.daysUntilRecognition !== undefined && record.daysUntilRecognition > 0 && (
                          <p className="text-xs text-yellow-600 mt-1">
                            {record.daysUntilRecognition} day{record.daysUntilRecognition === 1 ? '' : 's'} until recognition
                          </p>
                        )}
                        {record.recognitionStatus === 'needs_review' && (
                          <p className="text-xs text-orange-600 mt-1">
                            Missing charter dates - add dates or approve immediate recognition
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatAmount(record.thbAmount)}
                        </p>
                        {record.currency !== 'THB' && (
                          <p className="text-xs text-gray-500">
                            ({formatAmount(record.amount, record.currency)})
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {record.receiptId && (
                          <button
                            onClick={() => handleViewReceipt(record.receiptId)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg"
                            title="View Receipt"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRecognize(record)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Recognize
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              {activeTab === 'recognized' &&
                (currentData as RevenueRecognition[]).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {record.description || 'Revenue Recognition'}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Recognized: {formatDate(record.recognitionDate)}
                          </span>
                          {record.recognitionTrigger && (
                            <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">
                              {recognitionTriggerLabels[record.recognitionTrigger]}
                            </span>
                          )}
                          {record.clientName && <span>{record.clientName}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatAmount(record.thbAmount)}
                      </p>
                      {record.currency !== 'THB' && (
                        <p className="text-xs text-gray-500">
                          ({formatAmount(record.amount, record.currency)})
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">How Revenue Recognition Works</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p>
            <strong>Pending:</strong> Revenue is deferred until the charter service is completed (charter date passes).
          </p>
          <p>
            <strong>Needs Review:</strong> Receipts without charter dates. Add dates or approve for immediate recognition.
          </p>
          <p>
            <strong>Auto Recognition:</strong> Click &quot;Process Auto Recognition&quot; to recognize all completed charters.
          </p>
          <p className="text-xs mt-2">
            Deferred revenue is held in account 2300 (Charter Deposits Received) until recognized into revenue accounts (4010-4070).
          </p>
        </div>
      </div>
    </div>
  );
}
