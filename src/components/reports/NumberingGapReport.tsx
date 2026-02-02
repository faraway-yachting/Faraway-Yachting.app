'use client';

import { useState } from 'react';
import { detectNumberingGaps, type GapDetectionResult } from '@/lib/reports/numberingGapDetection';

export default function NumberingGapReport() {
  const [report, setReport] = useState<GapDetectionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    setLoading(true);
    try {
      const result = await detectNumberingGaps();
      setReport(result);
    } catch (error) {
      console.error('Failed to detect numbering gaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (n: number) =>
    n.toLocaleString('en-US', { minimumIntegerDigits: 1 });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Document Numbering Gap Detection
        </h2>
        <button
          onClick={handleScan}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-md hover:bg-[#4a6a7f] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Scanning...
            </span>
          ) : (
            'Scan for Gaps'
          )}
        </button>
      </div>

      {loading && !report && (
        <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-500">
          <svg
            className="animate-spin h-8 w-8 text-[#5A7A8F] mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Scanning documents for numbering gaps...
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Gaps Found</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(report.totalGaps)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Documents Scanned</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(report.scannedDocuments)}
              </p>
            </div>
          </div>

          {report.totalGaps === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <p className="text-sm font-medium text-green-800">
                No gaps found. All document numbering sequences are complete.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">
                      Company
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">
                      Missing Number
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">
                      Between
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.gaps.map((gap, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-gray-900">{gap.documentType}</td>
                      <td className="py-3 px-4 text-gray-900">{gap.companyName}</td>
                      <td className="py-3 px-4 text-right font-mono text-red-600">
                        {formatNumber(gap.missingNumber)}
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-mono">
                        {gap.previousDoc} &rarr; {gap.nextDoc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!report && !loading && (
        <div className="text-center py-16 text-sm text-gray-400">
          Click &quot;Scan for Gaps&quot; to check document numbering sequences.
        </div>
      )}
    </div>
  );
}
