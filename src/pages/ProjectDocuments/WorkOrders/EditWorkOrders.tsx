import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  X,
  Save,
  Loader2,
  Briefcase,
} from 'lucide-react';
import supabase from '../../../utils/supabase';

interface EditWorkOrdersProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  workOrderData: any;
}

const EditWorkOrders: React.FC<EditWorkOrdersProps> = ({
  isOpen,
  onClose,
  onSuccess,
  workOrderData,
}) => {
  const [formData, setFormData] = useState({
    id: '',
    state: '',
    date: '',
    department: '',
    scheme: '',
    company_name: '',
    total_value: '',
  });

  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (workOrderData && isOpen) {
      setFormData({
        id: workOrderData.id || '',
        state: workOrderData.state || '',
        date: workOrderData.date || '',
        department: workOrderData.department || '',
        scheme: workOrderData.scheme || '',
        company_name: workOrderData.company_name || '',
        total_value: workOrderData.total_value?.toString() || '',
      });
      setFileUpload(null);
      setFileName('');
    }
  }, [workOrderData, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      state: '',
      date: '',
      department: '',
      scheme: '',
      company_name: '',
      total_value: '',
    });
    setFileUpload(null);
    setFileName('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.state || !formData.date || !formData.department || !formData.scheme || !formData.company_name || !formData.total_value) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);

      let fileUrl = workOrderData.file_url || null;

      // Upload new file if selected
      if (fileUpload) {
        const cleanFileName = fileUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `work_orders/${Date.now()}_${cleanFileName}`;

        const { data, error } = await supabase.storage
          .from('insurance')
          .upload(filePath, fileUpload, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from('insurance').getPublicUrl(data.path);

        fileUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from('work_orders')
        .update({
          state: formData.state,
          date: formData.date,
          department: formData.department,
          scheme: formData.scheme,
          company_name: formData.company_name,
          total_value: formData.total_value ? Number(formData.total_value) : 0,
          file_url: fileUrl,
        })
        .eq('id', formData.id);

      if (updateError) throw updateError;

      toast.success('Work Order Updated Successfully');
      resetForm();
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update work order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Briefcase size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Edit Work Order
              </h2>
              <p className="text-xs text-gray-500">
                Update project work order details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 bg-gray-50/50 flex-1">
          <form
            id="edit-work-order-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Basic Info */}
            <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700 mb-4">
                Work Order Information
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                {/* State */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        state: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        date: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        department: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                {/* Scheme */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Scheme *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.scheme}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scheme: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        company_name: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                {/* Total Value */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Total Value *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.total_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_value: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                {/* File Upload */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Upload New Document (Optional)
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full p-2 border rounded-lg bg-gray-50/30 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none cursor-pointer"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  {fileName && (
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      {fileName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 border rounded-xl font-semibold hover:bg-gray-100 transition text-sm bg-white"
          >
            Cancel
          </button>
          <button
            form="edit-work-order-form"
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save size={18} />
                Update Work Order
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditWorkOrders;