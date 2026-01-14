'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FinancesScopeBar } from '@/components/finances/FinancesScopeBar';
import { WhtFromCustomerTable } from '@/components/finances/WhtFromCustomerTable';
import { WhtReceiveModal } from '@/components/finances/WhtReceiveModal';
import { companiesApi } from '@/lib/supabase/api/companies';
import { whtFromCustomerApi, type WhtFromCustomerRecord } from '@/lib/supabase/api/whtFromCustomer';
import type { Database } from '@/lib/supabase/database.types';

type DbCompany = Database['public']['Tables']['companies']['Row'];

// Convert Company type to UI format
function convertCompanyToUi(company: DbCompany): { id: string; name: string } {
  return { id: company.id, name: company.name };
}

export default function WhtFromCustomerPage() {
  const router = useRouter();
  const [dataScope, setDataScope] = useState('all-companies');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(() => new Date().getMonth() + 1);

  // Data from Supabase
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [whtRecords, setWhtRecords] = useState<WhtFromCustomerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [selectedRecord, setSelectedRecord] = useState<WhtFromCustomerRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'receive' | 'edit'>('receive');

  // Get current period string
  const currentMonth = month || new Date().getMonth() + 1;
  const period = `${year}-${String(currentMonth).padStart(2, '0')}`;

  // Get selected company ID (if not all-companies)
  const selectedCompanyId = dataScope.startsWith('company-')
    ? dataScope.replace('company-', '')
    : undefined;

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load companies first (if not loaded)
      if (companies.length === 0) {
        const companiesData = await companiesApi.getAll();
        setCompanies(companiesData);
      }

      // Load WHT records for the period
      // API returns empty array if table doesn't exist (migration not run)
      const records = await whtFromCustomerApi.getByPeriod(period, selectedCompanyId);
      setWhtRecords(records);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period, selectedCompanyId, companies.length]);

  // Load on mount and when period/company changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePeriodChange = (newYear: number, newMonth: number | null) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleExport = () => {
    // TODO: Implement export
    console.log('Exporting WHT from Customer data...');
  };

  const handleMarkAsReceived = (record: WhtFromCustomerRecord) => {
    setSelectedRecord(record);
    setModalMode('receive');
    setIsModalOpen(true);
  };

  const handleEdit = (record: WhtFromCustomerRecord) => {
    setSelectedRecord(record);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleViewReceipt = (receiptId: string) => {
    router.push(`/accounting/accountant/income/receipts/${receiptId}`);
  };

  const handleReceiveSubmit = async (data: {
    certificateNumber?: string;
    certificateDate?: string;
    file?: File;
    notes?: string;
  }) => {
    if (!selectedRecord) return;

    // Start with existing file info (for edit mode)
    let fileUrl: string | undefined = selectedRecord.certificateFileUrl || undefined;
    let fileName: string | undefined = selectedRecord.certificateFileName || undefined;

    // Upload file if provided
    if (data.file) {
      try {
        const uploadResult = await whtFromCustomerApi.uploadCertificateFile(
          data.file,
          selectedRecord.id
        );
        // uploadResult is null if storage bucket not configured
        if (uploadResult) {
          fileUrl = uploadResult.url;
          fileName = uploadResult.fileName;
        } else {
          // Bucket not found - show error to user
          throw new Error('File upload failed: Storage not configured. Please contact administrator to set up the "documents" storage bucket in Supabase.');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Failed to upload file. Please try again.');
      }
    }

    // Mark as received or update (all certificate fields are optional)
    await whtFromCustomerApi.markAsReceived(
      selectedRecord.id,
      data.certificateNumber,
      data.certificateDate,
      fileUrl,
      fileName,
      data.notes
    );

    // Refresh data
    await loadData();
  };

  // Filter records based on data scope
  const filteredRecords = selectedCompanyId
    ? whtRecords.filter(r => r.companyId === selectedCompanyId)
    : whtRecords;

  // Calculate totals
  const totalWht = filteredRecords.reduce((sum, r) => sum + r.whtAmount, 0);
  const pendingCount = filteredRecords.filter(r => r.status === 'pending').length;
  const receivedCount = filteredRecords.filter(r => r.status === 'received' || r.status === 'reconciled').length;

  // Convert companies for scope bar
  const companiesForScopeBar = companies.map(convertCompanyToUi);

  if (isLoading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5A7A8F]"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Scope Bar */}
      <FinancesScopeBar
        dataScope={dataScope}
        onDataScopeChange={setDataScope}
        companies={companiesForScopeBar}
        year={year}
        month={month}
        onPeriodChange={handlePeriodChange}
        onExport={handleExport}
      />

      {/* Summary Header */}
      <div className="bg-gradient-to-r from-[#5A7A8F] to-[#4a6a7f] rounded-lg p-6 mb-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Withheld Tax</h2>
            <p className="text-sm text-white/70">
              Tax withheld by customers when they make payments to us
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/70">Total WHT Amount</p>
            <p className="text-3xl font-bold">฿{totalWht.toLocaleString()}</p>
            <div className="flex gap-4 mt-2 text-sm">
              {pendingCount > 0 && (
                <span className="text-yellow-300">
                  {pendingCount} waiting
                </span>
              )}
              {receivedCount > 0 && (
                <span className="text-green-300">
                  {receivedCount} received
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
          Transactions
        </h3>
        {isLoading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5A7A8F] mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading...</p>
          </div>
        ) : (
          <WhtFromCustomerTable
            records={filteredRecords}
            showCompany={dataScope === 'all-companies'}
            onMarkAsReceived={handleMarkAsReceived}
            onViewReceipt={handleViewReceipt}
            onEdit={handleEdit}
          />
        )}
      </div>

      {/* Receive/Edit Modal */}
      {selectedRecord && (
        <WhtReceiveModal
          record={selectedRecord}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRecord(null);
          }}
          onSubmit={handleReceiveSubmit}
          mode={modalMode}
        />
      )}
    </div>
  );
}
