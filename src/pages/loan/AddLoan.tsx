import React, { useState , useEffect, useRef } from 'react';
import useDataStore, { LoanItem } from '../../store/dataStore';
import { toast } from 'react-hot-toast';
import { X, Save, Loader2, FileText, UploadCloud, CheckCircle2 } from 'lucide-react';
import supabase from '../../utils/supabase';

interface AddLoanProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddLoan: React.FC<AddLoanProps> = ({ isOpen, onClose }) => {
  const { addLoan } = useDataStore();
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
    fileUpload: null as File | null,
    sanctionLetter: null as string | null,
    sanctionLetterUpload: null as File | null,
    repaymentLetter: null as string | null,
    repaymentLetterUpload: null as File | null,
    soa: null as string | null,
    soaUpload: null as File | null,
  });

  const sanctionInputRef = useRef<HTMLInputElement>(null);
  const repaymentInputRef = useRef<HTMLInputElement>(null);
  const soaInputRef = useRef<HTMLInputElement>(null);

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

  const handleDocumentFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'sanctionLetter' | 'repaymentLetter' | 'soa'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size must be less than 50MB");
        e.target.value = "";
        return;
      }
      setFormData(prev => ({
        ...prev,
        [type]: file.name,
        [`${type}Upload`]: file
      }));
    }
  };

  const clearDocumentFile = (
    type: 'sanctionLetter' | 'repaymentLetter' | 'soa',
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    if (inputRef.current) inputRef.current.value = "";
    setFormData(prev => ({
      ...prev,
      [type]: null,
      [`${type}Upload`]: null
    }));
  };

  const uploadToStorage = async (file: File, prefix: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${prefix}_${Date.now()}_${cleanName}.${fileExt}`;
    const filePath = `loans/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('DRIVE_FOLDER')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('DRIVE_FOLDER')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

      let driveFileUrl = "";
      if (formData.fileUpload) {
        try {
          driveFileUrl = await uploadToStorage(formData.fileUpload, "doc");
        } catch (uploadErr) {
          console.error("File upload failed:", uploadErr);
          toast.error("File upload failed, saving record without file.");
        }
      }

      let sanctionLetterUrl = "";
      if (formData.sanctionLetterUpload) {
        try {
          sanctionLetterUrl = await uploadToStorage(formData.sanctionLetterUpload, "sanction");
        } catch (uploadErr) {
          console.error("Sanction letter upload failed:", uploadErr);
          toast.error("Sanction letter upload failed, saving record without sanction letter.");
        }
      }

      let repaymentLetterUrl = "";
      if (formData.repaymentLetterUpload) {
        try {
          repaymentLetterUrl = await uploadToStorage(formData.repaymentLetterUpload, "repayment");
        } catch (uploadErr) {
          console.error("Repayment letter upload failed:", uploadErr);
          toast.error("Repayment letter upload failed, saving record without repayment letter.");
        }
      }

      let soaUrl = "";
      if (formData.soaUpload) {
        try {
          soaUrl = await uploadToStorage(formData.soaUpload, "soa");
        } catch (uploadErr) {
          console.error("SOA upload failed:", uploadErr);
          toast.error("SOA upload failed, saving record without SOA.");
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
        company_name: formData.companyName,
        loan_name: formData.loanName,
        bank_name: formData.bankName,
        amount: formData.amount ? parseFloat(formData.amount.toString().replace(/,/g, '').replace('₹', '').trim()) : 0,
        emi: formData.emi ? parseFloat(formData.emi.toString().replace(/,/g, '').replace('₹', '').trim()) : 0,
        loan_start_date: formData.startDate || null,
        loan_end_date: formData.endDate || null,
        provided_document_name: formData.providedDocument,
        file: driveFileUrl || null,
        sanction_letter: sanctionLetterUrl || null,
        repayment_letter: repaymentLetterUrl || null,
        soa: soaUrl || null,
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
        file: driveFileUrl || formData.file,
        sanctionLetter: sanctionLetterUrl || null,
        repaymentLetter: repaymentLetterUrl || null,
        soa: soaUrl || null,
      };
      addLoan(newItem);

      toast.success(`Loan added successfully! Serial No: ${serverSN}`);
      onClose();
      setFormData({
        companyName: '',
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
        fileUpload: null,
        sanctionLetter: null,
        sanctionLetterUpload: null,
        repaymentLetter: null,
        repaymentLetterUpload: null,
        soa: null,
        soaUpload: null
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
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-auto flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-bold text-gray-800">Add New Loan</h2>
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
          <form id="add-loan-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                list="add-loan-company-list"
                type="text"
                required
                className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.companyName}
                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Select or enter Company Name"
              />
              <datalist id="add-loan-company-list">
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Upload Document</label>
                <input
                  type="file"
                  className="w-full p-2 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  onChange={handleFileChange}
                />
                {formData.file && <p className="text-xs text-green-600 mt-1">Selected: {formData.file}</p>}
              </div>
            </div>

            {/* Additional Documents: Sanction Letter, Repayment Letter, SOA */}
            <div className="pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                Loan Letters & Statements (Image / PDF)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Sanction Letter */}
                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-indigo-50/20 transition-all flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                      <FileText size={14} className="text-indigo-600" />
                      Sanction Letter
                    </label>
                    <p className="text-[11px] text-gray-400 mb-2">Upload Sanction letter (PDF/Image)</p>
                  </div>
                  <div>
                    <input
                      ref={sanctionInputRef}
                      type="file"
                      id="sanction-letter-upload"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
                      className="hidden"
                      onChange={e => handleDocumentFileChange(e, 'sanctionLetter')}
                    />
                    {formData.sanctionLetter ? (
                      <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                        <div className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span className="truncate font-medium" title={formData.sanctionLetter}>
                            {formData.sanctionLetter}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => clearDocumentFile('sanctionLetter', sanctionInputRef)}
                          className="text-emerald-700 hover:text-red-500 p-1 font-bold ml-1 text-xs"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => sanctionInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-gray-200 hover:border-indigo-400 text-gray-600 hover:text-indigo-600 rounded-lg text-xs font-medium shadow-sm transition-all"
                      >
                        <UploadCloud size={14} />
                        <span>Choose File</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Repayment Letter */}
                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-indigo-50/20 transition-all flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                      <FileText size={14} className="text-blue-600" />
                      Repayment Letter
                    </label>
                    <p className="text-[11px] text-gray-400 mb-2">Upload Repayment letter (PDF/Image)</p>
                  </div>
                  <div>
                    <input
                      ref={repaymentInputRef}
                      type="file"
                      id="repayment-letter-upload"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
                      className="hidden"
                      onChange={e => handleDocumentFileChange(e, 'repaymentLetter')}
                    />
                    {formData.repaymentLetter ? (
                      <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                        <div className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span className="truncate font-medium" title={formData.repaymentLetter}>
                            {formData.repaymentLetter}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => clearDocumentFile('repaymentLetter', repaymentInputRef)}
                          className="text-emerald-700 hover:text-red-500 p-1 font-bold ml-1 text-xs"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => repaymentInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-gray-200 hover:border-indigo-400 text-gray-600 hover:text-indigo-600 rounded-lg text-xs font-medium shadow-sm transition-all"
                      >
                        <UploadCloud size={14} />
                        <span>Choose File</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* SOA */}
                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-indigo-50/20 transition-all flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                      <FileText size={14} className="text-amber-600" />
                      SOA (Statement)
                    </label>
                    <p className="text-[11px] text-gray-400 mb-2">Upload SOA Statement (PDF/Image)</p>
                  </div>
                  <div>
                    <input
                      ref={soaInputRef}
                      type="file"
                      id="soa-upload"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
                      className="hidden"
                      onChange={e => handleDocumentFileChange(e, 'soa')}
                    />
                    {formData.soa ? (
                      <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                        <div className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span className="truncate font-medium" title={formData.soa}>
                            {formData.soa}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => clearDocumentFile('soa', soaInputRef)}
                          className="text-emerald-700 hover:text-red-500 p-1 font-bold ml-1 text-xs"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => soaInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-gray-200 hover:border-indigo-400 text-gray-600 hover:text-indigo-600 rounded-lg text-xs font-medium shadow-sm transition-all"
                      >
                        <UploadCloud size={14} />
                        <span>Choose File</span>
                      </button>
                    )}
                  </div>
                </div>
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
