import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  X,
  Save,
  Loader2,
  Briefcase,
} from 'lucide-react';
import supabase from '../../../utils/supabase';

interface EditTendersProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  tenderData: any;
}

const EditTenders: React.FC<EditTendersProps> = ({
  isOpen,
  onClose,
  onSuccess,
  tenderData,
}) => {
  const [formData, setFormData] = useState({
    id: '',
    name_of_person: '',
    tender_name: '',
    state_name: '',
    name_of_department: '',
    firm_name: '',
    tender_details: '',
    tender_start_date: '',
    tender_end_date: '',
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
    if (tenderData && isOpen) {
      setFormData({
        id: tenderData.id || '',
        name_of_person: tenderData.name_of_person || '',
        tender_name: tenderData.tender_name || '',
        state_name: tenderData.state_name || '',
        name_of_department: tenderData.name_of_department || '',
        firm_name: tenderData.firm_name || '',
        tender_details: tenderData.tender_details || '',
        tender_start_date: tenderData.tender_start_date || '',
        tender_end_date: tenderData.tender_end_date || '',
      });
      setFileUpload(null);
      setFileName('');
    }
  }, [tenderData, isOpen]);

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
      name_of_person: '',
      tender_name: '',
      state_name: '',
      name_of_department: '',
      firm_name: '',
      tender_details: '',
      tender_start_date: '',
      tender_end_date: '',
    });
    setFileUpload(null);
    setFileName('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !formData.name_of_person ||
      !formData.tender_name ||
      !formData.state_name ||
      !formData.name_of_department ||
      !formData.firm_name ||
      !formData.tender_start_date ||
      !formData.tender_end_date
    ) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (formData.firm_name.trim()) {
        const exists = masterCompanies.some(
          (c) => c.toLowerCase() === formData.firm_name.trim().toLowerCase()
        );
        if (!exists) {
          await supabase.from('master').insert([{ company_name: formData.firm_name.trim() }]);
        }
      }

      let fileUrl = tenderData.nit_file_upload || null;

      // Upload new file if selected
      if (fileUpload) {
        const cleanFileName = fileUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `tenders/${Date.now()}_${cleanFileName}`;

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
        .from('tenders')
        .update({
          name_of_person: formData.name_of_person,
          tender_name: formData.tender_name,
          state_name: formData.state_name,
          name_of_department: formData.name_of_department,
          firm_name: formData.firm_name,
          tender_details: formData.tender_details || null,
          tender_start_date: formData.tender_start_date,
          tender_end_date: formData.tender_end_date,
          nit_file_upload: fileUrl,
        })
        .eq('id', formData.id);

      if (updateError) throw updateError;

      toast.success('Tender Updated Successfully');
      resetForm();
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update tender');
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
                Edit Tender
              </h2>
              <p className="text-xs text-gray-500">
                Update project tender details
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
            id="edit-tender-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700 mb-4">
                Tender Information
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Name Of The Person */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Name Of The Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name_of_person}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name_of_person: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                {/* Tender Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Tender Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tender_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tender_name: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                {/* State Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    State Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        state_name: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                {/* Name Of Department */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Name Of Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name_of_department}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name_of_department: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                {/* Firm Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Firm Name(Company Name) *
                  </label>
                  <input
                    list="edit-tender-firm-list"
                    type="text"
                    required
                    value={formData.firm_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        firm_name: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                    placeholder="Select or enter Firm Name"
                  />
                  <datalist id="edit-tender-firm-list">
                    {masterCompanies.map((company, cIdx) => (
                      <option key={cIdx} value={company} />
                    ))}
                  </datalist>
                </div>


                {/* Tender Start Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Tender Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tender_start_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tender_start_date: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                {/* Tender End Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Tender End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tender_end_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tender_end_date: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                  />
                </div>

                {/* Tender Details */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Tender Details
                  </label>
                  <textarea
                    rows={2}
                    value={formData.tender_details}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tender_details: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30 resize-none"
                  />
                </div>

                {/* Nit File Upload */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Upload New Nit Document (Optional)
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
            form="edit-tender-form"
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
                Update Tender
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTenders;
