import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  X,
  Save,
  Loader2,
  Car,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import supabase from '../../../utils/supabase';

interface AddVehicleInsuranceProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface VehicleInsuranceEntry {
  id: string;
  company_name: string;
  registration_no: string;
  make: string;
  model: string;
  insurance_agent: string;
  period_from: string;
  period_to: string;
  premium_paid: string;
  add_on: string;
  policy_link: string;
  need_renewal: boolean;
  renewal_date: string;
  file: File | null;
  fileName: string;
  rcFile: File | null;
  rcFileName: string;
  concern_person_name: string;
  concern_person_mobile: string;
  concern_person_department: string;
}

const AddVehicleInsurance: React.FC<AddVehicleInsuranceProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [entries, setEntries] = useState<VehicleInsuranceEntry[]>([
    {
      id: Math.random().toString(),
      company_name: '',
      registration_no: '',
      make: '',
      model: '',
      insurance_agent: '',
      period_from: '',
      period_to: '',
      premium_paid: '',
      add_on: '',
      policy_link: '',
      need_renewal: false,
      renewal_date: '',
      file: null,
      fileName: '',
      rcFile: null,
      rcFileName: '',
      concern_person_name: '',
      concern_person_mobile: '',
      concern_person_department: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (id: string, field: keyof VehicleInsuranceEntry, value: any) => {
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

  const handleRcFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
                rcFile: file,
                rcFileName: file.name,
              }
            : item
        )
      );
    }
  };

  const addEntry = () => {
    if (entries.length >= 10) {
      toast.error('You can add maximum 10 insurance records at a time.');
      return;
    }

    const lastEntry = entries[entries.length - 1];

    // Create new entry, cloning previous fields except registration_no and file
    const newEntry: VehicleInsuranceEntry = {
      id: Math.random().toString(),
      company_name: lastEntry.company_name || '',
      registration_no: '', // leave empty for user to fill
      make: lastEntry.make || '',
      model: lastEntry.model || '',
      insurance_agent: lastEntry.insurance_agent || '',
      period_from: lastEntry.period_from || '',
      period_to: lastEntry.period_to || '',
      premium_paid: lastEntry.premium_paid || '',
      add_on: lastEntry.add_on || '',
      policy_link: lastEntry.policy_link || '',
      need_renewal: lastEntry.need_renewal || false,
      renewal_date: lastEntry.renewal_date || '',
      file: null, // do not clone file
      fileName: '',
      rcFile: null,
      rcFileName: '',
      concern_person_name: lastEntry.concern_person_name || '',
      concern_person_mobile: lastEntry.concern_person_mobile || '',
      concern_person_department: lastEntry.concern_person_department || '',
    };

    setEntries((prev) => [...prev, newEntry]);
    toast.success('Previous entry data copied. Please fill Registration No.');
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
        registration_no: '',
        make: '',
        model: '',
        insurance_agent: '',
        period_from: '',
        period_to: '',
        premium_paid: '',
        add_on: '',
        policy_link: '',
        need_renewal: false,
        renewal_date: '',
        file: null,
        fileName: '',
        rcFile: null,
        rcFileName: '',
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
      if (!entry.company_name || !entry.registration_no || !entry.make || !entry.model || !entry.period_from || !entry.period_to || !entry.premium_paid) {
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
      const uploadResults: Array<{ index: number; fileUrl: string | null; rcUrl: string | null }> = [];

      // 1. Upload files first
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        let fileUrl: string | null = null;
        let rcUrl: string | null = null;

        // Policy file upload
        if (entry.file) {
          try {
            const cleanFileName = entry.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `vehicle/${Date.now()}_${cleanFileName}`;

            const { data, error: uploadError } = await supabase.storage
              .from('insurance')
              .upload(filePath, entry.file, {
                cacheControl: '3600',
                upsert: false,
              });

            if (uploadError) {
              console.error(`Upload failed for policy file ${i + 1}:`, uploadError);
              toast.error(`Policy File ${entry.fileName} upload failed.`);
            } else {
              const { data: { publicUrl } } = supabase.storage
                .from('insurance')
                .getPublicUrl(data.path);
              fileUrl = publicUrl;
            }
          } catch (uploadErr) {
            console.error(`Upload error for policy file ${i + 1}:`, uploadErr);
          }
        }

        // RC file upload
        if (entry.rcFile) {
          try {
            const cleanFileName = entry.rcFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `vehicle_rc/${Date.now()}_${cleanFileName}`;

            const { data, error: uploadError } = await supabase.storage
              .from('insurance')
              .upload(filePath, entry.rcFile, {
                cacheControl: '3600',
                upsert: false,
              });

            if (uploadError) {
              console.error(`Upload failed for RC file ${i + 1}:`, uploadError);
              toast.error(`RC File ${entry.rcFileName} upload failed.`);
            } else {
              const { data: { publicUrl } } = supabase.storage
                .from('insurance')
                .getPublicUrl(data.path);
              rcUrl = publicUrl;
            }
          } catch (uploadErr) {
            console.error(`Upload error for RC file ${i + 1}:`, uploadErr);
          }
        }

        uploadResults.push({ index: i, fileUrl, rcUrl });
      }

      // 2. Insert records
      for (const [index, entry] of entries.entries()) {
        const result = uploadResults.find((r) => r.index === index);
        const fileUrl = result?.fileUrl || null;
        const rcUrl = result?.rcUrl || null;

        const { data: inserted, error: insertError } = await supabase
          .from('vehicle_insurance')
          .insert([
            {
              company_name: entry.company_name,
              registration_no: entry.registration_no,
              make: entry.make,
              model: entry.model,
              insurance_agent: entry.insurance_agent,
              period_from: entry.period_from || null,
              period_to: entry.period_to || null,
              premium_paid: entry.premium_paid ? Number(entry.premium_paid) : 0,
              add_on: entry.add_on || null,
              policy_link: entry.policy_link || null,
              file_url: fileUrl,
              rc_url: rcUrl,
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

        const serialNo = `VEH-${inserted.id}`;

        await supabase
          .from('vehicle_insurance')
          .update({
            serial_no: serialNo,
          })
          .eq('id', inserted.id);
      }

      toast.success(`${entries.length} Vehicle Insurance record(s) added successfully`);
      resetForm();
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save vehicle insurance');
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
              <Car size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 animate-pulse-subtle">
                Add Vehicle Insurance
              </h2>
              <p className="text-xs text-gray-500">
                Fill vehicle insurance details (Max 10)
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
        <div className="overflow-y-auto p-6 bg-gray-50/50 flex-1 space-y-4">
          <form id="vehicle-insurance-form" onSubmit={handleSubmit} className="space-y-4">
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
                    Vehicle Entry
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
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={entry.company_name}
                      onChange={(e) => handleChange(entry.id, 'company_name', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. Star Insurance"
                    />
                  </div>

                  {/* Registration No */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Registration No *
                    </label>
                    <input
                      type="text"
                      required
                      value={entry.registration_no}
                      onChange={(e) => handleChange(entry.id, 'registration_no', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. MH12AB1234"
                    />
                  </div>

                  {/* Make */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Make *
                    </label>
                    <input
                      type="text"
                      required
                      value={entry.make}
                      onChange={(e) => handleChange(entry.id, 'make', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. Honda"
                    />
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Model *
                    </label>
                    <input
                      type="text"
                      required
                      value={entry.model}
                      onChange={(e) => handleChange(entry.id, 'model', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. City"
                    />
                  </div>

                  {/* Insurance Agent */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Insurance Agent *
                    </label>
                    <input
                      type="text"
                      required
                      value={entry.insurance_agent}
                      onChange={(e) => handleChange(entry.id, 'insurance_agent', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="Agent name"
                    />
                  </div>

                  {/* Premium Paid */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Premium Paid *
                    </label>
                    <input
                      type="number"
                      required
                      value={entry.premium_paid}
                      onChange={(e) => handleChange(entry.id, 'premium_paid', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="Premium amount"
                    />
                  </div>

                  {/* Period From */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Period From *
                    </label>
                    <input
                      type="date"
                      required
                      value={entry.period_from}
                      onChange={(e) => handleChange(entry.id, 'period_from', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                    />
                  </div>

                  {/* Period To */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Period To *
                    </label>
                    <input
                      type="date"
                      required
                      value={entry.period_to}
                      onChange={(e) => handleChange(entry.id, 'period_to', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                    />
                  </div>

                  {/* Add On */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Add On
                    </label>
                    <input
                      type="text"
                      value={entry.add_on}
                      onChange={(e) => handleChange(entry.id, 'add_on', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. Zero Dep"
                    />
                  </div>

                  {/* Policy Link */}
                  <div className="md:col-span-2 lg:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Policy Link
                    </label>
                    <input
                      type="text"
                      value={entry.policy_link}
                      onChange={(e) => handleChange(entry.id, 'policy_link', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="https://..."
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
                      <span className="text-xs font-semibold text-gray-700">
                        Need Renewal
                      </span>
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
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Upload Policy File
                    </label>
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
                        <div className="text-xs text-green-600 font-medium truncate max-w-md">
                          {entry.fileName}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No file chosen</span>
                      )}
                    </div>
                  </div>

                  {/* RC File Upload */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Upload Registration Certificate (RC)
                    </label>
                    <div className="relative flex items-center gap-3">
                      <input
                        type="file"
                        id={`rc-file-upload-${entry.id}`}
                        onChange={(e) => handleRcFileChange(entry.id, e)}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      <label
                        htmlFor={`rc-file-upload-${entry.id}`}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:border-indigo-500 hover:text-indigo-600 bg-white rounded-lg cursor-pointer text-xs font-semibold shadow-sm transition"
                      >
                        <Upload size={14} />
                        Choose RC File
                      </label>
                      {entry.rcFileName ? (
                        <div className="text-xs text-green-600 font-medium truncate max-w-md">
                          {entry.rcFileName}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No RC file chosen</span>
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
            Add Another Vehicle
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
            form="vehicle-insurance-form"
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

export default AddVehicleInsurance;