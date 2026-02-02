'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileText, ExternalLink } from 'lucide-react';
import { employeeDocumentsApi } from '@/lib/supabase/api/employeeDocuments';

interface Props {
  employeeId: string;
}

export default function EmployeeDocuments({ employeeId }: Props) {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await employeeDocumentsApi.getByEmployee(employeeId);
        setDocs(data);
      } catch (error) {
        console.error('Failed to load documents:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No documents uploaded.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">File</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {docs.map((doc) => {
            const now = new Date();
            let statusEl = null;
            if (doc.expiry_date) {
              const expiry = new Date(doc.expiry_date);
              const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const alertDays = doc.alert_days_before || 30;
              if (daysLeft < 0) {
                statusEl = <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Expired {Math.abs(daysLeft)}d ago</span>;
              } else if (daysLeft <= alertDays) {
                statusEl = <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{daysLeft}d left</span>;
              } else {
                statusEl = <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Valid</span>;
              }
            } else {
              statusEl = <span className="text-xs text-gray-400">No expiry</span>;
            }

            const fileUrls = doc.file_url ? doc.file_url.split('||').filter(Boolean) : [];
            const fileNames = doc.file_name ? doc.file_name.split('||').filter(Boolean) : [];

            return (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{doc.document_name || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{doc.document_type}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                </td>
                <td className="px-4 py-3">{statusEl}</td>
                <td className="px-4 py-3 text-center">
                  {fileUrls.length > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      {fileUrls.map((url: string, i: number) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[#5A7A8F] hover:bg-gray-100 rounded transition-colors"
                          title={fileNames[i] || 'Download'}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
