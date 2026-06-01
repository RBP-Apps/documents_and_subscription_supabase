// PropertyTax/AddPropertyTax.tsx
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  X,
  Save,
  Loader2,
  Building2,
} from 'lucide-react';
import supabase from '../../utils/supabase';

interface AddPropertyTaxProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddPropertyTax: React.FC<AddPropertyTaxProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    property_name: '',
    property_address: '',
    property_uid: '',
    authority_name: '',
    financial_year: '',
    tracking_id: '',
    amount_paid: '',
    payment_date: '',
    annual_rental_value: '',
    property_type: '',
  });

  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setFileUpload(file);
    setFileName(file.name);
  };

  const resetForm = () => {
    setFormData({
      property_name: '',
      property_address: '',
      property_uid: '',
      authority_name: '',
      financial_year: '',
      tracking_id: '',
      amount_paid: '',
      payment_date: '',
      annual_rental_value: '',
      property_type: '',
    });
    setFileUpload(null);
    setFileName('');
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      let documentUrl = '';

      // Upload File
      if (fileUpload) {
        const cleanFileName = fileUpload.name.replace(
          /[^a-zA-Z0-9.-]/g,
          '_'
        );

        const filePath = `documents/${Date.now()}_${cleanFileName}`;

        const { data, error } = await supabase.storage
          .from('property-tax')
          .upload(filePath, fileUpload, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage
          .from('property-tax')
          .getPublicUrl(data.path);

        documentUrl = publicUrl;
      }

      const { error: insertError } = await supabase
        .from('property_tax')
        .insert([
          {
            property_name: formData.property_name,
            property_address: formData.property_address,
            property_uid: formData.property_uid,
            authority_name: formData.authority_name,
            financial_year: formData.financial_year,
            tracking_id: formData.tracking_id,
            amount_paid: formData.amount_paid || null,
            payment_date: formData.payment_date || null,
            annual_rental_value: formData.annual_rental_value || null,
            document_url: documentUrl || null,
            property_type: formData.property_type || null,
          },
        ]);

      if (insertError) throw insertError;

      // Serial Number database trigger generate karega
      toast.success('Property Tax Added Successfully');

      resetForm();
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save property tax');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Building2 size={20} className="text-white" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Add Property Tax
              </h2>

              <p className="text-xs text-gray-500">
                Fill property tax details
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-full hover:bg-white"
          >
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <form
            id="property-tax-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div>
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700">
                Property Tax Details
              </h3>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                {/* 1. TRACKING ID */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Tracking ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tracking_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tracking_id: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* 2. PROPERTY UID */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Property UID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.property_uid}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        property_uid: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* 3. PROPERTY NAME */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Property Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.property_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        property_name: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* 4. PROPERTY ADDRESS */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Property Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.property_address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        property_address: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* 5. PROPERTY TYPE */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">
                    Property Type
                  </label>
                  <textarea
                    rows={3}
                    value={formData.property_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        property_type: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter Property Type..."
                  />
                </div>

                {/* 6. AUTHORITY NAME */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Authority Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.authority_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        authority_name: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* 7. FINANCIAL YEAR */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Financial Year *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 2024-2025"
                    value={formData.financial_year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        financial_year: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* 8. ANNUAL RENTAL VALUE */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Annual Rental Value
                  </label>
                  <input
                    type="text"
                    value={formData.annual_rental_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        annual_rental_value: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* 9. AMOUNT PAID */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Amount Paid *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.amount_paid}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount_paid: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* 10. PAYMENT DATE */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_date: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* 11. DOCUMENT */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">
                    Upload Document
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  {fileName && (
                    <div className="mt-2 text-sm text-green-600 font-medium">
                      {fileName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 border rounded-xl font-semibold hover:bg-gray-100 transition"
          >
            Cancel
          </button>

          <button
            form="property-tax-form"
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Property Tax
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPropertyTax;