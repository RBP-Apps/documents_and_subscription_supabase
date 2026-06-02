import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Save, Loader2, Shield } from 'lucide-react';
import supabase from '../../../utils/supabase';

interface LifeInsurance {
  id: number;
  serial_no: string;
  company_name: string;
  plan_name: string;
  policy_holder: string;
  policy_no: string;
  start_date: string;
  end_date: string;
  premium_paid: number;
  insurance_agent: string;
  contact_details: string;
  document_url: string;
}

interface EditLifeInsuranceProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  insuranceData: LifeInsurance | null;
}

const EditLifeInsurance: React.FC<EditLifeInsuranceProps> = ({
  isOpen,
  onClose,
  onSuccess,
  insuranceData,
}) => {
  const [formData, setFormData] = useState({
    company_name: '',
    plan_name: '',
    policy_holder: '',
    policy_no: '',
    start_date: '',
    end_date: '',
    premium_paid: '',
    insurance_agent: '',
    contact_details: '',
  });

  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (insuranceData) {
      setFormData({
        company_name: insuranceData.company_name || '',
        plan_name: insuranceData.plan_name || '',
        policy_holder: insuranceData.policy_holder || '',
        policy_no: insuranceData.policy_no || '',
        start_date: insuranceData.start_date || '',
        end_date: insuranceData.end_date || '',
        premium_paid: insuranceData.premium_paid ? insuranceData.premium_paid.toString() : '',
        insurance_agent: insuranceData.insurance_agent || '',
        contact_details: insuranceData.contact_details || '',
      });
      setFileName('');
      setFileUpload(null);
    }
  }, [insuranceData, isOpen]);

  if (!isOpen || !insuranceData) return null;

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      let documentUrl = insuranceData.document_url;

      // Upload File if new file selected
      if (fileUpload) {
        const cleanFileName = fileUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `life/${Date.now()}_${cleanFileName}`;

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

        documentUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from('life_insurance')
        .update({
          company_name: formData.company_name,
          plan_name: formData.plan_name,
          policy_holder: formData.policy_holder,
          policy_no: formData.policy_no,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          premium_paid: formData.premium_paid ? Number(formData.premium_paid) : null,
          insurance_agent: formData.insurance_agent,
          contact_details: formData.contact_details,
          document_url: documentUrl || null,
        })
        .eq('id', insuranceData.id);

      if (updateError) throw updateError;

      toast.success('Life Insurance Updated Successfully');
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update life insurance record');
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
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Edit Life Insurance</h2>
              <p className="text-xs text-gray-500">Edit policy details for {insuranceData.serial_no}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 rounded-full hover:bg-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <form id="edit-life-insurance-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Policy Info */}
            <div>
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700">Policy Information</h3>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.plan_name}
                    onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Policy Holder *</label>
                  <input
                    type="text"
                    required
                    value={formData.policy_holder}
                    onChange={(e) => setFormData({ ...formData, policy_holder: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Policy No. *</label>
                  <input
                    type="text"
                    required
                    value={formData.policy_no}
                    onChange={(e) => setFormData({ ...formData, policy_no: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Premium Paid *</label>
                  <input
                    type="number"
                    required
                    value={formData.premium_paid}
                    onChange={(e) => setFormData({ ...formData, premium_paid: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Dates & Agent Info */}
            <div>
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700">Dates & Agent Details</h3>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Insurance Agent / Intermediary</label>
                  <input
                    type="text"
                    value={formData.insurance_agent}
                    onChange={(e) => setFormData({ ...formData, insurance_agent: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Contact Details</label>
                  <input
                    type="text"
                    value={formData.contact_details}
                    onChange={(e) => setFormData({ ...formData, contact_details: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Upload Document (Replaces current)</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  {fileName && (
                    <div className="mt-2 text-sm text-green-600 font-medium">
                      {fileName}
                    </div>
                  )}
                  {insuranceData.document_url && !fileName && (
                    <div className="mt-1 text-xs text-gray-500">
                      Current file: <a href={insuranceData.document_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">View File</a>
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
            className="flex-1 py-3 border rounded-xl font-semibold hover:bg-gray-150 transition-colors"
          >
            Cancel
          </button>
          <button
            form="edit-life-insurance-form"
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditLifeInsurance;
