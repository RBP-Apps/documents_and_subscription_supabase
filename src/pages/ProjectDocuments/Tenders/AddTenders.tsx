import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  X,
  Save,
  Loader2,
  Briefcase,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import supabase from '../../../utils/supabase';

interface AddTendersProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface TenderEntry {
  id: string;
  name_of_person: string;
  tender_name: string;
  state_name: string;
  name_of_department: string;
  firm_name: string;
  tender_details: string;
  tender_start_date: string;
  tender_end_date: string;
  file: File | null;
  fileName: string;
}

const AddTenders: React.FC<AddTendersProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [entries, setEntries] = useState<TenderEntry[]>([
    {
      id: Math.random().toString(),
      name_of_person: '',
      tender_name: '',
      state_name: '',
      name_of_department: '',
      firm_name: '',
      tender_details: '',
      tender_start_date: '',
      tender_end_date: '',
      file: null,
      fileName: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (id: string, field: keyof TenderEntry, value: any) => {
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
      toast.error('You can add maximum 10 tender records at a time.');
      return;
    }

    const lastEntry = entries[entries.length - 1];

    const newEntry: TenderEntry = {
      id: Math.random().toString(),
      name_of_person: lastEntry.name_of_person || '',
      tender_name: lastEntry.tender_name || '',
      state_name: lastEntry.state_name || '',
      name_of_department: lastEntry.name_of_department || '',
      firm_name: lastEntry.firm_name || '',
      tender_details: lastEntry.tender_details || '',
      tender_start_date: lastEntry.tender_start_date || '',
      tender_end_date: lastEntry.tender_end_date || '',
      file: null,
      fileName: '',
    };

    setEntries((prev) => [...prev, newEntry]);
    toast.success('Previous entry data copied.');
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
        name_of_person: '',
        tender_name: '',
        state_name: '',
        name_of_department: '',
        firm_name: '',
        tender_details: '',
        tender_start_date: '',
        tender_end_date: '',
        file: null,
        fileName: '',
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    for (const entry of entries) {
      if (
        !entry.name_of_person ||
        !entry.tender_name ||
        !entry.state_name ||
        !entry.name_of_department ||
        !entry.firm_name ||
        !entry.tender_start_date ||
        !entry.tender_end_date
      ) {
        toast.error('Please fill all required fields (*) for all entries.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const uploadResults: Array<{ index: number; fileUrl: string | null }> = [];

      // 1. Upload files first
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.file) {
          try {
            const cleanFileName = entry.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `tenders/${Date.now()}_${cleanFileName}`;

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

      // 2. Insert records
      for (const [index, entry] of entries.entries()) {
        const fileUrl = uploadResults.find((r) => r.index === index)?.fileUrl || null;

        const { data: inserted, error: insertError } = await supabase
          .from('tenders')
          .insert([
            {
              name_of_person: entry.name_of_person,
              tender_name: entry.tender_name,
              state_name: entry.state_name,
              name_of_department: entry.name_of_department,
              firm_name: entry.firm_name,
              tender_details: entry.tender_details || null,
              tender_start_date: entry.tender_start_date,
              tender_end_date: entry.tender_end_date,
              nit_file_upload: fileUrl,
            },
          ])
          .select('id')
          .single();

        if (insertError) throw insertError;

        const serialNo = `TND-${inserted.id}`;

        await supabase
          .from('tenders')
          .update({
            serial_no: serialNo,
          })
          .eq('id', inserted.id);
      }

      toast.success(`${entries.length} Tender record(s) added successfully`);
      resetForm();
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save tenders. Make sure database table exists.');
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
              <Briefcase size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 animate-pulse-subtle">
                Add Tender
              </h2>
              <p className="text-xs text-gray-500">
                Fill project tender details (Max 10)
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
          <form id="tenders-form" onSubmit={handleSubmit} className="space-y-4">
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
                    Tender Entry
                    {index > 0 && (
                      <span className="text-[10px] font-normal text-indigo-600 lowercase bg-indigo-50 px-2 py-0.5 rounded-full">
                        copied from previous
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
                  {/* Name of the Person */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Name Of The Person *
                    </label>
                    <input
                      type="text"
                      required
                      value={entry.name_of_person}
                      onChange={(e) => handleChange(entry.id, 'name_of_person', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. Rakesh Sharma"
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
                      value={entry.tender_name}
                      onChange={(e) => handleChange(entry.id, 'tender_name', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. Road Construction Phase II"
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
                      value={entry.state_name}
                      onChange={(e) => handleChange(entry.id, 'state_name', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. Madhya Pradesh"
                    />
                  </div>

                  {/* Name of Department */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Name Of Department *
                    </label>
                    <input
                      type="text"
                      required
                      value={entry.name_of_department}
                      onChange={(e) => handleChange(entry.id, 'name_of_department', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. MPRRDA"
                    />
                  </div>

                  {/* Firm Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Firm Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={entry.firm_name}
                      onChange={(e) => handleChange(entry.id, 'firm_name', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. ABC Infratech"
                    />
                  </div>


                  {/* Tender Start Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Tender Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={entry.tender_start_date}
                      onChange={(e) => handleChange(entry.id, 'tender_start_date', e.target.value)}
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
                      value={entry.tender_end_date}
                      onChange={(e) => handleChange(entry.id, 'tender_end_date', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                    />
                  </div>

                  {/* Tender Details */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Tender Details
                    </label>
                    <textarea
                      rows={2}
                      value={entry.tender_details}
                      onChange={(e) => handleChange(entry.id, 'tender_details', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30 resize-none"
                      placeholder="Enter specifications, scope or description..."
                    />
                  </div>

                  {/* Nit File Upload */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Nit File Upload
                    </label>
                    <div className="relative flex items-center gap-3">
                      <input
                        type="file"
                        id={`nit-upload-${entry.id}`}
                        onChange={(e) => handleFileChange(entry.id, e)}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                      <label
                        htmlFor={`nit-upload-${entry.id}`}
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
            Add Another Tender
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
            form="tenders-form"
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
                Save Tender
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTenders;
