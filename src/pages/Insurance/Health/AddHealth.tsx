import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Save, Loader2, HeartPulse, Plus, Trash2, Upload } from 'lucide-react';
import supabase from '../../../utils/supabase';

interface AddHealthProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface HealthInsuranceEntry {
  id: string;
  company_name: string;
  plan_name: string;
  policy_holder: string;
  policy_no: string;
  persons_covered: string;
  policy_cover: string;
  start_date: string;
  end_date: string;
  premium_paid: string;
  insurance_agent: string;
  contact_details: string;
  need_renewal: boolean;
  renewal_date: string;
  file: File | null;
  fileName: string;
  concern_person_name: string;
  concern_person_mobile: string;
  concern_person_department: string;
}

const AddHealth: React.FC<AddHealthProps> = ({ isOpen, onClose, onSuccess }) => {
  const [entries, setEntries] = useState<HealthInsuranceEntry[]>([
    {
      id: Math.random().toString(),
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
      file: null,
      fileName: '',
      concern_person_name: '',
      concern_person_mobile: '',
      concern_person_department: '',
    },
  ]);

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

  if (!isOpen) return null;

  const handleChange = (id: string, field: keyof HealthInsuranceEntry, value: any) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        e.target.value = '';
        return;
      }
      setEntries((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                file: file,
                fileName: file.name,
              }
            : item
        )
      );
    }
  };

  const addEntry = () => {
    if (entries.length >= 10) {
      toast.error('You can add maximum 10 health insurance records at a time.');
      return;
    }

    const lastEntry = entries[entries.length - 1];

    const newEntry: HealthInsuranceEntry = {
      id: Math.random().toString(),
      company_name: lastEntry.company_name || '',
      plan_name: lastEntry.plan_name || '',
      policy_holder: lastEntry.policy_holder || '',
      policy_no: '', // leave empty for user to fill
      persons_covered: lastEntry.persons_covered || '',
      policy_cover: lastEntry.policy_cover || '',
      start_date: lastEntry.start_date || '',
      end_date: lastEntry.end_date || '',
      premium_paid: lastEntry.premium_paid || '',
      insurance_agent: lastEntry.insurance_agent || '',
      contact_details: lastEntry.contact_details || '',
      need_renewal: lastEntry.need_renewal || false,
      renewal_date: lastEntry.renewal_date || '',
      file: null, // do not clone file
      fileName: '',
      concern_person_name: lastEntry.concern_person_name || '',
      concern_person_mobile: lastEntry.concern_person_mobile || '',
      concern_person_department: lastEntry.concern_person_department || '',
    };

    setEntries((prev) => [...prev, newEntry]);
    toast.success('Previous entry data copied. Please fill Policy No.');
  };

  const removeEntry = (id: string) => {
    if (entries.length === 1) {
      toast.error('At least one entry is required.');
      return;
    }
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const resetForm = () => {
    setEntries([
      {
        id: Math.random().toString(),
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
        file: null,
        fileName: '',
        concern_person_name: '',
        concern_person_mobile: '',
        concern_person_department: '',
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    for (const entry of entries) {
      if (!entry.company_name || !entry.plan_name || !entry.policy_holder || !entry.policy_no || !entry.persons_covered || !entry.policy_cover || !entry.start_date || !entry.end_date || !entry.premium_paid) {
        toast.error('Please fill all required fields (*) for all entries.');
        return;
      }
      if (entry.need_renewal && !entry.renewal_date) {
        toast.error('Please select a renewal date for entries that need renewal.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Save new company names to master table if not existing
      for (const entry of entries) {
        if (entry.company_name.trim()) {
          const exists = masterCompanies.some(
            (c) => c.toLowerCase() === entry.company_name.trim().toLowerCase()
          );
          if (!exists) {
            await supabase.from('master').insert([{ company_name: entry.company_name.trim() }]);
          }
        }
      }

      const uploadResults: Array<{ index: number; fileUrl: string | null }> = [];

      // 1. Upload files
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.file) {
          try {
            const cleanFileName = entry.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `health/${Date.now()}_${cleanFileName}`;

            const { data, error: uploadError } = await supabase.storage
              .from('insurance')
              .upload(filePath, entry.file, {
                cacheControl: '3600',
                upsert: false,
              });

            if (uploadError) {
              console.error(`Upload failed for file ${i + 1}:`, uploadError);
              uploadResults.push({ index: i, fileUrl: null });
              toast.error(`File ${entry.fileName} upload failed. Saving without file.`);
            } else {
              const { data: { publicUrl } } = supabase.storage
                .from('insurance')
                .getPublicUrl(data.path);
              uploadResults.push({ index: i, fileUrl: publicUrl });
            }
          } catch (uploadErr) {
            console.error(`Upload error for file ${i + 1}:`, uploadErr);
            uploadResults.push({ index: i, fileUrl: null });
            toast.error(`Failed to upload ${entry.fileName}, saving without file.`);
          }
        } else {
          uploadResults.push({ index: i, fileUrl: null });
        }
      }

      // 2. Insert into Supabase
      for (const [index, entry] of entries.entries()) {
        const fileUrl = uploadResults.find((r) => r.index === index)?.fileUrl || null;

        const { data: inserted, error: insertError } = await supabase
          .from('health_insurance')
          .insert([
            {
              company_name: entry.company_name,
              plan_name: entry.plan_name,
              policy_holder: entry.policy_holder,
              policy_no: entry.policy_no,
              persons_covered: entry.persons_covered,
              policy_cover: entry.policy_cover ? Number(entry.policy_cover) : null,
              start_date: entry.start_date || null,
              end_date: entry.end_date || null,
              premium_paid: entry.premium_paid ? Number(entry.premium_paid) : null,
              insurance_agent: entry.insurance_agent,
              contact_details: entry.contact_details,
              document_url: fileUrl,
              need_renewal: entry.need_renewal,
              renewal_date: entry.need_renewal && entry.renewal_date ? entry.renewal_date : null,
              concern_person_name: entry.concern_person_name || null,
              concern_person_mobile: entry.concern_person_mobile || null,
              concern_person_department: entry.concern_person_department || null,
            },
          ])
          .select('id')
          .single();

        if (insertError) throw insertError;

        const serialNo = `HT-${String(inserted.id).padStart(3, '0')}`;

        await supabase
          .from('health_insurance')
          .update({
            serial_no: serialNo,
          })
          .eq('id', inserted.id);
      }

      toast.success(`${entries.length} Health Insurance record(s) added successfully`);
      resetForm();
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save health insurance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-4 w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <HeartPulse size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Add Health Insurance</h2>
              <p className="text-xs text-gray-500">Fill health insurance details (Max 10)</p>
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
        <div className="overflow-y-auto p-6 bg-gray-50/50 flex-1 space-y-4">
          <form id="health-insurance-form" onSubmit={handleSubmit} className="space-y-4">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className="relative p-5 bg-white rounded-xl shadow-sm border border-gray-200 group"
              >
                <div className="flex justify-between items-center pb-2 mb-4 border-b border-gray-100">
                  <h3 className="text-xs font-bold tracking-wider text-gray-600 uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                    Health Insurance Entry
                    {index > 0 && (
                      <span className="text-[10px] font-normal text-indigo-600 lowercase bg-indigo-50 px-2 py-0.5 rounded-full">
                        auto-filled from previous
                      </span>
                    )}
                  </h3>
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                      title="Remove Entry"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Company Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Company Name *</label>
                    <input
                      list={`add-health-company-list-${entry.id}`}
                      type="text"
                      required
                      value={entry.company_name}
                      onChange={(e) => handleChange(entry.id, 'company_name', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="Select or enter Company Name"
                    />
                    <datalist id={`add-health-company-list-${entry.id}`}>
                      {masterCompanies.map((company, cIdx) => (
                        <option key={cIdx} value={company} />
                      ))}
                    </datalist>
                  </div>

                  {/* Plan Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Plan Name *</label>
                    <input
                      type="text"
                      required
                      value={entry.plan_name}
                      onChange={(e) => handleChange(entry.id, 'plan_name', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. Family Optima"
                    />
                  </div>

                  {/* Policy Holder */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Policy Holder *</label>
                    <input
                      type="text"
                      required
                      value={entry.policy_holder}
                      onChange={(e) => handleChange(entry.id, 'policy_holder', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  {/* Policy No */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Policy No *</label>
                    <input
                      type="text"
                      required
                      value={entry.policy_no}
                      onChange={(e) => handleChange(entry.id, 'policy_no', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. HLT123456"
                    />
                  </div>

                  {/* Policy Cover */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Policy Cover (Sum Insured) *</label>
                    <input
                      type="number"
                      required
                      value={entry.policy_cover}
                      onChange={(e) => handleChange(entry.id, 'policy_cover', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. 500000"
                    />
                  </div>

                  {/* Premium Paid */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Premium Paid *</label>
                    <input
                      type="number"
                      required
                      value={entry.premium_paid}
                      onChange={(e) => handleChange(entry.id, 'premium_paid', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="Premium amount"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={entry.start_date}
                      onChange={(e) => handleChange(entry.id, 'start_date', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">End Date *</label>
                    <input
                      type="date"
                      required
                      value={entry.end_date}
                      onChange={(e) => handleChange(entry.id, 'end_date', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                    />
                  </div>

                  {/* Insurance Agent */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Insurance Agent</label>
                    <input
                      type="text"
                      value={entry.insurance_agent}
                      onChange={(e) => handleChange(entry.id, 'insurance_agent', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="Agent name"
                    />
                  </div>

                  {/* Contact Details */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Details</label>
                    <input
                      type="text"
                      value={entry.contact_details}
                      onChange={(e) => handleChange(entry.id, 'contact_details', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="Mobile or email"
                    />
                  </div>

                  {/* Persons Covered */}
                  <div className="md:col-span-2 lg:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Persons Covered *</label>
                    <input
                      type="text"
                      required
                      value={entry.persons_covered}
                      onChange={(e) => handleChange(entry.id, 'persons_covered', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. Self, Spouse, Child 1"
                    />
                  </div>

                  {/* Concern Person Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Concern Person Name
                    </label>
                    <input
                      type="text"
                      value={entry.concern_person_name}
                      onChange={(e) => handleChange(entry.id, 'concern_person_name', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="Name (Optional)"
                    />
                  </div>

                  {/* Concern Person Mobile */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Concern Mobile
                    </label>
                    <input
                      type="text"
                      value={entry.concern_person_mobile}
                      onChange={(e) => handleChange(entry.id, 'concern_person_mobile', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="Mobile No (Optional)"
                    />
                  </div>

                  {/* Concern Person Department */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Concern Department
                    </label>
                    <input
                      type="text"
                      value={entry.concern_person_department}
                      onChange={(e) => handleChange(entry.id, 'concern_person_department', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="Department (Optional)"
                    />
                  </div>

                  {/* Need Renewal & Date */}
                  <div className="flex gap-3 items-center p-2 rounded-lg border border-gray-100 bg-gray-50/50">
                    <label className="flex gap-2 items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        checked={entry.need_renewal}
                        onChange={(e) => handleChange(entry.id, 'need_renewal', e.target.checked)}
                      />
                      <span className="text-xs font-semibold text-gray-700">Need Renewal</span>
                    </label>

                    {entry.need_renewal && (
                      <div className="flex-1">
                        <input
                          type="date"
                          required={entry.need_renewal}
                          className="w-full p-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                          value={entry.renewal_date}
                          onChange={(e) => handleChange(entry.id, 'renewal_date', e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* File Upload */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Upload Document</label>
                    <div className="relative flex items-center gap-3">
                      <input
                        type="file"
                        id={`file-upload-${entry.id}`}
                        onChange={(e) => handleFileChange(entry.id, e)}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                      <label
                        htmlFor={`file-upload-${entry.id}`}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:border-indigo-500 hover:text-indigo-600 bg-white rounded-lg cursor-pointer text-xs font-semibold shadow-sm transition"
                      >
                        <Upload size={14} />
                        Choose File
                      </label>
                      {entry.fileName ? (
                        <div className="text-xs text-green-600 font-medium truncate max-w-md">{entry.fileName}</div>
                      ) : (
                        <span className="text-xs text-gray-400">No file chosen</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </form>

          {/* Add Entry Button */}
          <button
            type="button"
            onClick={addEntry}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 hover:border-indigo-500 text-gray-500 hover:text-indigo-600 font-semibold rounded-xl transition bg-white"
          >
            <Plus size={16} />
            Add Another Health Insurance
          </button>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 border rounded-xl font-semibold hover:bg-gray-100 transition text-sm text-gray-700 bg-white"
          >
            Cancel
          </button>
          <button
            form="health-insurance-form"
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving ({entries.length})...
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

export default AddHealth;
