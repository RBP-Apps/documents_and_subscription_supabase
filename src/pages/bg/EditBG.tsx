import React, { useState, useEffect } from 'react';
import useDataStore, { BGItem } from '../../store/dataStore';
import { toast } from 'react-hot-toast';
import { X, Save, Loader2, FileText, Calendar, Building, IndianRupee } from 'lucide-react';
import supabase from '../../utils/supabase';
import SearchableInput from '../../components/SearchableInput';

interface EditBGProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bgData: BGItem | null;
}

const EditBG: React.FC<EditBGProps> = ({ isOpen, onClose, onSuccess, bgData }) => {
  const { updateBG } = useDataStore();
  const [companies, setCompanies] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    bgName: '',
    bgNo: '',
    bankName: '',
    amount: '',
    startDate: '',
    endDate: '',
    extendExpiryDate: '',
    remarks: '',
    fileName: null as string | null,
    fileUpload: null as File | null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    (async () => {
      try {
        const { data: rows, error } = await supabase
          .from("master")
          .select("company_name");

        if (error) throw error;
        if (!mounted) return;

        const comps = (rows || [])
          .map((r) => r.company_name)
          .filter((v) => typeof v === "string" && v.trim().length > 0);

        setCompanies(Array.from(new Set(comps as string[])));
      } catch (err) {
        console.error('Error fetching master companies:', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (bgData && isOpen) {
      setFormData({
        bgName: bgData.bgName || '',
        bgNo: bgData.bgNo || '',
        bankName: bgData.bankName || '',
        amount: bgData.amount ? bgData.amount.toString() : '',
        startDate: bgData.startDate || '',
        endDate: bgData.endDate || '',
        extendExpiryDate: bgData.extendExpiryDate || '',
        remarks: bgData.remarks || '',
        fileName: null,
        fileUpload: null,
      });
    }
  }, [bgData, isOpen]);

  if (!isOpen || !bgData) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        e.target.value = '';
        return;
      }
      setFormData((prev) => ({
        ...prev,
        fileName: file.name,
        fileUpload: file,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // Save new company name to master table if not existing
      if (formData.bgName.trim()) {
        const exists = companies.some(
          (c) => c.toLowerCase() === formData.bgName.trim().toLowerCase()
        );
        if (!exists) {
          await supabase.from('master').insert([{ company_name: formData.bgName.trim() }]);
        }
      }

      let fileUrl = bgData.fileContent || bgData.file || null;
      if (formData.fileUpload) {
        try {
          const cleanFileName = formData.fileUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `bg/${Date.now()}_${cleanFileName}`;

          const { data, error: uploadError } = await supabase.storage
            .from('DRIVE_FOLDER')
            .upload(filePath, formData.fileUpload, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('DRIVE_FOLDER')
            .getPublicUrl(data.path);

          fileUrl = publicUrl;
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
          toast.error('File upload failed, keeping existing file.');
        }
      }

      const numAmount = formData.amount
        ? parseFloat(formData.amount.toString().replace(/[^0-9.]/g, ''))
        : null;

      const { error: updateError } = await supabase
        .from('BG')
        .update({
          bg_name: formData.bgName,
          bg_no: formData.bgNo,
          bank_name: formData.bankName,
          amount: numAmount,
          bg_start_date: formData.startDate || null,
          expiry_date: formData.endDate || null,
          claim_expiry_date: formData.extendExpiryDate || null,
          remarks: formData.remarks || null,
          file: fileUrl,
        })
        .eq('id', bgData.id);

      if (updateError) throw updateError;

      updateBG(bgData.id, {
        bgName: formData.bgName,
        bgNo: formData.bgNo,
        bankName: formData.bankName,
        amount: formData.amount,
        startDate: formData.startDate,
        endDate: formData.endDate,
        extendExpiryDate: formData.extendExpiryDate,
        remarks: formData.remarks,
        file: fileUrl,
        fileContent: fileUrl || undefined,
      });

      toast.success(`BG ${bgData.sn} updated successfully!`);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('BG Update Error:', error);
      toast.error('Error updating BG details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Edit Bank Guarantee</h2>
              <p className="text-xs text-gray-500">Edit details for {bgData.sn}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 max-h-[70vh] overflow-y-auto">
          <form id="edit-bg-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-100 pb-2">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <SearchableInput
                    label="BG Name(Company Name)"
                    value={formData.bgName}
                    onChange={(value) => setFormData((prev) => ({ ...prev, bgName: value }))}
                    options={companies}
                    placeholder="Select or enter Company Name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-indigo-600" />
                      BG No <span className="text-red-500">*</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                    value={formData.bgNo}
                    onChange={(e) => setFormData({ ...formData, bgNo: e.target.value })}
                    placeholder="e.g. BG/2024/001"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Building size={14} className="text-indigo-600" />
                    Bank Name <span className="text-red-500">*</span>
                  </div>
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <IndianRupee size={14} className="text-indigo-600" />
                    Amount <span className="text-red-500">*</span>
                  </div>
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g. ₹10,00,000"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Section 2: Date Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-100 pb-2">
                Date Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-indigo-600" />
                      BG Start Date <span className="text-red-500">*</span>
                    </div>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50 cursor-pointer"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-indigo-600" />
                      Expiry Date <span className="text-red-500">*</span>
                    </div>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50 cursor-pointer"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-indigo-600" />
                    Claim Expiry Date <span className="text-gray-400 text-xs">(Optional)</span>
                  </div>
                </label>
                <input
                  type="date"
                  className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50 cursor-pointer"
                  value={formData.extendExpiryDate}
                  onChange={(e) => setFormData({ ...formData, extendExpiryDate: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Section 3: Additional Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-100 pb-2">
                Additional Information
              </h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Remarks <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="text"
                  className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Any additional remarks or notes"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-indigo-600" />
                    Upload Document (Replaces current){' '}
                    <span className="text-gray-400 text-xs">(Optional, Max 50MB)</span>
                  </div>
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-indigo-400 transition-colors bg-gray-50/50">
                  <input
                    type="file"
                    className="w-full"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                  {formData.fileName && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                      <FileText size={14} />
                      <span className="font-medium">Selected: {formData.fileName}</span>
                    </div>
                  )}
                  {bgData.fileContent && !formData.fileName && (
                    <div className="mt-2 text-xs text-gray-500">
                      Current file:{' '}
                      <a
                        href={bgData.fileContent}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        View Existing File
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-white hover:border-gray-400 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-bg-form"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Updating BG...
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

export default EditBG;
