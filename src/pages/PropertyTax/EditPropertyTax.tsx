// PropertyTax/EditPropertyTax.tsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  X,
  Save,
  Loader2,
  Building2,
  Eye,
} from 'lucide-react';
import supabase from '../../utils/supabase';

interface EditPropertyTaxProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  taxData: any;
}

const EditPropertyTax: React.FC<EditPropertyTaxProps> = ({
  isOpen,
  onClose,
  onSuccess,
  taxData,
}) => {
  const [formData, setFormData] = useState({
    id: '',
    property_name: '',
    property_address: '',
    property_id: '',
    authority_name: '',
    financial_year: '',
    due_date: '',
    amount_paid: '',
    payment_date: '',
    receipt_number: '',
    remarks: '',
    document_url: '',
  });

  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (taxData && isOpen) {
      setFormData({
        id: taxData.id || '',
        property_name: taxData.property_name || '',
        property_address: taxData.property_address || '',
        property_id: taxData.property_id || '',
        authority_name: taxData.authority_name || '',
        financial_year: taxData.financial_year || '',
        due_date: taxData.due_date || '',
        amount_paid: taxData.amount_paid?.toString() || '',
        payment_date: taxData.payment_date || '',
        receipt_number: taxData.receipt_number || '',
        remarks: taxData.remarks || '',
        document_url: taxData.document_url || '',
      });
    }
  }, [taxData, isOpen]);

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
      id: '',
      property_name: '',
      property_address: '',
      property_id: '',
      authority_name: '',
      financial_year: '',
      due_date: '',
      amount_paid: '',
      payment_date: '',
      receipt_number: '',
      remarks: '',
      document_url: '',
    });
    setFileUpload(null);
    setFileName('');
  };

  const handleViewDocument = () => {
    if (formData.document_url) {
      window.open(formData.document_url, '_blank');
    } else {
      toast.error('No document available');
    }
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      let documentUrl = formData.document_url;

      // Upload new file if selected
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

      const { error: updateError } = await supabase
        .from('property_tax')
        .update({
          property_name: formData.property_name,
          property_address: formData.property_address,
          property_id: formData.property_id,
          authority_name: formData.authority_name,
          financial_year: formData.financial_year,
          due_date: formData.due_date,
          amount_paid: Number(formData.amount_paid),
          payment_date: formData.payment_date || null,
          receipt_number: formData.receipt_number || null,
          document_url: documentUrl || null,
          remarks: formData.remarks || null,
        })
        .eq('id', formData.id);

      if (updateError) throw updateError;

      toast.success(`Property Tax Updated Successfully`);

      resetForm();
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update property tax');
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
                Edit Property Tax
              </h2>

              <p className="text-xs text-gray-500">
                Update property tax details
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {formData.document_url && (
              <button
                onClick={handleViewDocument}
                className="p-2 rounded-full hover:bg-white text-indigo-600"
                title="View current document"
              >
                <Eye size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 rounded-full hover:bg-white"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <form
            id="edit-property-tax-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700">
                Basic Information
              </h3>

              <div className="grid md:grid-cols-2 gap-4 mt-4">

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

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Property ID *
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.property_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        property_id: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

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

                <div className="md:col-span-2">
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
              </div>
            </div>

            {/* Tax Details */}
            <div>
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700">
                Tax Details
              </h3>

              <div className="grid md:grid-cols-2 gap-4 mt-4">

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Due Date *
                  </label>

                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        due_date: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

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

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Receipt Number
                  </label>

                  <input
                    type="text"
                    value={formData.receipt_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        receipt_number: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">
                    Remarks
                  </label>

                  <textarea
                    rows={3}
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        remarks: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Additional remarks..."
                  />
                </div>
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700">
                Document
              </h3>

              <div className="grid md:grid-cols-1 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Upload New Document (Optional)
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
            form="edit-property-tax-form"
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
                Updating...
              </>
            ) : (
              <>
                <Save size={18} />
                Update Property Tax
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPropertyTax;