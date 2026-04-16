import React, { useState } from 'react';
import useDataStore, { BGItem } from '../../store/dataStore';
import { toast } from 'react-hot-toast';
import { X, Save, Loader2, FileText, Calendar, Building, IndianRupee } from 'lucide-react';
import supabase from '../../utils/supabase';

interface AddBGProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddBG: React.FC<AddBGProps> = ({ isOpen, onClose }) => {
  const { addBG } = useDataStore();
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

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        e.target.value = '';
        return;
      }
      setFormData(prev => ({
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

      // 1. Upload file to Supabase Storage if present
      let fileUrl = '';
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
          toast.error('File upload failed, saving record without file.');
        }
      }

      // 2. Insert into Supabase BG table
      const { data: inserted, error: insertError } = await supabase
        .from('BG')
        .insert([{
          bg_name: formData.bgName,
          bg_no: formData.bgNo,
          bank_name: formData.bankName,
          amount: formData.amount
            ? parseFloat(formData.amount.replace(/[^0-9.]/g, ''))
            : null,
          bg_start_date: formData.startDate || null,
          expiry_date: formData.endDate || null,
          claim_expiry_date: formData.extendExpiryDate || null,
          remarks: formData.remarks || null,
          file: fileUrl || null,
        }])
        .select('id')
        .single();

      if (insertError) throw insertError;

      // 3. Generate and update serial_no
      const generatedSN = `BG-${inserted.id}`;
      await supabase
        .from('BG')
        .update({ serial_no: generatedSN })
        .eq('id', inserted.id);

      // 4. Update local store
      const newItem: BGItem = {
        id: inserted.id.toString(),
        sn: generatedSN,
        Timestamp: new Date().toISOString(),
        bgName: formData.bgName,
        bgNo: formData.bgNo,
        bankName: formData.bankName,
        amount: formData.amount,
        startDate: formData.startDate,
        endDate: formData.endDate,
        extendExpiryDate: formData.extendExpiryDate,
        remarks: formData.remarks,
        file: fileUrl || formData.fileName,
        fileContent: fileUrl || undefined,
      };
      addBG(newItem);

      toast.success(`BG added successfully! Serial No: ${generatedSN}`);
      onClose();
      setFormData({
        bgName: '',
        bgNo: '',
        bankName: '',
        amount: '',
        startDate: '',
        endDate: '',
        extendExpiryDate: '',
        remarks: '',
        fileName: null,
        fileUpload: null,
      });
    } catch (error) {
      console.error('BG Submission Error:', error);
      toast.error('Error saving BG details');
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
              <h2 className="text-xl font-bold text-gray-800">Add New Bank Guarantee</h2>
              <p className="text-xs text-gray-500">Fill in the BG details below</p>
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
          <form id="add-bg-form" onSubmit={handleSubmit} className="space-y-5">

            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-100 pb-2">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-indigo-600" />
                      BG Name <span className="text-red-500">*</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                    value={formData.bgName}
                    onChange={e => setFormData({ ...formData, bgName: e.target.value })}
                    placeholder="e.g. Performance Guarantee"
                    disabled={isSubmitting}
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
                    onChange={e => setFormData({ ...formData, bgNo: e.target.value })}
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
                  onChange={e => setFormData({ ...formData, bankName: e.target.value })}
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
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
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
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
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
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-indigo-600" />
                    Claim Expiry Date{' '}
                    <span className="text-gray-400 text-xs">(Optional)</span>
                  </div>
                </label>
                <input
                  type="date"
                  className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50 cursor-pointer"
                  value={formData.extendExpiryDate}
                  onChange={e => setFormData({ ...formData, extendExpiryDate: e.target.value })}
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
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Any additional remarks or notes"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-indigo-600" />
                    Upload Document{' '}
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
            form="add-bg-form"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving BG...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Bank Guarantee
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBG;
