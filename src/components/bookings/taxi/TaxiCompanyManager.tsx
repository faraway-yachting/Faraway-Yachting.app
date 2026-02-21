'use client';

import { useState } from 'react';
import { X, Plus, Edit2, Trash2, Link2, Copy, Check, ChevronDown, ChevronRight, Car, User } from 'lucide-react';
import { TaxiCompany, TaxiPublicLink, TaxiDriver, TaxiVehicle } from '@/data/taxi/types';
import { taxiCompaniesApi } from '@/lib/supabase/api/taxiCompanies';
import { taxiPublicLinksApi } from '@/lib/supabase/api/taxiPublicLinks';
import { taxiDriversApi } from '@/lib/supabase/api/taxiDrivers';
import { taxiVehiclesApi } from '@/lib/supabase/api/taxiVehicles';
import { useAllTaxiCompanies, useAllTaxiDriversByCompany, useAllTaxiVehiclesByCompany } from '@/hooks/queries/useTaxiTransfers';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// ── Drivers & Vehicles sub-component ──
function CompanyDriversVehicles({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const { data: drivers = [] } = useAllTaxiDriversByCompany(companyId);
  const { data: vehicles = [] } = useAllTaxiVehiclesByCompany(companyId);

  // Driver form
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverNotes, setDriverNotes] = useState('');
  const [savingDriver, setSavingDriver] = useState(false);

  // Vehicle form
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleDescription, setVehicleDescription] = useState('');
  const [vehicleNotes, setVehicleNotes] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);

  const resetDriverForm = () => { setDriverName(''); setDriverPhone(''); setDriverNotes(''); setEditingDriverId(null); setShowDriverForm(false); };
  const resetVehicleForm = () => { setPlateNumber(''); setVehicleDescription(''); setVehicleNotes(''); setEditingVehicleId(null); setShowVehicleForm(false); };

  const startEditDriver = (d: TaxiDriver) => {
    setEditingDriverId(d.id); setDriverName(d.name); setDriverPhone(d.phone || ''); setDriverNotes(d.notes || ''); setShowDriverForm(true);
  };
  const startEditVehicle = (v: TaxiVehicle) => {
    setEditingVehicleId(v.id); setPlateNumber(v.plateNumber); setVehicleDescription(v.description || ''); setVehicleNotes(v.notes || ''); setShowVehicleForm(true);
  };

  const handleSaveDriver = async () => {
    if (!driverName.trim()) return;
    setSavingDriver(true);
    try {
      if (editingDriverId) {
        await taxiDriversApi.update(editingDriverId, { name: driverName, phone: driverPhone, notes: driverNotes });
      } else {
        await taxiDriversApi.create({ taxiCompanyId: companyId, name: driverName, phone: driverPhone, notes: driverNotes });
      }
      queryClient.invalidateQueries({ queryKey: ['taxiDrivers'] });
      resetDriverForm();
    } finally { setSavingDriver(false); }
  };

  const handleSaveVehicle = async () => {
    if (!plateNumber.trim()) return;
    setSavingVehicle(true);
    try {
      if (editingVehicleId) {
        await taxiVehiclesApi.update(editingVehicleId, { plateNumber, description: vehicleDescription, notes: vehicleNotes });
      } else {
        await taxiVehiclesApi.create({ taxiCompanyId: companyId, plateNumber, description: vehicleDescription, notes: vehicleNotes });
      }
      queryClient.invalidateQueries({ queryKey: ['taxiVehicles'] });
      resetVehicleForm();
    } finally { setSavingVehicle(false); }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!confirm('Delete this driver?')) return;
    await taxiDriversApi.delete(id);
    queryClient.invalidateQueries({ queryKey: ['taxiDrivers'] });
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return;
    await taxiVehiclesApi.delete(id);
    queryClient.invalidateQueries({ queryKey: ['taxiVehicles'] });
  };

  const handleToggleDriverActive = async (d: TaxiDriver) => {
    await taxiDriversApi.update(d.id, { isActive: !d.isActive });
    queryClient.invalidateQueries({ queryKey: ['taxiDrivers'] });
  };

  const handleToggleVehicleActive = async (v: TaxiVehicle) => {
    await taxiVehiclesApi.update(v.id, { isActive: !v.isActive });
    queryClient.invalidateQueries({ queryKey: ['taxiVehicles'] });
  };

  const inputClass = 'w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="mt-3 space-y-4">
      {/* ── Drivers ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1">
            <User className="h-3.5 w-3.5" /> Drivers
          </span>
          {!showDriverForm && (
            <button onClick={() => { resetDriverForm(); setShowDriverForm(true); }} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add
            </button>
          )}
        </div>

        {showDriverForm && (
          <div className="mb-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Name *</label>
                <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Phone</label>
                <input type="text" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Notes</label>
                <input type="text" value={driverNotes} onChange={(e) => setDriverNotes(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={resetDriverForm} className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSaveDriver} disabled={savingDriver || !driverName.trim()} className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {savingDriver ? 'Saving...' : editingDriverId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        )}

        {drivers.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No drivers yet</p>
        ) : (
          <div className="space-y-1">
            {drivers.map((d) => (
              <div key={d.id} className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${d.isActive ? '' : 'opacity-50'}`}>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-800">{d.name}</span>
                  {d.phone && <span className="text-xs text-gray-500">{d.phone}</span>}
                  {d.notes && <span className="text-xs text-gray-400 italic">{d.notes}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEditDriver(d)} className="p-1 text-gray-400 hover:text-gray-600"><Edit2 className="h-3 w-3" /></button>
                  <button onClick={() => handleToggleDriverActive(d)} className={`px-1.5 py-0.5 text-[10px] rounded ${d.isActive ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-100'}`}>
                    {d.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => handleDeleteDriver(d.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Vehicles ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1">
            <Car className="h-3.5 w-3.5" /> Vehicles
          </span>
          {!showVehicleForm && (
            <button onClick={() => { resetVehicleForm(); setShowVehicleForm(true); }} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add
            </button>
          )}
        </div>

        {showVehicleForm && (
          <div className="mb-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Plate Number *</label>
                <input type="text" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Description</label>
                <input type="text" value={vehicleDescription} onChange={(e) => setVehicleDescription(e.target.value)} placeholder="e.g. Toyota Commuter" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Notes</label>
                <input type="text" value={vehicleNotes} onChange={(e) => setVehicleNotes(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={resetVehicleForm} className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSaveVehicle} disabled={savingVehicle || !plateNumber.trim()} className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {savingVehicle ? 'Saving...' : editingVehicleId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        )}

        {vehicles.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No vehicles yet</p>
        ) : (
          <div className="space-y-1">
            {vehicles.map((v) => (
              <div key={v.id} className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${v.isActive ? '' : 'opacity-50'}`}>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-800">{v.plateNumber}</span>
                  {v.description && <span className="text-xs text-gray-500">{v.description}</span>}
                  {v.notes && <span className="text-xs text-gray-400 italic">{v.notes}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEditVehicle(v)} className="p-1 text-gray-400 hover:text-gray-600"><Edit2 className="h-3 w-3" /></button>
                  <button onClick={() => handleToggleVehicleActive(v)} className={`px-1.5 py-0.5 text-[10px] rounded ${v.isActive ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-100'}`}>
                    {v.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => handleDeleteVehicle(v.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TaxiCompanyManagerProps {
  onClose: () => void;
}

export function TaxiCompanyManager({ onClose }: TaxiCompanyManagerProps) {
  const queryClient = useQueryClient();
  const { data: companies = [], isLoading } = useAllTaxiCompanies();
  const { data: allLinks = [] } = useQuery({
    queryKey: ['taxiPublicLinks'],
    queryFn: () => taxiPublicLinksApi.getAll(),
    staleTime: 60 * 1000,
  });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [lineId, setLineId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setLineId('');
    setNotes('');
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (company: TaxiCompany) => {
    setEditingId(company.id);
    setName(company.name);
    setContactPerson(company.contactPerson || '');
    setPhone(company.phone || '');
    setEmail(company.email || '');
    setLineId(company.lineId || '');
    setNotes(company.notes || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await taxiCompaniesApi.update(editingId, { name, contactPerson, phone, email, lineId, notes });
      } else {
        await taxiCompaniesApi.create({ name, contactPerson, phone, email, lineId, notes });
      }
      queryClient.invalidateQueries({ queryKey: ['taxiCompanies'] });
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this taxi company? This will unlink all transfers.')) return;
    await taxiCompaniesApi.delete(id);
    queryClient.invalidateQueries({ queryKey: ['taxiCompanies'] });
  };

  const handleToggleActive = async (company: TaxiCompany) => {
    await taxiCompaniesApi.update(company.id, { isActive: !company.isActive });
    queryClient.invalidateQueries({ queryKey: ['taxiCompanies'] });
  };

  const handleGenerateLink = async (company: TaxiCompany) => {
    await taxiPublicLinksApi.create({
      label: company.name,
      taxiCompanyId: company.id,
    });
    queryClient.invalidateQueries({ queryKey: ['taxiPublicLinks'] });
  };

  const handleCopyLink = (link: TaxiPublicLink) => {
    const url = `${window.location.origin}/public/taxi/${link.token}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkId(link.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleDeleteLink = async (linkId: string) => {
    await taxiPublicLinksApi.delete(linkId);
    queryClient.invalidateQueries({ queryKey: ['taxiPublicLinks'] });
  };

  const getCompanyLinks = (companyId: string) =>
    allLinks.filter(l => l.taxiCompanyId === companyId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Taxi Companies</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add button */}
          {!showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
              Add Company
            </button>
          )}

          {/* Form */}
          {showForm && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {editingId ? 'Edit Company' : 'New Company'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">LINE ID</label>
                  <input
                    type="text"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={resetForm} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {/* Company list */}
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : companies.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">No taxi companies yet</p>
          ) : (
            <div className="space-y-3">
              {companies.map((company) => {
                const links = getCompanyLinks(company.id);
                return (
                  <div key={company.id} className={`border rounded-lg p-4 ${company.isActive ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{company.name}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                          {company.contactPerson && <span>{company.contactPerson}</span>}
                          {company.phone && <span>{company.phone}</span>}
                          {company.email && <span>{company.email}</span>}
                          {company.lineId && <span>LINE: {company.lineId}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(company)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(company)}
                          className={`px-2 py-1 text-xs rounded ${company.isActive ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-100'}`}
                        >
                          {company.isActive ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => handleDelete(company.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Public links */}
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500">Public Schedule Link</span>
                        {links.length === 0 && (
                          <button
                            onClick={() => handleGenerateLink(company)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Link2 className="h-3 w-3" />
                            Generate Link
                          </button>
                        )}
                      </div>
                      {links.map(link => (
                        <div key={link.id} className="flex items-center gap-2 mt-1">
                          <code className="flex-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded truncate">
                            {window.location.origin}/public/taxi/{link.token}
                          </code>
                          <button
                            onClick={() => handleCopyLink(link)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Copy link"
                          >
                            {copiedLinkId === link.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteLink(link.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Delete link"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Drivers & Vehicles expand toggle */}
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setExpandedCompanyId(expandedCompanyId === company.id ? null : company.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-[#5A7A8F] hover:text-[#4a6a7f]"
                      >
                        {expandedCompanyId === company.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        Drivers & Vehicles
                      </button>
                    </div>

                    {/* Drivers & Vehicles sections */}
                    {expandedCompanyId === company.id && (
                      <CompanyDriversVehicles companyId={company.id} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
