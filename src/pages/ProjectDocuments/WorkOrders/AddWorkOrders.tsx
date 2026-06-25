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

interface AddWorkOrdersProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface WorkOrderEntry {
  id: string;
  state: string;
  date: string;
  department: string;
  scheme: string;
  company_name: string;
  total_value: string;
  file: File | null;
  fileName: string;
}

const AddWorkOrders: React.FC<AddWorkOrdersProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [entries, setEntries] = useState<WorkOrderEntry[]>([
    {
      id: Math.random().toString(),
      state: '',
      date: '',
      department: '',
      scheme: '',
      company_name: '',
      total_value: '',
      file: null,
      fileName: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (id: string, field: keyof WorkOrderEntry, value: any) => {
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
      toast.error('You can add maximum 10 work order records at a time.');
      return;
    }

    const lastEntry = entries[entries.length - 1];

    // Create new entry, cloning previous fields for convenience except file
    const newEntry: WorkOrderEntry = {
      id: Math.random().toString(),
      state: lastEntry.state || '',
      date: lastEntry.date || '',
      department: lastEntry.department || '',
      scheme: lastEntry.scheme || '',
      company_name: lastEntry.company_name || '',
      total_value: lastEntry.total_value || '',
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
        state: '',
        date: '',
        department: '',
        scheme: '',
        company_name: '',
        total_value: '',
        file: null,
        fileName: '',
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    for (const entry of entries) {
      if (!entry.state || !entry.date || !entry.department || !entry.scheme || !entry.company_name || !entry.total_value) {
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
            const filePath = `work_orders/${Date.now()}_${cleanFileName}`;

            const { data, error: uploadError } = await supabase.storage
              .from('insurance') // using insurance bucket for project documents as well
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
          .from('work_orders')
          .insert([
            {
              state: entry.state,
              date: entry.date,
              department: entry.department,
              scheme: entry.scheme,
              company_name: entry.company_name,
              total_value: entry.total_value ? Number(entry.total_value) : 0,
              file_url: fileUrl,
            },
          ])
          .select('id')
          .single();

        if (insertError) throw insertError;

        const serialNo = `WO-${inserted.id}`;

        await supabase
          .from('work_orders')
          .update({
            serial_no: serialNo,
          })
          .eq('id', inserted.id);
      }

      toast.success(`${entries.length} Work Order record(s) added successfully`);
      resetForm();
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save work orders');
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
                Add Work Order
              </h2>
              <p className="text-xs text-gray-500">
                Fill project work order details (Max 10)
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
          <form id="work-orders-form" onSubmit={handleSubmit} className="space-y-4">
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
                    Work Order Entry
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
                  {/* State */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={entry.state}
                      onChange={(e) => handleChange(entry.id, 'state', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. Maharashtra"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={entry.date}
                      onChange={(e) => handleChange(entry.id, 'date', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Department *
                    </label>
                    <input
                      type="text"
                      required
                      value={entry.department}
                      onChange={(e) => handleChange(entry.id, 'department', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. PWD"
                    />
                  </div>

                  {/* Scheme */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Scheme *
                    </label>
                    <input
                      type="text"
                      required
                      value={entry.scheme}
                      onChange={(e) => handleChange(entry.id, 'scheme', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. Smart City Project"
                    />
                  </div>

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
                      placeholder="e.g. ABC Infra"
                    />
                  </div>

                  {/* Total Value */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Total Value *
                    </label>
                    <input
                      type="number"
                      required
                      value={entry.total_value}
                      onChange={(e) => handleChange(entry.id, 'total_value', e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50/30"
                      placeholder="e.g. 500000"
                    />
                  </div>

                  {/* File Upload */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Upload Work Order Document
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
            Add Another Work Order
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
            form="work-orders-form"
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
                Save Work Order
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddWorkOrders;