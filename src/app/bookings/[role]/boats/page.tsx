'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  Anchor, Plus, Pencil, Trash2, Search, Ship, X,
  ChevronDown, ChevronUp, Upload, Loader2, User, Phone, Users, LayoutList,
  Eye, Download, FileText,
} from 'lucide-react';
import { externalBoatsApi, DbExternalBoat } from '@/lib/supabase/api/externalBoats';
import { contactsApi } from '@/lib/supabase/api/contacts';
import { DynamicSelect } from '@/components/bookings/form/DynamicSelect';
import { YachtProductManager } from '@/components/bookings/YachtProductManager';
import { createClient } from '@/lib/supabase/client';

interface OperatorContact {
  id: string;
  name: string;
  type: string[];
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
}

const PRIMARY = '#5A7A8F';

type BoatFormData = {
  name: string;
  display_name: string;
  operator_name: string;
  depart_from: string;
  picture_url: string;
  contract_url: string;
  contract_filename: string;
  contact_person: string;
  contact_channel: string;
  contact_value: string;
  notes: string;
  is_active: boolean;
};

const emptyForm: BoatFormData = {
  name: '',
  display_name: '',
  operator_name: '',
  depart_from: '',
  picture_url: '',
  contract_url: '',
  contract_filename: '',
  contact_person: '',
  contact_channel: '',
  contact_value: '',
  notes: '',
  is_active: true,
};

