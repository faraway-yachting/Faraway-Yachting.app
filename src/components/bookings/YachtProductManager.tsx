'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { CurrencySelect } from '@/components/shared/CurrencySelect';
import {
  YachtProduct,
  YachtSource,
  ProductCharterType,
  productCharterTypeLabels,
  durationPresets,
  marinaPresets,
} from '@/data/yachtProduct/types';
import { yachtProductsApi } from '@/lib/supabase/api/yachtProducts';
import { Currency } from '@/data/company/types';

// Time presets for default time dropdown
const timePresets = [
  { value: '08:00 - 16:00', label: '08:00 - 16:00' },
  { value: '08:30 - 16:30', label: '08:30 - 16:30' },
  { value: '09:00 - 17:00', label: '09:00 - 17:00' },
  { value: '09:30 - 17:30', label: '09:30 - 17:30' },
  { value: '10:00 - 18:00', label: '10:00 - 18:00' },
  { value: '10:30 - 18:30', label: '10:30 - 18:30' },
  { value: '11:00 - 11:00', label: '11:00 - 11:00' },
];

interface YachtProductManagerProps {
  yachtSource: YachtSource;
  yachtId: string;
  yachtName: string;
  canEdit?: boolean;
}

export function YachtProductManager({
  yachtSource,
  yachtId,
  yachtName,
  canEdit = true,
}: YachtProductManagerProps) {
  const [products, setProducts] = useState<YachtProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Form state for new product
  const [formData, setFormData] = useState({
    name: '',
    charterType: 'full_day_charter' as ProductCharterType,
    duration: '',
    departFrom: '',
    destination: '',
    price: '',
    currency: 'THB' as Currency,
    defaultTime: '',
    defaultStartDay: '' as string,
    defaultNights: '' as string,
  });
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [showCustomDepartFrom, setShowCustomDepartFrom] = useState(false);

  // Load products
  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await yachtProductsApi.getByYacht(yachtSource, yachtId);
        setProducts(data);
      } catch (error: unknown) {
        // Gracefully handle case when table doesn't exist yet
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('yacht_products') || errorMessage.includes('relation')) {
          console.warn('Yacht products table not yet created. Run the migration first.');
        } else {
          console.error('Error loading yacht products:', error);
        }
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    }
    if (isExpanded) {
      loadProducts();
    }
  }, [yachtSource, yachtId, isExpanded]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      charterType: 'full_day_charter',
      duration: '',
      departFrom: '',
      destination: '',
      price: '',
      currency: 'THB',
      defaultTime: '',
      defaultStartDay: '',
      defaultNights: '',
    });
    setShowCustomDuration(false);
    setShowCustomDepartFrom(false);
    setShowAddForm(false);
    setEditingProductId(null);
  };

  // Handle form field change
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle duration dropdown change
  const handleDurationChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomDuration(true);
      setFormData(prev => ({ ...prev, duration: '' }));
    } else {
      setShowCustomDuration(false);
      setFormData(prev => ({ ...prev, duration: value }));
    }
  };

  // Handle depart from dropdown change
  const handleDepartFromChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomDepartFrom(true);
      setFormData(prev => ({ ...prev, departFrom: '' }));
    } else {
      setShowCustomDepartFrom(false);
      setFormData(prev => ({ ...prev, departFrom: value }));
    }
  };

  // Add new product
  const handleAddProduct = async () => {
    if (!formData.name.trim() || !formData.duration.trim()) return;

    try {
      const newProduct = await yachtProductsApi.create({
        yachtSource,
        projectId: yachtSource === 'own' ? yachtId : undefined,
        externalYachtId: yachtSource === 'external' ? yachtId : undefined,
        name: formData.name.trim(),
        charterType: formData.charterType,
        duration: formData.duration.trim(),
        departFrom: formData.departFrom.trim() || undefined,
        destination: formData.destination.trim() || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        currency: formData.currency,
        defaultTime: formData.defaultTime || undefined,
        defaultStartDay: formData.defaultStartDay !== '' ? parseInt(formData.defaultStartDay) : undefined,
        defaultNights: formData.defaultNights !== '' ? parseInt(formData.defaultNights) : undefined,
        displayOrder: products.length,
        isActive: true,
      });
      setProducts(prev => [...prev, newProduct]);
      resetForm();
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  // Start editing a product
  const handleStartEdit = (product: YachtProduct) => {
    setEditingProductId(product.id);
    setFormData({
      name: product.name,
      charterType: product.charterType,
      duration: product.duration,
      departFrom: product.departFrom || '',
      destination: product.destination || '',
      price: product.price?.toString() || '',
      currency: product.currency,
      defaultTime: product.defaultTime || '',
      defaultStartDay: product.defaultStartDay !== undefined && product.defaultStartDay !== null ? product.defaultStartDay.toString() : '',
      defaultNights: product.defaultNights !== undefined && product.defaultNights !== null ? product.defaultNights.toString() : '',
    });
    // Check if duration/departFrom are custom values
    const isCustomDuration = !durationPresets.some(p => p.value === product.duration);
    const isCustomDepartFrom = product.departFrom && !marinaPresets.includes(product.departFrom as typeof marinaPresets[number]);
    setShowCustomDuration(isCustomDuration);
    setShowCustomDepartFrom(!!isCustomDepartFrom);
    setShowAddForm(true);
  };

  // Save edited product
  const handleSaveEdit = async () => {
    if (!editingProductId || !formData.name.trim() || !formData.duration.trim()) return;

    try {
      const updated = await yachtProductsApi.update(editingProductId, {
        name: formData.name.trim(),
        charterType: formData.charterType,
        duration: formData.duration.trim(),
        departFrom: formData.departFrom.trim() || undefined,
        destination: formData.destination.trim() || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        currency: formData.currency,
        defaultTime: formData.defaultTime || undefined,
        defaultStartDay: formData.defaultStartDay !== '' ? parseInt(formData.defaultStartDay) : undefined,
        defaultNights: formData.defaultNights !== '' ? parseInt(formData.defaultNights) : undefined,
      });
      setProducts(prev => prev.map(p => (p.id === editingProductId ? updated : p)));
      resetForm();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    try {
      await yachtProductsApi.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      {/* Header with expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            Products ({products.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* Product list */}
              {products.length > 0 ? (
                <div className="space-y-2">
                  {products.map(product => (
                    <div
                      key={product.id}
                      className="bg-white border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">
                              {product.name}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {productCharterTypeLabels[product.charterType]}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-500 grid grid-cols-2 gap-x-4 gap-y-1">
                            <div>
                              <span className="text-gray-400">Duration:</span>{' '}
                              {product.duration}
                            </div>
                            {product.departFrom && (
                              <div>
                                <span className="text-gray-400">From:</span>{' '}
                                {product.departFrom}
                              </div>
                            )}
                            {product.destination && (
                              <div>
                                <span className="text-gray-400">To:</span>{' '}
                                {product.destination}
                              </div>
                            )}
                            {product.price && (
                              <div>
                                <span className="text-gray-400">Price:</span>{' '}
                                {product.price.toLocaleString()} {product.currency}
                              </div>
                            )}
                            {product.defaultTime && (
                              <div>
                                <span className="text-gray-400">Time:</span>{' '}
                                {product.defaultTime}
                              </div>
                            )}
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => handleStartEdit(product)}
                              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No products defined yet
                </div>
              )}

              {/* Add product button / form */}
              {canEdit && !showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </button>
              )}

              {/* Add/Edit product form */}
              {showAddForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">
                      {editingProductId ? 'Edit Product' : 'New Product'}
                    </h4>
                    <button
                      onClick={resetForm}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Product Name */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => handleChange('name', e.target.value)}
                        placeholder="e.g., Full Day Phi Phi"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Charter Type */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Charter Type *
                      </label>
                      <select
                        value={formData.charterType}
                        onChange={e =>
                          handleChange('charterType', e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {Object.entries(productCharterTypeLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Duration *
                      </label>
                      {showCustomDuration ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.duration}
                            onChange={e =>
                              handleChange('duration', e.target.value)
                            }
                            placeholder="e.g., 3 nights"
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowCustomDuration(false);
                              handleChange('duration', '');
                            }}
                            className="px-2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <select
                          value={formData.duration}
                          onChange={e => handleDurationChange(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select duration...</option>
                          {durationPresets.map(preset => (
                            <option key={preset.value} value={preset.value}>
                              {preset.label}
                            </option>
                          ))}
                          <option value="custom">Custom...</option>
                        </select>
                      )}
                    </div>

                    {/* Depart From */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Depart From
                      </label>
                      {showCustomDepartFrom ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.departFrom}
                            onChange={e =>
                              handleChange('departFrom', e.target.value)
                            }
                            placeholder="Enter location..."
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowCustomDepartFrom(false);
                              handleChange('departFrom', '');
                            }}
                            className="px-2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <select
                          value={formData.departFrom}
                          onChange={e =>
                            handleDepartFromChange(e.target.value)
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select marina...</option>
                          {marinaPresets.map(marina => (
                            <option key={marina} value={marina}>
                              {marina}
                            </option>
                          ))}
                          <option value="custom">Custom...</option>
                        </select>
                      )}
                    </div>

                    {/* Destination */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Destination
                      </label>
                      <input
                        type="text"
                        value={formData.destination}
                        onChange={e =>
                          handleChange('destination', e.target.value)
                        }
                        placeholder="e.g., Phi Phi Islands"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Price
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={formData.price}
                          onChange={e => handleChange('price', e.target.value)}
                          placeholder="0"
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <CurrencySelect
                          value={formData.currency}
                          onChange={(val) => handleChange('currency', val)}
                          className="w-20 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Default Time */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Default Time
                      </label>
                      <select
                        value={formData.defaultTime}
                        onChange={e =>
                          handleChange('defaultTime', e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">No default time</option>
                        {timePresets.map(preset => (
                          <option key={preset.value} value={preset.value}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Cabin Charter Schedule Fields */}
                  {formData.charterType === 'cabin_charter' && (
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-blue-200">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Default Start Day
                        </label>
                        <select
                          value={formData.defaultStartDay}
                          onChange={e => handleChange('defaultStartDay', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">No default</option>
                          <option value="0">Sunday</option>
                          <option value="1">Monday</option>
                          <option value="2">Tuesday</option>
                          <option value="3">Wednesday</option>
                          <option value="4">Thursday</option>
                          <option value="5">Friday</option>
                          <option value="6">Saturday</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Default Nights
                        </label>
                        <input
                          type="number"
                          value={formData.defaultNights}
                          onChange={e => handleChange('defaultNights', e.target.value)}
                          placeholder="e.g., 5"
                          min="1"
                          max="30"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Form actions */}
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={resetForm}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={
                        editingProductId ? handleSaveEdit : handleAddProduct
                      }
                      disabled={!formData.name.trim() || !formData.duration.trim()}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {editingProductId ? 'Save Changes' : 'Add Product'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
