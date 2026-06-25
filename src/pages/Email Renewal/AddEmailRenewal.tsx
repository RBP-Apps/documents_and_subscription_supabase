import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { X, Save, Loader2, Plus, Trash2, MailWarning } from 'lucide-react';
import supabase from '../../utils/supabase';

interface AddEmailRenewalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ServiceDetail {
  sub_serial_no: number;
  description: string;
  domain_name: string;
  start_date: string;
  end_date: string;
  quantity: string;
  total_amount: string;
  need_renewal: boolean;
  renewal_date: string;
  concern_person_name: string;
  concern_person_mobile: string;
  concern_person_department: string;
}

const AddEmailRenewal: React.FC<AddEmailRenewalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [remarks, setRemarks] = useState('');

  const [services, setServices] = useState<ServiceDetail[]>([
    {
      sub_serial_no: 1,
      description: '',
      domain_name: '',
      start_date: '',
      end_date: '',
      quantity: '',
      total_amount: '',
      need_renewal: false,
      renewal_date: '',
      concern_person_name: '',
      concern_person_mobile: '',
      concern_person_department: '',
    },
  ]);

  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddService = () => {
    const nextSubSrNo = services.length + 1;
    setServices([
      ...services,
      {
        sub_serial_no: nextSubSrNo,
        description: '',
        domain_name: '',
        start_date: '',
        end_date: '',
        quantity: '',
        total_amount: '',
        need_renewal: false,
        renewal_date: '',
        concern_person_name: '',
        concern_person_mobile: '',
        concern_person_department: '',
      },
    ]);
  };

  const handleRemoveService = (index: number) => {
    if (services.length === 1) {
      toast.error('At least one service detail row is required');
      return;
    }
    const updatedServices = services.filter((_, i) => i !== index);
    // Re-index the sub serial numbers
    const reindexedServices = updatedServices.map((service, idx) => ({
      ...service,
      sub_serial_no: idx + 1,
    }));
    setServices(reindexedServices);
  };

  const handleServiceChange = (
    index: number,
    field: keyof ServiceDetail,
    value: any
  ) => {
    const updatedServices = [...services];
    updatedServices[index] = {
      ...updatedServices[index],
      [field]: value,
    };
    setServices(updatedServices);
  };

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
    setInvoiceNo('');
    setInvoiceDate('');
    setServiceProvider('');
    setRemarks('');
    setServices([
      {
        sub_serial_no: 1,
        description: '',
        domain_name: '',
        start_date: '',
        end_date: '',
        quantity: '',
        total_amount: '',
        need_renewal: false,
        renewal_date: '',
        concern_person_name: '',
        concern_person_mobile: '',
        concern_person_department: '',
      },
    ]);
    setFileUpload(null);
    setFileName('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validations
    if (services.some((s) => !s.description || !s.domain_name || !s.start_date || !s.end_date || !s.quantity || !s.total_amount)) {
      toast.error('Please fill all required fields in the service rows');
      return;
    }

    if (services.some((s) => s.need_renewal && !s.renewal_date)) {
      toast.error('Please select a renewal date for services that need renewal');
      return;
    }

    try {
      setIsSubmitting(true);

      let documentUrl = '';

      // Upload File
      if (fileUpload) {
        const cleanFileName = fileUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `email_renewals/${Date.now()}_${cleanFileName}`;

        const { data, error } = await supabase.storage
          .from('Email Renewal')
          .upload(filePath, fileUpload, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from('Email Renewal').getPublicUrl(data.path);

        documentUrl = publicUrl;
      }

      // 1. Insert Master row
      const { data: insertedMaster, error: masterError } = await supabase
        .from('email_renewal_master')
        .insert([
          {
            invoice_no: invoiceNo,
            invoice_date: invoiceDate,
            service_provider: serviceProvider,
            remarks: remarks || null,
            document_url: documentUrl || null,
          },
        ])
        .select('id')
        .single();

      if (masterError) throw masterError;

      const serialNo = `ER-${String(insertedMaster.id).padStart(3, '0')}`;

      // 2. Update Master Serial No
      await supabase
        .from('email_renewal_master')
        .update({
          serial_no: serialNo,
        })
        .eq('id', insertedMaster.id);

      // 3. Bulk Insert Details
      const detailsToInsert = services.map((s) => ({
        master_id: insertedMaster.id,
        sub_serial_no: s.sub_serial_no,
        description: s.description,
        domain_name: s.domain_name,
        start_date: s.start_date,
        end_date: s.end_date,
        quantity: Number(s.quantity),
        total_amount: Number(s.total_amount),
        need_renewal: s.need_renewal,
        renewal_date: s.need_renewal && s.renewal_date ? s.renewal_date : null,
        concern_person_name: s.concern_person_name || null,
        concern_person_mobile: s.concern_person_mobile || null,
        concern_person_department: s.concern_person_department || null,
      }));

      const { error: detailsError } = await supabase
        .from('email_renewal_details')
        .insert(detailsToInsert);

      if (detailsError) throw detailsError;

      toast.success(`Expense Renewal Added (${serialNo})`);
      resetForm();
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save renewal entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <MailWarning size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Add Email / Expense Renewal</h2>
              <p className="text-xs text-gray-500">Create renewal entry with master-detail structure</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 rounded-full hover:bg-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-6 flex-1 space-y-6">
          <form id="add-email-renewal-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Master / Fixed Fields Section */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-600 border-b pb-2">
                Invoice & Provider Details (Master)
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice No *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white shadow-sm"
                    placeholder="e.g. INV001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Service Provider *</label>
                  <input
                    type="text"
                    required
                    value={serviceProvider}
                    onChange={(e) => setServiceProvider(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white shadow-sm"
                    placeholder="e.g. ABC Pvt Ltd"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Services Details Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                  Service Details (Dynamic Rows)
                </h3>
                <button
                  type="button"
                  onClick={handleAddService}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
                >
                  <Plus size={14} />
                  Add Service
                </button>
              </div>

              {/* Rows List */}
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                {services.map((service, index) => (
                  <div
                    key={index}
                    className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm relative group hover:border-indigo-200 transition"
                  >
                    {/* Header of Detail Card */}
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full">
                        Sub Serial No: {service.sub_serial_no}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(index)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition"
                        title="Remove Service Row"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Form Inputs of Detail Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Description of Services *
                        </label>
                        <input
                          type="text"
                          required
                          value={service.description}
                          onChange={(e) =>
                            handleServiceChange(index, 'description', e.target.value)
                          }
                          className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          placeholder="e.g. Domain Renewal"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Domain Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={service.domain_name}
                          onChange={(e) =>
                            handleServiceChange(index, 'domain_name', e.target.value)
                          }
                          className="w-full p-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          placeholder="e.g. abc.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={service.start_date}
                          onChange={(e) =>
                            handleServiceChange(index, 'start_date', e.target.value)
                          }
                          className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          End Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={service.end_date}
                          onChange={(e) =>
                            handleServiceChange(index, 'end_date', e.target.value)
                          }
                          className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={service.quantity}
                          onChange={(e) =>
                            handleServiceChange(index, 'quantity', e.target.value)
                          }
                          className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          placeholder="e.g. 1"
                        />
                      </div>
                      <div className="md:col-span-2 lg:col-span-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Total Amount *
                        </label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={service.total_amount}
                          onChange={(e) =>
                            handleServiceChange(index, 'total_amount', e.target.value)
                          }
                          className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-bold text-gray-800"
                          placeholder="e.g. 1000"
                        />
                      </div>
                    </div>

                    {/* Renewal and date option inside card */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4 items-center">
                      <div className="flex gap-3 items-center p-2 rounded-lg border border-gray-100 bg-gray-50/50 min-w-[280px]">
                        <label className="flex gap-2 items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            checked={service.need_renewal}
                            onChange={(e) =>
                              handleServiceChange(index, 'need_renewal', e.target.checked)
                            }
                          />
                          <span className="text-xs font-semibold text-gray-700">Need Renewal</span>
                        </label>

                        {service.need_renewal && (
                          <div className="flex-1">
                            <input
                              type="date"
                              required={service.need_renewal}
                              className="w-full p-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                              value={service.renewal_date}
                              onChange={(e) =>
                                handleServiceChange(index, 'renewal_date', e.target.value)
                              }
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          placeholder="Concern Person Name"
                          className="w-full p-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                          value={service.concern_person_name}
                          onChange={(e) =>
                            handleServiceChange(index, 'concern_person_name', e.target.value)
                          }
                        />
                      </div>

                      <div className="flex-1 min-w-[150px]">
                        <input
                          type="text"
                          placeholder="Concern Mobile"
                          className="w-full p-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                          value={service.concern_person_mobile}
                          onChange={(e) =>
                            handleServiceChange(index, 'concern_person_mobile', e.target.value)
                          }
                        />
                      </div>

                      <div className="flex-1 min-w-[150px]">
                        <input
                          type="text"
                          placeholder="Concern Department"
                          className="w-full p-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                          value={service.concern_person_department}
                          onChange={(e) =>
                            handleServiceChange(index, 'concern_person_department', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Fields (Remarks & File Upload) */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-600 border-b pb-2">
                Remarks & Documentation
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white shadow-sm"
                    placeholder="e.g. Annual renewal completed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Invoice Document</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white shadow-sm"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  {fileName && (
                    <div className="mt-2 text-sm text-green-600 font-medium">
                      {fileName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 border rounded-xl font-semibold hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            form="add-email-renewal-form"
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Renewal Entry
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEmailRenewal;