export default function BoatsPage() {
  const params = useParams();
  const role = params.role as string;
  const canEdit = role === 'admin' || role === 'manager';

  const [boats, setBoats] = useState<DbExternalBoat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [groupByOperator, setGroupByOperator] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBoat, setEditingBoat] = useState<DbExternalBoat | null>(null);
  const [form, setForm] = useState<BoatFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Operator contact search
  const [operatorContacts, setOperatorContacts] = useState<OperatorContact[]>([]);
  const [operatorSearch, setOperatorSearch] = useState('');
  const [showOperatorDropdown, setShowOperatorDropdown] = useState(false);
  const [selectedOperatorContactId, setSelectedOperatorContactId] = useState<string | null>(null);

  useEffect(() => {
    loadBoats();
    contactsApi.getBoatOperators().then((data) => setOperatorContacts(data as OperatorContact[])).catch(console.error);
  }, []);

  async function loadBoats() {
    setLoading(true);
    try {
      const data = await externalBoatsApi.getAll();
      setBoats(data);
    } catch (err) {
      console.error('Failed to load boats:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return boats.filter((b) => {
      // Operator filter
      if (operatorFilter !== 'all') {
        const op = b.operator_name ?? '';
        if (operatorFilter === '_none' && op) return false;
        if (operatorFilter !== '_none' && op !== operatorFilter) return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !b.name.toLowerCase().includes(q) &&
          !(b.operator_name ?? '').toLowerCase().includes(q) &&
          !(b.contact_person ?? '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [boats, searchQuery, operatorFilter]);

  // Unique operator names for filter dropdown
  const operatorNames = useMemo(() => {
    const names = new Set<string>();
    boats.forEach((b) => { if (b.operator_name) names.add(b.operator_name); });
    return Array.from(names).sort();
  }, [boats]);

  // Group by operator
  const grouped = useMemo(() => {
    if (!groupByOperator) return null;
    const groups: { operator: string; boats: DbExternalBoat[] }[] = [];
    const map = new Map<string, DbExternalBoat[]>();
    filtered.forEach((b) => {
      const key = b.operator_name || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    // Sort: named operators first alphabetically, then "No Operator"
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    });
    keys.forEach((k) => groups.push({ operator: k, boats: map.get(k)! }));
    return groups;
  }, [filtered, groupByOperator]);

  function openAdd() {
    setEditingBoat(null);
    setForm(emptyForm);
    setPictureFile(null);
    setContractFile(null);
    setErrorMsg(null);
    setOperatorSearch('');
    setSelectedOperatorContactId(null);
    setShowOperatorDropdown(false);
    setModalOpen(true);
  }

  function openEdit(boat: DbExternalBoat) {
    setEditingBoat(boat);
    setForm({
      name: boat.name,
      display_name: boat.display_name,
      operator_name: boat.operator_name ?? '',
      depart_from: boat.depart_from ?? '',
      picture_url: boat.picture_url ?? '',
      contract_url: boat.contract_url ?? '',
      contract_filename: boat.contract_filename ?? '',
      contact_person: boat.contact_person ?? '',
      contact_channel: boat.contact_channel ?? '',
      contact_value: boat.contact_value ?? '',
      notes: boat.notes ?? '',
      is_active: boat.is_active,
    });
    setPictureFile(null);
    setContractFile(null);
    setErrorMsg(null);
    setOperatorSearch(boat.operator_name ?? '');
    setSelectedOperatorContactId(boat.contact_id ?? null);
    setShowOperatorDropdown(false);
    setModalOpen(true);
  }

  // Show all operators when search is empty, otherwise filter by search term
  const filteredOperatorContacts = operatorSearch.trim()
    ? operatorContacts.filter((c) => c.name.toLowerCase().includes(operatorSearch.toLowerCase()))
    : operatorContacts;

  function handleOperatorSelect(contact: OperatorContact) {
    setSelectedOperatorContactId(contact.id);
    setOperatorSearch(contact.name);
    updateForm('operator_name', contact.name);
    setShowOperatorDropdown(false);
  }

  async function uploadFile(file: File, folder: string, boatId: string): Promise<string | null> {
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `boats/${boatId}/${folder}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage
      .from('booking-attachments')
      .upload(path, file, { upsert: true });
    if (error) {
      console.error(`Upload error (${folder}):`, error);
      return null;
    }
    const { data: urlData } = supabase.storage.from('booking-attachments').getPublicUrl(path);
    return urlData.publicUrl;
  }

  async function handleSave() {
    if (!form.name.trim() || !form.display_name.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      // Resolve operator contact_id
      let contactId = selectedOperatorContactId;
      const operatorName = form.operator_name.trim();
      if (operatorName && !contactId) {
        // Create a new contact with type 'boat_operator'
        const newContact = await contactsApi.create({
          name: operatorName,
          type: ['boat_operator'],
          is_active: true,
        });
        contactId = newContact.id;
        setOperatorContacts((prev) => [...prev, newContact as OperatorContact]);
      }

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        display_name: form.display_name.trim(),
        operator_name: operatorName || null,
        contact_id: contactId || null,
        depart_from: form.depart_from || null,
        picture_url: form.picture_url || null,
        contract_url: form.contract_url || null,
        contract_filename: form.contract_filename || null,
        contact_person: form.contact_person.trim() || null,
        contact_channel: form.contact_channel || null,
        contact_value: form.contact_value.trim() || null,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
      };

      // For new boats, create first to get an ID for file uploads
      let boatId = editingBoat?.id;

      if (!boatId) {
        // Remove blob URLs before saving — will upload after we have an ID
        if (pictureFile) payload.picture_url = null;
        if (contractFile) { payload.contract_url = null; payload.contract_filename = null; }
        const created = await externalBoatsApi.create(payload as Parameters<typeof externalBoatsApi.create>[0]);
        boatId = created.id;
      }

      // Upload files if selected
      const updates: Record<string, unknown> = {};
      if (pictureFile) {
        const url = await uploadFile(pictureFile, 'pictures', boatId);
        if (url) updates.picture_url = url;
      }
      if (contractFile) {
        const url = await uploadFile(contractFile, 'contracts', boatId);
        if (url) { updates.contract_url = url; updates.contract_filename = contractFile.name; }
      }

      if (editingBoat) {
        // Update with all fields + any uploaded file URLs
        const updated = await externalBoatsApi.update(boatId, { ...payload, ...updates } as Parameters<typeof externalBoatsApi.update>[1]);
        setBoats((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      } else {
        // If we uploaded files for the new boat, update it
        if (Object.keys(updates).length > 0) {
          const updated = await externalBoatsApi.update(boatId, updates as Parameters<typeof externalBoatsApi.update>[1]);
          setBoats((prev) => [...prev, updated].sort((a, b) => a.name.localeCompare(b.name)));
        } else {
          // Re-fetch the created boat to get full data
          const created = await externalBoatsApi.getById(boatId);
          if (created) setBoats((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
      setPictureFile(null);
      setContractFile(null);
      setModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to save boat:', err);
      setErrorMsg(`Failed to save: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this boat?')) return;
    setDeleting(id);
    try {
      await externalBoatsApi.delete(id);
      setBoats((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Failed to delete boat:', err);
      alert('Failed to delete boat.');
    } finally {
      setDeleting(null);
    }
  }

  function updateForm<K extends keyof BoatFormData>(key: K, value: BoatFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function renderBoatCard(boat: DbExternalBoat) {
    const isExpanded = expandedId === boat.id;
    return (
      <div
        key={boat.id}
        className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="flex items-start gap-4 p-5">
          <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
            {boat.picture_url ? (
              <img src={boat.picture_url} alt={boat.name} className="w-full h-full object-cover" />
            ) : (
              <Ship className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{boat.name}</h3>
                <p className="text-sm text-gray-500">{boat.display_name}</p>
                {!groupByOperator && boat.operator_name && (
                  <p className="text-sm text-gray-500 mt-0.5">Operator: {boat.operator_name}</p>
                )}
              </div>
              <span
                className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  boat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {boat.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-gray-600">
              {boat.contact_person && (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  {boat.contact_person}
                  {boat.contact_channel && ` (${boat.contact_channel})`}
                </span>
              )}
              {boat.contact_value && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  {boat.contact_value}
                </span>
              )}
              {boat.depart_from && (
                <span className="flex items-center gap-1.5">
                  <Anchor className="h-3.5 w-3.5 text-gray-400" />
                  {boat.depart_from}
                </span>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="flex-shrink-0 flex items-center gap-1">
              <button
                onClick={() => openEdit(boat)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(boat.id)}
                disabled={deleting === boat.id}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete"
              >
                {deleting === boat.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setExpandedId(isExpanded ? null : boat.id)}
          className="w-full flex items-center justify-center gap-1 py-2 border-t border-gray-100 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          {isExpanded ? (
            <><ChevronUp className="h-4 w-4" /> Hide Products</>
          ) : (
            <><ChevronDown className="h-4 w-4" /> Show Products</>
          )}
        </button>
        {isExpanded && (
          <div className="border-t border-gray-100 p-5 bg-gray-50/50">
            <YachtProductManager
              yachtSource="external"
              yachtId={boat.id}
              yachtName={boat.name}
              canEdit={canEdit}
            />
          </div>
        )}
      </div>
    );
  }

  // -- Render --

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: PRIMARY }} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Anchor className="h-7 w-7" style={{ color: PRIMARY }} />
          <h1 className="text-2xl font-bold text-gray-800">Boat Register</h1>
        </div>
        {canEdit && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: PRIMARY }}
          >
            <Plus className="h-4 w-4" />
            Add External Boat
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, operator, or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': PRIMARY } as React.CSSProperties}
          />
        </div>

        {/* Operator filter */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <select
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white"
            style={{ '--tw-ring-color': PRIMARY } as React.CSSProperties}
          >
            <option value="all">All Operators</option>
            {operatorNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
            <option value="_none">No Operator</option>
          </select>
        </div>

        {/* Group toggle */}
        <button
          onClick={() => setGroupByOperator(!groupByOperator)}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${
            groupByOperator
              ? 'border-[#5A7A8F] bg-[#5A7A8F]/10 text-[#5A7A8F]'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
          title={groupByOperator ? 'Ungroup' : 'Group by operator'}
        >
          <LayoutList className="h-4 w-4" />
          Group by Operator
        </button>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          {searchQuery || operatorFilter !== 'all' ? 'No boats match your filters.' : 'No external boats registered yet.'}
        </div>
      ) : groupByOperator && grouped ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.operator || '_none'}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-[#5A7A8F]" />
                <h2 className="text-sm font-semibold text-[#5A7A8F] uppercase tracking-wide">
                  {group.operator || 'No Operator'}
                </h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {group.boats.length} {group.boats.length === 1 ? 'boat' : 'boats'}
                </span>
                <div className="flex-1 border-t border-gray-200 ml-2" />
              </div>
              <div className="space-y-3">
                {group.boats.map((boat) => renderBoatCard(boat))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((boat) => renderBoatCard(boat))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !saving && setModalOpen(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingBoat ? 'Edit External Boat' : 'Add External Boat'}
              </h2>
              <button
                onClick={() => !saving && setModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4">
              {/* Row: Name + Display Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Boat Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': PRIMARY } as React.CSSProperties}
                    placeholder="e.g. Sea Explorer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.display_name}
                    onChange={(e) => updateForm('display_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': PRIMARY } as React.CSSProperties}
                    placeholder="e.g. Sea Explorer 42ft"
                  />
                </div>
              </div>

              {/* Operator Name — linked to Contacts */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operator Name
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={operatorSearch}
                    onChange={(e) => {
                      setOperatorSearch(e.target.value);
                      updateForm('operator_name', e.target.value);
                      setShowOperatorDropdown(true);
                      setSelectedOperatorContactId(null);
                    }}
                    onFocus={() => setShowOperatorDropdown(true)}
                    onBlur={() => {
                      // Delay closing to allow click on dropdown items
                      setTimeout(() => setShowOperatorDropdown(false), 200);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': PRIMARY } as React.CSSProperties}
                    placeholder="Select or type operator name..."
                  />
                </div>
                {showOperatorDropdown && filteredOperatorContacts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {filteredOperatorContacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleOperatorSelect(contact)}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors flex items-center gap-2"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                          {contact.email && (
                            <p className="text-xs text-gray-500">{contact.email}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedOperatorContactId && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Linked to existing contact
                  </p>
                )}
                {operatorSearch && !selectedOperatorContactId && (
                  <p className="text-xs text-gray-500 mt-1">
                    New contact will be created on save
                  </p>
                )}
              </div>

              {/* Depart From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Depart From
                </label>
                <DynamicSelect
                  category="departure_location"
                  value={form.depart_from}
                  onChange={(v) => updateForm('depart_from', v)}
                  placeholder="Select departure location..."
                />
              </div>

              {/* Picture upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Picture
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                    <Upload className="h-4 w-4" />
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPictureFile(file);
                          updateForm('picture_url', URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                  {form.picture_url && (
                    <span className="text-sm text-gray-500 truncate max-w-[150px]">
                      Image selected
                    </span>
                  )}
                  {/* View/Download buttons for existing picture (not blob URL) */}
                  {form.picture_url && !form.picture_url.startsWith('blob:') && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => window.open(form.picture_url, '_blank')}
                        className="p-2 text-gray-500 hover:text-[#5A7A8F] hover:bg-gray-100 rounded-lg transition-colors"
                        title="View image"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <a
                        href={form.picture_url}
                        download
                        className="p-2 text-gray-500 hover:text-[#5A7A8F] hover:bg-gray-100 rounded-lg transition-colors"
                        title="Download image"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Contract upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                    <Upload className="h-4 w-4" />
                    Choose File
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setContractFile(file);
                          updateForm('contract_filename', file.name);
                          updateForm('contract_url', file.name);
                        }
                      }}
                    />
                  </label>
                  {form.contract_filename && (
                    <span className="text-sm text-gray-500 truncate max-w-[150px] flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                      {form.contract_filename}
                    </span>
                  )}
                  {/* View/Download buttons for existing contract (valid URL) */}
                  {form.contract_url && form.contract_url.startsWith('http') && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => window.open(form.contract_url, '_blank')}
                        className="p-2 text-gray-500 hover:text-[#5A7A8F] hover:bg-gray-100 rounded-lg transition-colors"
                        title="View contract"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <a
                        href={form.contract_url}
                        download={form.contract_filename || 'contract'}
                        className="p-2 text-gray-500 hover:text-[#5A7A8F] hover:bg-gray-100 rounded-lg transition-colors"
                        title="Download contract"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={form.contact_person}
                    onChange={(e) => updateForm('contact_person', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': PRIMARY } as React.CSSProperties}
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Channel
                  </label>
                  <DynamicSelect
                    category="contact_channel"
                    value={form.contact_channel}
                    onChange={(v) => updateForm('contact_channel', v)}
                    placeholder="Select channel..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Value
                  </label>
                  <input
                    type="text"
                    value={form.contact_value}
                    onChange={(e) => updateForm('contact_value', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': PRIMARY } as React.CSSProperties}
                    placeholder="Phone or email"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                  style={{ '--tw-ring-color': PRIMARY } as React.CSSProperties}
                  placeholder="Additional notes..."
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateForm('is_active', !form.is_active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.is_active ? '' : 'bg-gray-300'
                  }`}
                  style={form.is_active ? { backgroundColor: PRIMARY } : undefined}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-700">
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="mx-6 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.display_name.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: PRIMARY }}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingBoat ? 'Save Changes' : 'Create Boat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
