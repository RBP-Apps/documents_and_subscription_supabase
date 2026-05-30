// EditVehicleInsurance.tsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  X,
  Save,
  Loader2,
  Car,
  Eye,
} from 'lucide-react';
import supabase from '../../../utils/supabase';

interface EditVehicleInsuranceProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  insuranceData: any;
}

const EditVehicleInsurance: React.FC<EditVehicleInsuranceProps> = ({
  isOpen,
  onClose,
  onSuccess,
  insuranceData,
}) => {
  const [formData, setFormData] = useState({
    id: '',
    company_name: '',
    registration_no: '',
    make: '',
    model: '',
    insurance_agent: '',
    period_from: '',
    period_to: '',
    premium_paid: '',
    add_on: '',
    policy_link: '',
  });

  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (insuranceData && isOpen) {
      setFormData({
        id: insuranceData.id || '',
        company_name: insuranceData.company_name || '',
        registration_no: insuranceData.registration_no || '',
        make: insuranceData.make || '',
        model: insuranceData.model || '',
        insurance_agent: insuranceData.insurance_agent || '',
        period_from: insuranceData.period_from || '',
        period_to: insuranceData.period_to || '',
        premium_paid: insuranceData.premium_paid?.toString() || '',
        add_on: insuranceData.add_on || '',
        policy_link: insuranceData.policy_link || '',
      });
    }
  }, [insuranceData, isOpen]);

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
      company_name: '',
      registration_no: '',
      make: '',
      model: '',
      insurance_agent: '',
      period_from: '',
      period_to: '',
      premium_paid: '',
      add_on: '',
      policy_link: '',
    });
    setFileUpload(null);
    setFileName('');
  };

  const handleViewFile = () => {
    const fileLink = insuranceData?.file_url || insuranceData?.policy_link;
    if (fileLink) {
      window.open(fileLink, '_blank');
    } else {
      toast.error('No file available to view');
    }
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      let fileUrl = formData.policy_link;

      // Upload new file if selected
      if (fileUpload) {
        const cleanFileName = fileUpload.name.replace(
          /[^a-zA-Z0-9.-]/g,
          '_'
        );

        const filePath = `vehicle/${Date.now()}_${cleanFileName}`;

        const { data, error } = await supabase.storage
          .from('insurance')
          .upload(filePath, fileUpload, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage
          .from('insurance')
          .getPublicUrl(data.path);

        fileUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from('vehicle_insurance')
        .update({
          company_name: formData.company_name,
          registration_no: formData.registration_no,
          make: formData.make,
          model: formData.model,
          insurance_agent: formData.insurance_agent,
          period_from: formData.period_from,
          period_to: formData.period_to,
          premium_paid: Number(formData.premium_paid),
          add_on: formData.add_on || null,
          policy_link: fileUrl || null,
        })
        .eq('id', formData.id);

      if (updateError) throw updateError;

      toast.success(`Vehicle Insurance Updated Successfully`);

      resetForm();
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update insurance');
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
              <Car size={20} className="text-white" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Edit Vehicle Insurance
              </h2>

              <p className="text-xs text-gray-500">
                Update vehicle insurance details
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">

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
            id="edit-vehicle-insurance-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700">
                Basic Information
              </h3>

              <div className="grid md:grid-cols-2 gap-4 mt-4">

                <div>
                  <label className="block text-sm font-semibold mb-2">
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
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Registration No *
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.registration_no}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        registration_no: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Make *
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.make}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        make: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Model *
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        model: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">
                    Insurance Agent *
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.insurance_agent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        insurance_agent: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Policy Details */}
            <div>
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700">
                Policy Details
              </h3>

              <div className="grid md:grid-cols-2 gap-4 mt-4">

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Period From *
                  </label>

                  <input
                    type="date"
                    required
                    value={formData.period_from}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        period_from: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Period To *
                  </label>

                  <input
                    type="date"
                    required
                    value={formData.period_to}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        period_to: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Premium Paid *
                  </label>

                  <input
                    type="number"
                    required
                    value={formData.premium_paid}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        premium_paid: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Add On
                  </label>

                  <input
                    type="text"
                    value={formData.add_on}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        add_on: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">
                    Policy Link (Optional)
                  </label>

                  <input
                    type="text"
                    value={formData.policy_link}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        policy_link: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">
                    Upload New Policy File (Optional)
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
            form="edit-vehicle-insurance-form"
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
                Update Insurance
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditVehicleInsurance;