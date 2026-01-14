"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Company, Address, ContactInformation, Currency } from "@/data/company/types";

interface CompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (companyData: Partial<Company>) => Promise<void>;
  editingCompany?: Company | null;
}

const emptAddress: Address = {
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const emptyContactInfo: ContactInformation = {
  primaryContactName: "",
  phoneNumber: "",
  email: "",
};

export function CompanyFormModal({
  isOpen,
  onClose,
  onSave,
  editingCompany,
}: CompanyFormModalProps) {
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [registeredAddress, setRegisteredAddress] = useState<Address>(emptAddress);
  const [billingAddress, setBillingAddress] = useState<Address>(emptAddress);
  const [sameAsBillingAddress, setSameAsBillingAddress] = useState(true);
  const [contactInformation, setContactInformation] = useState<ContactInformation>(emptyContactInfo);
  const [isActive, setIsActive] = useState(true);
  const [currency, setCurrency] = useState<Currency>("THB");
  const [fiscalYearEnd, setFiscalYearEnd] = useState("");
  const [isVatRegistered, setIsVatRegistered] = useState(false);
  const [vatRate, setVatRate] = useState("");

  // Form validation errors and submission state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize form with editing company data
  useEffect(() => {
    if (editingCompany) {
      setName(editingCompany.name || "");
      setTaxId(editingCompany.taxId || "");
      // Ensure all address fields have string values (not undefined)
      setRegisteredAddress({
        street: editingCompany.registeredAddress?.street || "",
        city: editingCompany.registeredAddress?.city || "",
        state: editingCompany.registeredAddress?.state || "",
        postalCode: editingCompany.registeredAddress?.postalCode || "",
        country: editingCompany.registeredAddress?.country || "",
      });
      setBillingAddress({
        street: editingCompany.billingAddress?.street || "",
        city: editingCompany.billingAddress?.city || "",
        state: editingCompany.billingAddress?.state || "",
        postalCode: editingCompany.billingAddress?.postalCode || "",
        country: editingCompany.billingAddress?.country || "",
      });
      setSameAsBillingAddress(editingCompany.sameAsBillingAddress ?? true);
      setContactInformation({
        primaryContactName: editingCompany.contactInformation?.primaryContactName || "",
        phoneNumber: editingCompany.contactInformation?.phoneNumber || "",
        email: editingCompany.contactInformation?.email || "",
      });
      setIsActive(editingCompany.isActive ?? true);
      setCurrency(editingCompany.currency || "THB");
      setFiscalYearEnd(editingCompany.fiscalYearEnd || "");
      setIsVatRegistered(editingCompany.isVatRegistered || false);
      setVatRate(editingCompany.vatRate?.toString() || "");
    } else {
      // Reset form for new company
      setName("");
      setTaxId("");
      setRegisteredAddress(emptAddress);
      setBillingAddress(emptAddress);
      setSameAsBillingAddress(true);
      setContactInformation(emptyContactInfo);
      setIsActive(true);
      setCurrency("THB");
      setFiscalYearEnd("");
      setIsVatRegistered(false);
      setVatRate("");
    }
    setErrors({});
  }, [editingCompany, isOpen]);

  // Auto-sync billing address when registered address changes and checkbox is checked
  useEffect(() => {
    if (sameAsBillingAddress) {
      setBillingAddress({ ...registeredAddress });
    }
  }, [registeredAddress, sameAsBillingAddress]);

  const handleSameAddressChange = (checked: boolean) => {
    setSameAsBillingAddress(checked);
    if (checked) {
      setBillingAddress({ ...registeredAddress });
    }
  };

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length >= 7;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Company name validation
    if (!name.trim() || name.length < 2) {
      newErrors.name = "Company name must be at least 2 characters";
    }

    // Tax ID validation
    if (!taxId.trim() || taxId.length > 50) {
      newErrors.taxId = "Tax ID is required (max 50 characters)";
    }

    // Registered address validation
    if (!registeredAddress.street.trim()) {
      newErrors.registeredStreet = "Street address is required";
    }
    if (!registeredAddress.city.trim()) {
      newErrors.registeredCity = "City is required";
    }
    if (!registeredAddress.state.trim()) {
      newErrors.registeredState = "State/Province is required";
    }
    if (!registeredAddress.postalCode.trim()) {
      newErrors.registeredPostalCode = "Postal code is required";
    }
    if (!registeredAddress.country.trim()) {
      newErrors.registeredCountry = "Country is required";
    }

    // Billing address validation (if different from registered)
    if (!sameAsBillingAddress) {
      if (!billingAddress.street.trim()) {
        newErrors.billingStreet = "Street address is required";
      }
      if (!billingAddress.city.trim()) {
        newErrors.billingCity = "City is required";
      }
      if (!billingAddress.state.trim()) {
        newErrors.billingState = "State/Province is required";
      }
      if (!billingAddress.postalCode.trim()) {
        newErrors.billingPostalCode = "Postal code is required";
      }
      if (!billingAddress.country.trim()) {
        newErrors.billingCountry = "Country is required";
      }
    }

    // Contact information validation
    if (!contactInformation.primaryContactName.trim()) {
      newErrors.contactName = "Primary contact name is required";
    }
    if (!contactInformation.email.trim()) {
      newErrors.contactEmail = "Email is required";
    } else if (!validateEmail(contactInformation.email)) {
      newErrors.contactEmail = "Invalid email format";
    }
    if (contactInformation.phoneNumber.trim() && !validatePhone(contactInformation.phoneNumber)) {
      newErrors.contactPhone = "Phone number must have at least 7 digits";
    }

    // VAT rate validation
    if (isVatRegistered && vatRate.trim()) {
      const vatRateNum = parseFloat(vatRate);
      if (isNaN(vatRateNum) || vatRateNum < 0 || vatRateNum > 100) {
        newErrors.vatRate = "VAT rate must be between 0 and 100";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const companyData: Partial<Company> = {
      name,
      taxId,
      registeredAddress,
      billingAddress: sameAsBillingAddress ? { ...registeredAddress } : billingAddress,
      sameAsBillingAddress,
      contactInformation,
      isActive,
      currency,
      fiscalYearEnd: fiscalYearEnd || undefined,
      isVatRegistered,
      vatRate: isVatRegistered && vatRate ? parseFloat(vatRate) : undefined,
    };

    try {
      await onSave(companyData);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save company');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingCompany ? "Edit Company" : "Add New Company"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Submit Error */}
          {submitError && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* Company Details Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Company Details</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter company name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Identification Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="taxId"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                    errors.taxId ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="e.g., 0-1055-12345-67-8"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Supports international formats (alphanumeric and special characters)
                </p>
                {errors.taxId && <p className="mt-1 text-sm text-red-600">{errors.taxId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                  >
                    <option value="THB">THB - Thai Baht</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="SGD">SGD - Singapore Dollar</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="fiscalYearEnd" className="block text-sm font-medium text-gray-700 mb-1">
                    Fiscal Year End
                  </label>
                  <input
                    type="date"
                    id="fiscalYearEnd"
                    value={fiscalYearEnd}
                    onChange={(e) => setFiscalYearEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isVatRegistered"
                  checked={isVatRegistered}
                  onChange={(e) => setIsVatRegistered(e.target.checked)}
                  className="h-4 w-4 text-[#5A7A8F] focus:ring-[#5A7A8F] border-gray-300 rounded"
                />
                <label htmlFor="isVatRegistered" className="ml-2 block text-sm text-gray-700">
                  VAT Registered
                </label>
              </div>

              {isVatRegistered && (
                <div>
                  <label htmlFor="vatRate" className="block text-sm font-medium text-gray-700 mb-1">
                    VAT Rate (%)
                  </label>
                  <input
                    type="number"
                    id="vatRate"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      errors.vatRate ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="e.g., 7"
                  />
                  {errors.vatRate && <p className="mt-1 text-sm text-red-600">{errors.vatRate}</p>}
                  <p className="mt-1 text-xs text-gray-500">Enter VAT rate as a percentage (e.g., 7 for 7%)</p>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-[#5A7A8F] focus:ring-[#5A7A8F] border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Active Company
                </label>
              </div>
            </div>
          </div>

          {/* Registered Address Section */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Registered Address</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="regStreet" className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="regStreet"
                  value={registeredAddress.street}
                  onChange={(e) =>
                    setRegisteredAddress({ ...registeredAddress, street: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                    errors.registeredStreet ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter street address"
                />
                {errors.registeredStreet && (
                  <p className="mt-1 text-sm text-red-600">{errors.registeredStreet}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="regCity" className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="regCity"
                    value={registeredAddress.city}
                    onChange={(e) =>
                      setRegisteredAddress({ ...registeredAddress, city: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      errors.registeredCity ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="City"
                  />
                  {errors.registeredCity && (
                    <p className="mt-1 text-sm text-red-600">{errors.registeredCity}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="regState" className="block text-sm font-medium text-gray-700 mb-1">
                    State/Province <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="regState"
                    value={registeredAddress.state}
                    onChange={(e) =>
                      setRegisteredAddress({ ...registeredAddress, state: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      errors.registeredState ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="State/Province"
                  />
                  {errors.registeredState && (
                    <p className="mt-1 text-sm text-red-600">{errors.registeredState}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="regPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="regPostalCode"
                    value={registeredAddress.postalCode}
                    onChange={(e) =>
                      setRegisteredAddress({ ...registeredAddress, postalCode: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      errors.registeredPostalCode ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Postal Code"
                  />
                  {errors.registeredPostalCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.registeredPostalCode}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="regCountry" className="block text-sm font-medium text-gray-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="regCountry"
                    value={registeredAddress.country}
                    onChange={(e) =>
                      setRegisteredAddress({ ...registeredAddress, country: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      errors.registeredCountry ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Country"
                  />
                  {errors.registeredCountry && (
                    <p className="mt-1 text-sm text-red-600">{errors.registeredCountry}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Billing Address Section */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Billing Address</h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sameAddress"
                  checked={sameAsBillingAddress}
                  onChange={(e) => handleSameAddressChange(e.target.checked)}
                  className="h-4 w-4 text-[#5A7A8F] focus:ring-[#5A7A8F] border-gray-300 rounded"
                />
                <label htmlFor="sameAddress" className="ml-2 block text-sm text-gray-700">
                  Same as registered address
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="billStreet" className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="billStreet"
                  value={billingAddress.street}
                  onChange={(e) =>
                    setBillingAddress({ ...billingAddress, street: e.target.value })
                  }
                  disabled={sameAsBillingAddress}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                    sameAsBillingAddress ? "bg-gray-100 text-gray-500" : ""
                  } ${errors.billingStreet ? "border-red-500" : "border-gray-300"}`}
                  placeholder="Enter street address"
                />
                {errors.billingStreet && (
                  <p className="mt-1 text-sm text-red-600">{errors.billingStreet}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="billCity" className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="billCity"
                    value={billingAddress.city}
                    onChange={(e) =>
                      setBillingAddress({ ...billingAddress, city: e.target.value })
                    }
                    disabled={sameAsBillingAddress}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      sameAsBillingAddress ? "bg-gray-100 text-gray-500" : ""
                    } ${errors.billingCity ? "border-red-500" : "border-gray-300"}`}
                    placeholder="City"
                  />
                  {errors.billingCity && (
                    <p className="mt-1 text-sm text-red-600">{errors.billingCity}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="billState" className="block text-sm font-medium text-gray-700 mb-1">
                    State/Province <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="billState"
                    value={billingAddress.state}
                    onChange={(e) =>
                      setBillingAddress({ ...billingAddress, state: e.target.value })
                    }
                    disabled={sameAsBillingAddress}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      sameAsBillingAddress ? "bg-gray-100 text-gray-500" : ""
                    } ${errors.billingState ? "border-red-500" : "border-gray-300"}`}
                    placeholder="State/Province"
                  />
                  {errors.billingState && (
                    <p className="mt-1 text-sm text-red-600">{errors.billingState}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="billPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="billPostalCode"
                    value={billingAddress.postalCode}
                    onChange={(e) =>
                      setBillingAddress({ ...billingAddress, postalCode: e.target.value })
                    }
                    disabled={sameAsBillingAddress}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      sameAsBillingAddress ? "bg-gray-100 text-gray-500" : ""
                    } ${errors.billingPostalCode ? "border-red-500" : "border-gray-300"}`}
                    placeholder="Postal Code"
                  />
                  {errors.billingPostalCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.billingPostalCode}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="billCountry" className="block text-sm font-medium text-gray-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="billCountry"
                    value={billingAddress.country}
                    onChange={(e) =>
                      setBillingAddress({ ...billingAddress, country: e.target.value })
                    }
                    disabled={sameAsBillingAddress}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      sameAsBillingAddress ? "bg-gray-100 text-gray-500" : ""
                    } ${errors.billingCountry ? "border-red-500" : "border-gray-300"}`}
                    placeholder="Country"
                  />
                  {errors.billingCountry && (
                    <p className="mt-1 text-sm text-red-600">{errors.billingCountry}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="contactName"
                  value={contactInformation.primaryContactName}
                  onChange={(e) =>
                    setContactInformation({
                      ...contactInformation,
                      primaryContactName: e.target.value,
                    })
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                    errors.contactName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter contact name"
                />
                {errors.contactName && (
                  <p className="mt-1 text-sm text-red-600">{errors.contactName}</p>
                )}
              </div>

              <div>
                <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="contactEmail"
                  value={contactInformation.email}
                  onChange={(e) =>
                    setContactInformation({ ...contactInformation, email: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                    errors.contactEmail ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="email@example.com"
                />
                {errors.contactEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.contactEmail}</p>
                )}
              </div>

              <div>
                <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="contactPhone"
                  value={contactInformation.phoneNumber}
                  onChange={(e) =>
                    setContactInformation({ ...contactInformation, phoneNumber: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                    errors.contactPhone ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="+66 12 345 6789"
                />
                {errors.contactPhone && (
                  <p className="mt-1 text-sm text-red-600">{errors.contactPhone}</p>
                )}
              </div>
            </div>
          </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-white rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingCompany ? "Update Company" : "Create Company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
