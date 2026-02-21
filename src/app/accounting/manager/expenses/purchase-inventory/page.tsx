'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Loader2, Package } from 'lucide-react';
import { inventoryPurchasesApi } from '@/lib/supabase/api/inventoryPurchases';
import type { InventoryPurchaseRow } from '@/lib/supabase/api/inventoryPurchases';
import { companiesApi } from '@/lib/supabase/api/companies';
import { dbCompanyToFrontend } from '@/lib/supabase/transforms';
import type { Company } from '@/data/company/types';
import { useDataScope } from '@/hooks/useDataScope';

export default function PurchaseInventoryPage() {
  const { companyIds } = useDataScope();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [purchases, setPurchases] = useState<InventoryPurchaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataScope, setDataScope] = useState('all-companies');

  // Load companies
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const companiesData = await companiesApi.getActive();
        const filtered = companyIds
          ? companiesData.filter((c) => companyIds.includes(c.id))
          : companiesData;
        setCompanies(filtered.map(dbCompanyToFrontend));
        if (companyIds && filtered.length === 1) {
          setDataScope(`company-${filtered[0].id}`);
        }
      } catch (error) {
        console.error('Failed to load companies:', error);
      }
    };
    loadCompanies();
  }, [companyIds]);

  // Load purchases
  useEffect(() => {
    const loadPurchases = async () => {
      setIsLoading(true);
      try {
        const data = await inventoryPurchasesApi.getAll();
        setPurchases(data);
      } catch (error) {
        console.error('Failed to load inventory purchases:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPurchases();
  }, []);

  // Filter purchases
  const filteredPurchases = useMemo(() => {
    let result = [...purchases];
    if (dataScope !== 'all-companies') {
      const companyId = dataScope.replace('company-', '');
      result = result.filter((p) => p.company_id === companyId);
    }
    return result;
  }, [purchases, dataScope]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'void':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompanyName = (companyId: string) => {
    return companies.find((c) => c.id === companyId)?.name || 'Unknown';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Purchase Inventory</h2>
          <p className="text-sm text-gray-500">
            Track inventory purchases from suppliers
          </p>
        </div>
        <Link
          href="/accounting/manager/expenses/purchase-inventory/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Purchase
        </Link>
      </div>

      {/* Company Filter */}
      {companies.length > 1 && (
        <div className="mb-4">
          <select
            value={dataScope}
            onChange={(e) => setDataScope(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
          >
            <option value="all-companies">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={`company-${c.id}`}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-[#5A7A8F]" />
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-[#5A7A8F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-[#5A7A8F]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Inventory Purchases Yet
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Create your first inventory purchase to start tracking stock.
            </p>
            <Link
              href="/accounting/manager/expenses/purchase-inventory/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Purchase
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  {companies.length > 1 && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Payable
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/accounting/manager/expenses/purchase-inventory/${purchase.id}`}
                        className="text-sm font-medium text-[#5A7A8F] hover:underline"
                      >
                        {purchase.purchase_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(purchase.purchase_date)}
                    </td>
                    {companies.length > 1 && (
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getCompanyName(purchase.company_id)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {purchase.vendor_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                      {purchase.category === 'provisions' ? 'Provisions' :
                       purchase.category === 'boat_parts' ? 'Boat Parts' :
                       purchase.category === 'office_supplies' ? 'Office Supplies' :
                       purchase.category === 'general' ? 'General' :
                       purchase.category?.replace(/_/g, ' ') || 'General'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {formatAmount(purchase.net_payable, purchase.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusBadge(purchase.status)}`}
                      >
                        {purchase.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${getPaymentBadge(purchase.payment_status)}`}
                      >
                        {purchase.payment_status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
