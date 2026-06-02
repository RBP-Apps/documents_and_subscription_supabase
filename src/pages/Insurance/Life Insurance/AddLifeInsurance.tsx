import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { X, Save, Loader2, Shield } from 'lucide-react';
import supabase from '../../../utils/supabase';

interface AddLifeInsuranceProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddLifeInsurance: React.FC<AddLifeInsuranceProps> = ({ isOpen, onClose, onSuccess }) => {
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
    setFileUpload(null);
    setFileName('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      let documentUrl = '';

      // Upload File
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

      const { data: inserted, error: insertError } = await supabase
        .from('life_insurance')
        .insert([
          {
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
          },
        ])
        .select('id')
        .single();

      if (insertError) throw insertError;

      const serialNo = `LI-${String(inserted.id).padStart(3, '0')}`;

      await supabase
        .from('life_insurance')
        .update({
          serial_no: serialNo,
        })
        .eq('id', inserted.id);

      toast.success(`Life Insurance Added (${serialNo})`);
      resetForm();
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save life insurance record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Add Life Insurance</h2>
              <p className="text-xs text-gray-500">Fill life insurance details</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 rounded-full hover:bg-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <form id="life-insurance-form" onSubmit={handleSubmit} className="space-y-6">
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
                    placeholder="e.g. LIC"
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
                    placeholder="e.g. Jeevan Anand"
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
                    placeholder="e.g. John Doe"
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
                    placeholder="e.g. 543216789"
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
                    placeholder="e.g. 25000"
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
                    placeholder="Agent name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Contact Details</label>
                  <input
                    type="text"
                    value={formData.contact_details}
                    onChange={(e) => setFormData({ ...formData, contact_details: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="Mobile or email"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Upload Document</label>
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
            className="flex-1 py-3 border rounded-xl font-semibold hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            form="life-insurance-form"
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
                Save Insurance
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLifeInsurance;
