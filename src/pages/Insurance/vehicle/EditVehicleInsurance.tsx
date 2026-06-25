import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  X,
  Save,
  Loader2,
  Car,
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
    need_renewal: false,
    renewal_date: '',
    concern_person_name: '',
    concern_person_mobile: '',
    concern_person_department: '',
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
        need_renewal: insuranceData.need_renewal || false,
        renewal_date: insuranceData.renewal_date || '',
        concern_person_name: insuranceData.concern_person_name || '',
        concern_person_mobile: insuranceData.concern_person_mobile || '',
        concern_person_department: insuranceData.concern_person_department || '',
      });
      setFileUpload(null);
      setFileName('');
    }
  }, [insuranceData, isOpen]);

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
      need_renewal: false,
      renewal_date: '',
      concern_person_name: '',
      concern_person_mobile: '',
      concern_person_department: '',
    });
    setFileUpload(null);
    setFileName('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.need_renewal && !formData.renewal_date) {
      toast.error('Please select a renewal date.');
      return;
    }

    try {
      setIsSubmitting(true);

      let fileUrl = insuranceData.file_url || null;

      // Upload new file if selected
      if (fileUpload) {
        const cleanFileName = fileUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
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
        } = supabase.storage.from('insurance').getPublicUrl(data.path);

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
          period_from: formData.period_from || null,
          period_to: formData.period_to || null,
          premium_paid: formData.premium_paid ? Number(formData.premium_paid) : 0,
          add_on: formData.add_on || null,
          policy_link: formData.policy_link || null,
          file_url: fileUrl,
          need_renewal: formData.need_renewal,
          renewal_date: formData.need_renewal && formData.renewal_date ? formData.renewal_date : null,
          concern_person_name: formData.concern_person_name || null,
          concern_person_mobile: formData.concern_person_mobile || null,
          concern_person_department: formData.concern_person_department || null,
        })
        .eq('id', formData.id);

      if (updateError) throw updateError;

      toast.success('Vehicle Insurance Updated Successfully');
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
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
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
            id="edit-vehicle-insurance-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Basic Info */}
            <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700 mb-4">
                Basic Information
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
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
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
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
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
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
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
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
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>
              </div>
            </div>

            {/* Policy Details */}
            <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700 mb-4">
                Policy Details
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
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
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
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
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
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
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
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
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Policy Link
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
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Concern Person Name
                  </label>
                  <input
                    type="text"
                    value={formData.concern_person_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        concern_person_name: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                    placeholder="Name (Optional)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Concern Mobile
                  </label>
                  <input
                    type="text"
                    value={formData.concern_person_mobile}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        concern_person_mobile: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                    placeholder="Mobile No (Optional)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Concern Department
                  </label>
                  <input
                    type="text"
                    value={formData.concern_person_department}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        concern_person_department: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                    placeholder="Department (Optional)"
                  />
                </div>

                {/* Need Renewal & Date */}
                <div className="md:col-span-2 flex gap-4 items-center p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                  <label className="flex gap-2 items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      checked={formData.need_renewal}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          need_renewal: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Need Renewal
                    </span>
                  </label>

                  {formData.need_renewal && (
                    <div className="flex-1">
                      <input
                        type="date"
                        required={formData.need_renewal}
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                        value={formData.renewal_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            renewal_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Upload New Policy File (Optional)
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
            form="edit-vehicle-insurance-form"
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