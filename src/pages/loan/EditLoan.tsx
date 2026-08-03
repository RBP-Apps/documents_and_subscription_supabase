import React, { useState, useEffect } from 'react';
import useDataStore, { LoanItem } from '../../store/dataStore';
import { toast } from 'react-hot-toast';
import { X, Save, Loader2 } from 'lucide-react';
import supabase from '../../utils/supabase';

interface EditLoanProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  loanData: LoanItem | null;
}

const EditLoan: React.FC<EditLoanProps> = ({ isOpen, onClose, onSuccess, loanData }) => {
  const { updateLoan } = useDataStore();
  const [formData, setFormData] = useState({
    companyName: '',
    loanName: '',
    bankName: '',
    amount: '',
    emi: '',
    startDate: '',
    endDate: '',
    providedDocument: '',
    remarks: '',
    file: null as string | null,
    fileContent: '',
    fileUpload: null as File | null
  });

  const [masterCompanies, setMasterCompanies] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchMasterCompanies = async () => {
      try {
        const { data, error } = await supabase
          .from('master')
          .select('company_name');
        if (error) throw error;
        if (data) {
          const comps = data
            .map((item) => item.company_name)
            .filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
          setMasterCompanies(Array.from(new Set(comps)).sort());
        }
      } catch (err) {
        console.error('Error fetching company names from master table:', err);
      }
    };

    fetchMasterCompanies();
  }, [isOpen]);

  useEffect(() => {
    if (loanData) {
      setFormData({
        companyName: loanData.companyName || '',
        loanName: loanData.loanName || '',
        bankName: loanData.bankName || '',
        amount: loanData.amount || '',
        emi: loanData.emi || '',
        startDate: loanData.startDate || '',
        endDate: loanData.endDate || '',
        providedDocument: loanData.providedDocument || '',
        remarks: loanData.remarks || '',
        file: loanData.file || null,
        fileContent: loanData.fileContent || '',
        fileUpload: null
      });
    }
  }, [loanData, isOpen]);

  if (!isOpen || !loanData) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size must be less than 50MB");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          file: file.name,
          fileContent: reader.result as string,
          fileUpload: file
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanData || !loanData.id) return;

    try {
      setIsSubmitting(true);

      // Save company name to master table if not existing
      if (formData.companyName.trim()) {
        const exists = masterCompanies.some(
          (c) => c.toLowerCase() === formData.companyName.trim().toLowerCase()
        );
        if (!exists) {
          await supabase.from('master').insert([{ company_name: formData.companyName.trim() }]);
        }
      }

      let driveFileUrl = loanData.file || "";
      if (formData.fileUpload) {
        try {
          const fileExt = formData.fileUpload.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `loans/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('DRIVE_FOLDER')
            .upload(filePath, formData.fileUpload);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('DRIVE_FOLDER')
            .getPublicUrl(filePath);

          driveFileUrl = publicUrl;
        } catch (uploadErr) {
          console.error("File upload failed:", uploadErr);
          toast.error("File upload failed, keeping existing file.");
        }
      }

      const rowData = {
        company_name: formData.companyName,
        loan_name: formData.loanName,
        bank_name: formData.bankName,
        amount: formData.amount ? parseFloat(formData.amount.toString().replace(/,/g, '').replace('₹', '').trim()) : 0,
        emi: formData.emi ? parseFloat(formData.emi.toString().replace(/,/g, '').replace('₹', '').trim()) : 0,
        loan_start_date: formData.startDate || null,
        loan_end_date: formData.endDate || null,
        provided_document_name: formData.providedDocument,
        file: driveFileUrl || null,
        remarks: formData.remarks
      };

      const { error: updateError } = await supabase
        .from('loan')
        .update(rowData)
        .eq('id', loanData.id);

      if (updateError) {
        throw updateError;
      }

      updateLoan(loanData.id, {
        companyName: formData.companyName,
        loanName: formData.loanName,
        bankName: formData.bankName,
        amount: formData.amount,
        emi: formData.emi,
        startDate: formData.startDate,
        endDate: formData.endDate,
        providedDocument: formData.providedDocument,
        remarks: formData.remarks,
        file: driveFileUrl || loanData.file
      });

      toast.success("Loan updated successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Loan Update Error:", error);
      toast.error("Error updating loan details");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-auto flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Edit Loan</h2>
            <p className="text-xs text-indigo-600 font-semibold mt-0.5">{loanData.sn}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          <form id="edit-loan-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                list="edit-loan-company-list"
                type="text"
                required
                className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.companyName}
                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Select or enter Company Name"
              />
              <datalist id="edit-loan-company-list">
                {masterCompanies.map((company, index) => (
                  <option key={index} value={company} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loan Name</label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.loanName}
                  onChange={e => setFormData({ ...formData, loanName: e.target.value })}
                  placeholder="e.g. Home Loan"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bank Name</label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.bankName}
                  onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount</label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g. ₹50,00,000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">EMI</label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.emi}
                  onChange={e => setFormData({ ...formData, emi: e.target.value })}
                  placeholder="e.g. ₹45,000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loan Start Date</label>
                <input
                  type="date"
                  required
                  className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loan End Date</label>
                <input
                  type="date"
                  required
                  className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Provided Document Name</label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.providedDocument}
                  onChange={e => setFormData({ ...formData, providedDocument: e.target.value })}
                  placeholder="e.g. Property Deed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Upload Document (Optional)</label>
                <input
                  type="file"
                  className="w-full p-2 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  onChange={handleFileChange}
                />
                {formData.file && <p className="text-xs text-indigo-600 mt-1 truncate">Current file: {formData.file}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Remarks</label>
              <input
                type="text"
                className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.remarks}
                onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Optional remarks"
              />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl shadow-input border-none text-gray-700 font-medium hover:bg-white hover:border-gray-300 transition-all shadow-sm"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-loan-form"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save size={18} />
                Update Loan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditLoan;
