import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Save, Loader2, HeartPulse } from 'lucide-react';
import supabase from '../../../utils/supabase';

interface HealthInsurance {
  id: number;
  serial_no: string;
  company_name: string;
  plan_name: string;
  policy_holder: string;
  policy_no: string;
  persons_covered: string;
  policy_cover: number;
  start_date: string;
  end_date: string;
  premium_paid: number;
  insurance_agent: string;
  contact_details: string;
  document_url: string;
  need_renewal?: boolean;
  renewal_date?: string;
  concern_person_name?: string;
  concern_person_mobile?: string;
  concern_person_department?: string;
}

interface EditHealthProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  insuranceData: HealthInsurance | null;
}

const EditHealth: React.FC<EditHealthProps> = ({
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
    persons_covered: '',
    policy_cover: '',
    start_date: '',
    end_date: '',
    premium_paid: '',
    insurance_agent: '',
    contact_details: '',
    need_renewal: false,
    renewal_date: '',
    concern_person_name: '',
    concern_person_mobile: '',
    concern_person_department: '',
  });

  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [masterCompanies, setMasterCompanies] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchMasterCompanies = async () => {
      try {
        const { data, error } = await supabase.from('master').select('company_name');
        if (error) throw error;
        if (data) {
          const comps = data
            .map((item) => item.company_name)
            .filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
          setMasterCompanies(Array.from(new Set(comps)));
        }
      } catch (err) {
        console.error('Error fetching company names from master:', err);
      }
    };

    fetchMasterCompanies();
  }, [isOpen]);

  useEffect(() => {
    if (insuranceData) {
      setFormData({
        company_name: insuranceData.company_name || '',
        plan_name: insuranceData.plan_name || '',
        policy_holder: insuranceData.policy_holder || '',
        policy_no: insuranceData.policy_no || '',
        persons_covered: insuranceData.persons_covered || '',
        policy_cover: insuranceData.policy_cover ? insuranceData.policy_cover.toString() : '',
        start_date: insuranceData.start_date || '',
        end_date: insuranceData.end_date || '',
        premium_paid: insuranceData.premium_paid ? insuranceData.premium_paid.toString() : '',
        insurance_agent: insuranceData.insurance_agent || '',
        contact_details: insuranceData.contact_details || '',
        need_renewal: insuranceData.need_renewal || false,
        renewal_date: insuranceData.renewal_date || '',
        concern_person_name: insuranceData.concern_person_name || '',
        concern_person_mobile: insuranceData.concern_person_mobile || '',
        concern_person_department: insuranceData.concern_person_department || '',
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

    if (formData.need_renewal && !formData.renewal_date) {
      toast.error('Please select a renewal date.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (formData.company_name.trim()) {
        const exists = masterCompanies.some(
          (c) => c.toLowerCase() === formData.company_name.trim().toLowerCase()
        );
        if (!exists) {
          await supabase.from('master').insert([{ company_name: formData.company_name.trim() }]);
        }
      }

      let documentUrl = insuranceData.document_url;

      // Upload File if new file selected
      if (fileUpload) {
        const cleanFileName = fileUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `health/${Date.now()}_${cleanFileName}`;

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
        .from('health_insurance')
        .update({
          company_name: formData.company_name,
          plan_name: formData.plan_name,
          policy_holder: formData.policy_holder,
          policy_no: formData.policy_no,
          persons_covered: formData.persons_covered,
          policy_cover: formData.policy_cover ? Number(formData.policy_cover) : null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          premium_paid: formData.premium_paid ? Number(formData.premium_paid) : null,
          insurance_agent: formData.insurance_agent,
          contact_details: formData.contact_details,
          document_url: documentUrl || null,
          need_renewal: formData.need_renewal,
          renewal_date: formData.need_renewal && formData.renewal_date ? formData.renewal_date : null,
          concern_person_name: formData.concern_person_name || null,
          concern_person_mobile: formData.concern_person_mobile || null,
          concern_person_department: formData.concern_person_department || null,
        })
        .eq('id', insuranceData.id);

      if (updateError) throw updateError;

      toast.success('Health Insurance Updated Successfully');
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update health insurance record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <HeartPulse size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Edit Health Insurance</h2>
              <p className="text-xs text-gray-500">Edit policy details for {insuranceData.serial_no}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 rounded-full hover:bg-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 bg-gray-50/50 flex-1">
          <form id="edit-health-insurance-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Policy Info */}
            <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700 mb-4">Policy Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Company Name *</label>
                  <input
                    list="edit-health-company-list"
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                    placeholder="Select or enter Company Name"
                  />
                  <datalist id="edit-health-company-list">
                    {masterCompanies.map((company, cIdx) => (
                      <option key={cIdx} value={company} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.plan_name}
                    onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Policy Holder *</label>
                  <input
                    type="text"
                    required
                    value={formData.policy_holder}
                    onChange={(e) => setFormData({ ...formData, policy_holder: e.target.value })}
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Policy No. *</label>
                  <input
                    type="text"
                    required
                    value={formData.policy_no}
                    onChange={(e) => setFormData({ ...formData, policy_no: e.target.value })}
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Persons Covered *</label>
                  <textarea
                    rows={2}
                    required
                    value={formData.persons_covered}
                    onChange={(e) => setFormData({ ...formData, persons_covered: e.target.value })}
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Policy Cover (Sum Insured) *</label>
                  <input
                    type="number"
                    required
                    value={formData.policy_cover}
                    onChange={(e) => setFormData({ ...formData, policy_cover: e.target.value })}
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Premium Paid *</label>
                  <input
                    type="number"
                    required
                    value={formData.premium_paid}
                    onChange={(e) => setFormData({ ...formData, premium_paid: e.target.value })}
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>
              </div>
            </div>

            {/* Dates & Agent Info */}
            <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700 mb-4">Dates & Agent Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Insurance Agent</label>
                  <input
                    type="text"
                    value={formData.insurance_agent}
                    onChange={(e) => setFormData({ ...formData, insurance_agent: e.target.value })}
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Details</label>
                  <input
                    type="text"
                    value={formData.contact_details}
                    onChange={(e) => setFormData({ ...formData, contact_details: e.target.value })}
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
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
                    <span className="text-sm font-semibold text-gray-700">Need Renewal</span>
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Upload Document (Replaces current)</label>
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
            form="edit-health-insurance-form"
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition text-sm"
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

export default EditHealth;
