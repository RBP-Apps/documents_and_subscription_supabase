import React, { useState } from 'react';
import useDataStore, { LoanItem } from '../../store/dataStore';
import { toast } from 'react-hot-toast';
import { X, Save, Loader2 } from 'lucide-react';
import supabase from '../../utils/supabase';

interface AddLoanProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddLoan: React.FC<AddLoanProps> = ({ isOpen, onClose }) => {
  const { addLoan } = useDataStore();
  const [formData, setFormData] = useState({
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

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

    try {
      setIsSubmitting(true);

      let driveFileUrl = "";
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
          toast.error("File upload failed, saving record without file.");
        }
      }

      // Generate a SN
      // Retrieve the current max serial_no to increment
      const { data: latestLoan } = await supabase
        .from('loan')
        .select('serial_no')
        .order('id', { ascending: false })
        .limit(1);
        
      let nextSn = "SN-001";
      if (latestLoan && latestLoan.length > 0 && latestLoan[0].serial_no) {
        const lastSnMatch = latestLoan[0].serial_no.match(/SN-(\d+)/);
        if (lastSnMatch && lastSnMatch[1]) {
          const nextNum = parseInt(lastSnMatch[1], 10) + 1;
          nextSn = `SN-${String(nextNum).padStart(3, '0')}`;
        }
      }

      const rowData = {
        serial_no: nextSn,
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

      const { data: insertData, error: insertError } = await supabase
        .from('loan')
        .insert([rowData])
        .select();

      if (insertError) {
        throw insertError;
      }

      const serverSN = nextSn;
      const now = new Date();
      const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}, ${now.toLocaleTimeString('en-GB', { hour12: false })}`;

      const newItem: LoanItem = {
        id: insertData?.[0]?.id?.toString() || Math.random().toString(36).substr(2, 9),
        sn: serverSN,
        Timestamp: timestamp,
        ...formData,
        fileContent: driveFileUrl || undefined,
        file: driveFileUrl || formData.file
      };
      addLoan(newItem);

      toast.success(`Loan added successfully! Serial No: ${serverSN}`);
      onClose();
      setFormData({
        loanName: '',
        bankName: '',
        amount: '',
        emi: '',
        startDate: '',
        endDate: '',
        providedDocument: '',
        remarks: '',
        file: null,
        fileContent: '',
        fileUpload: null
      });
    } catch (error) {
      console.error("Loan Submission Error:", error);
      toast.error("Error saving loan details");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-input my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Add New Loan</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8">
          <form id="add-loan-form" onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Upload Document</label>
                <input
                  type="file"
                  className="w-full p-2 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  onChange={handleFileChange}
                />
                {formData.file && <p className="text-xs text-green-600 mt-1">Selected: {formData.file}</p>}
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
        <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
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
            form="add-loan-form"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Loan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLoan;
