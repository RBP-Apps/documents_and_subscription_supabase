import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Award,
  Edit,
  Trash2,
  X,
  Mail,
  MessageCircle,
  Share2,
  MoreVertical,
  Loader2,
  Upload,
  Save,
  FileText,
} from 'lucide-react';
import emailjs from 'emailjs-com';
import { sendWhatsAppMessage } from '../../utils/whatsappService';
import { toast } from 'react-hot-toast';
import supabase from '../../utils/supabase';
import useHeaderStore from '../../store/headerStore';

interface PumpExperienceCertificate {
  id: number;
  serial_no: string;
  client_name: string;
  work_order_no: string;
  issue_date: string;
  work_name: string;
  pump_capacity: string;
  value: string;
  file_url?: string;
  created_at: string;
  company_name?: string;
  scheme?: string;
  department?: string;
}

const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const PumpExperience = () => {
  const { setTitle } = useHeaderStore();
  const [data, setData] = useState<PumpExperienceCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [fileSizes, setFileSizes] = useState<Record<number, string>>({});

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<PumpExperienceCertificate | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareType, setShareType] = useState<'email' | 'whatsapp' | 'both' | null>(null);
  const [selectedItem, setSelectedItem] = useState<PumpExperienceCertificate | null>(null);

  useEffect(() => {
    setTitle('Pump Experience Certificates');
    fetchCertificates();
  }, [setTitle]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const { data: dbData, error } = await supabase
        .from('pump_experience_certificates')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      setData(dbData || []);
    } catch (error: any) {
      console.warn('Supabase fetch failed, trying local storage fallback:', error.message);
      const local = localStorage.getItem('pump_experience_certificates');
      setData(local ? JSON.parse(local) : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data.length === 0) return;

    let active = true;

    const fetchSizes = async () => {
      const newSizes: Record<number, string> = { ...fileSizes };

      const promises = data.map(async (item) => {
        if (newSizes[item.id]) return;

        const url = item.file_url;
        if (!url) {
          newSizes[item.id] = '-';
          return;
        }

        try {
          const response = await fetch(url, { method: 'HEAD' });
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            newSizes[item.id] = formatBytes(parseInt(contentLength, 10));
          } else {
            newSizes[item.id] = '-';
          }
        } catch (e) {
          console.error(`Failed to fetch HEAD for ${url}:`, e);
          newSizes[item.id] = '-';
        }
      });

      await Promise.all(promises);

      if (active) {
        setFileSizes(newSizes);
      }
    };

    fetchSizes();

    return () => {
      active = false;
    };
  }, [data]);

  const saveToLocalStorage = (newData: PumpExperienceCertificate[]) => {
    localStorage.setItem('pump_experience_certificates', JSON.stringify(newData));
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this certificate?');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from('pump_experience_certificates').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted Successfully');
      fetchCertificates();
    } catch (error: any) {
      console.warn('Supabase delete failed, applying to local storage fallback:', error.message);
      const updated = data.filter((item) => item.id !== id);
      setData(updated);
      saveToLocalStorage(updated);
      toast.success('Deleted Successfully (Local)');
    }
  };

  const handleViewFile = (item: PumpExperienceCertificate) => {
    const fileLink = item.file_url;
    if (fileLink) {
      window.open(fileLink, '_blank');
    } else {
      toast.error('No uploaded document available');
    }
  };

  const handleEdit = (item: PumpExperienceCertificate) => {
    setSelectedCertificate(item);
    setIsEditModalOpen(true);
  };

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.work_order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.work_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pump_capacity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serial_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.scheme?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.department?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClient = filterClient ? item.client_name === filterClient : true;

    return matchesSearch && matchesClient;
  });

  const clients = Array.from(new Set(data.map((item) => item.client_name).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Award className="text-indigo-600" size={24} />
                  Pump Experience Certificates
                </h1>
                <p className="text-gray-500 text-xs mt-1">Manage all Pump Experience Certificate records</p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm hover:shadow-md"
              >
                <Plus size={18} />
                Add Certificate
              </button>
            </div>
          </div>

          {/* Search & Filter Section */}
          <div className="p-4 bg-gray-50 rounded-b-xl">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by serial no, client, work order no, work name, company, scheme, department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition min-w-[200px]"
              >
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
                <tr className="text-xs uppercase text-gray-600 font-semibold tracking-wider">
                  <th className="px-6 py-4">S.NO</th>
                  <th className="px-6 py-4 text-center">ACTION</th>
                  <th className="px-6 py-4 text-center">SHARE</th>
                  <th className="px-6 py-4 text-center">DOCUMENT</th>
                  <th className="px-6 py-4 text-center">FILE SIZE</th>
                  <th className="px-6 py-4">CLIENT NAME</th>
                  <th className="px-6 py-4">WORK ORDER NO</th>
                  <th className="px-6 py-4">ISSUE DATE</th>
                  <th className="px-6 py-4">WORK NAME</th>
                  <th className="px-6 py-4">PUMP CAPACITY</th>
                  <th className="px-6 py-4">VALUE (₹)</th>
                  <th className="px-6 py-4">COMPANY NAME</th>
                  <th className="px-6 py-4">SCHEME</th>
                  <th className="px-6 py-4">DEPARTMENT</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-indigo-50/30 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-indigo-600">{item.serial_no}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ShareDropdown
                        item={item}
                        onShare={(type, record) => {
                          setShareType(type);
                          setSelectedItem(record);
                          setShareOpen(true);
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.file_url ? (
                        <button
                          onClick={() => handleViewFile(item)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition text-sm font-medium"
                        >
                          <FileText size={14} />
                          View
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500 font-medium whitespace-nowrap">
                      {fileSizes[item.id] || '-'}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{item.client_name}</td>
                    <td className="px-6 py-4 text-gray-600">{item.work_order_no}</td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      {item.issue_date ? new Date(item.issue_date).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{item.work_name}</td>
                    <td className="px-6 py-4 text-gray-600">{item.pump_capacity}</td>
                    <td className="px-6 py-4 text-gray-600 font-semibold">
                      {item.value ? Number(item.value).toLocaleString('en-IN') : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{item.company_name || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{item.scheme || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{item.department || '-'}</td>
                  </tr>
                ))}

                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={14} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Award size={48} className="text-gray-300" />
                        <p>No Pump Experience Certificate Records Found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <AddCertificateModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={fetchCertificates}
          currentData={data}
          saveLocal={saveToLocalStorage}
        />
      )}

      {isEditModalOpen && selectedCertificate && (
        <EditCertificateModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedCertificate(null);
          }}
          onSuccess={fetchCertificates}
          certData={selectedCertificate}
          currentData={data}
          saveLocal={saveToLocalStorage}
        />
      )}

      <ShareCertificateModal
        isOpen={shareOpen}
        onClose={() => {
          setShareOpen(false);
          setShareType(null);
          setSelectedItem(null);
        }}
        type={shareType}
        item={selectedItem}
      />
    </>
  );
};

// Share Dropdown Helper
const ShareDropdown = ({
  item,
  onShare,
}: {
  item: PumpExperienceCertificate;
  onShare: (type: 'email' | 'whatsapp' | 'both', item: PumpExperienceCertificate) => void;
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <MoreVertical size={18} className="text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 w-48 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 origin-top-right">
          <button
            onClick={() => {
              onShare('whatsapp', item);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <MessageCircle size={16} className="text-green-600" />
            WhatsApp
          </button>
          <button
            onClick={() => {
              onShare('email', item);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Mail size={16} className="text-blue-600" />
            Email
          </button>
          <button
            onClick={() => {
              onShare('both', item);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Share2 size={16} className="text-purple-600" />
            Share Both
          </button>
        </div>
      )}
    </div>
  );
};

// Add Modal Component
interface AddCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentData: PumpExperienceCertificate[];
  saveLocal: (data: PumpExperienceCertificate[]) => void;
}

const AddCertificateModal: React.FC<AddCertificateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentData,
  saveLocal,
}) => {
  const [clientName, setClientName] = useState('');
  const [workOrderNo, setWorkOrderNo] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [workName, setWorkName] = useState('');
  const [pumpCapacity, setPumpCapacity] = useState('');
  const [value, setValue] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [scheme, setScheme] = useState('');
  const [department, setDepartment] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !workOrderNo || !issueDate || !workName || !pumpCapacity || !value) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    let fileUrl = '';

    try {
      if (file) {
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `experience_certificates/pump/${Date.now()}_${cleanFileName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('insurance')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('insurance').getPublicUrl(uploadData.path);
        fileUrl = publicUrl;
      }

      // Try inserting into Supabase
      const { data: inserted, error: insertError } = await supabase
        .from('pump_experience_certificates')
        .insert([
          {
            client_name: clientName,
            work_order_no: workOrderNo,
            issue_date: issueDate,
            work_name: workName,
            pump_capacity: pumpCapacity,
            value: value ? Number(value) : 0,
            file_url: fileUrl || undefined,
            company_name: companyName || undefined,
            scheme: scheme || undefined,
            department: department || undefined,
          },
        ])
        .select('id')
        .single();

      if (insertError) throw insertError;

      const serialNo = `EXP-PMP-${inserted.id}`;
      await supabase.from('pump_experience_certificates').update({ serial_no: serialNo }).eq('id', inserted.id);

      toast.success('Experience Certificate added successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.warn('Supabase insert failed, using local storage:', error.message);
      // Local storage fallback
      const newId = Date.now();
      const newCert: PumpExperienceCertificate = {
        id: newId,
        serial_no: `EXP-PMP-${newId.toString().slice(-4)}`,
        client_name: clientName,
        work_order_no: workOrderNo,
        issue_date: issueDate,
        work_name: workName,
        pump_capacity: pumpCapacity,
        value: value,
        file_url: fileUrl || undefined,
        company_name: companyName || undefined,
        scheme: scheme || undefined,
        department: department || undefined,
        created_at: new Date().toISOString(),
      };

      const updated = [newCert, ...currentData];
      saveLocal(updated);
      toast.success('Experience Certificate added successfully (Local)');
      onSuccess();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-4 w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-800">Add Pump Experience Certificate</h2>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Client Name *</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. PHED Jaipur"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Work Order No *</label>
              <input
                type="text"
                required
                value={workOrderNo}
                onChange={(e) => setWorkOrderNo(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. EE/PHED/2026/456"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Issue Date *</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Work Name *</label>
              <input
                type="text"
                required
                value={workName}
                onChange={(e) => setWorkName(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Water Supply Scheme under JJM"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Pump Capacity *</label>
              <input
                type="text"
                required
                value={pumpCapacity}
                onChange={(e) => setPumpCapacity(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Submersible 12.5 HP"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Value (₹) *</label>
              <input
                type="number"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. 1500000"
              />
            </div>

            {/* Newly Requested Fields */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. RBP Projects"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Scheme</label>
              <input
                type="text"
                value={scheme}
                onChange={(e) => setScheme(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Har Ghar Jal Scheme"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Water Resources Department"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Upload Certificate PDF</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="cert-add-file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="cert-add-file"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:border-indigo-500 hover:text-indigo-600 bg-white rounded-lg cursor-pointer text-xs font-semibold shadow-sm transition"
                >
                  <Upload size={14} />
                  Choose File
                </label>
                <span className="text-xs text-gray-500 truncate max-w-xs">{fileName || 'No file chosen'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 border rounded-xl font-semibold hover:bg-gray-100 transition text-sm text-gray-700 bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition text-sm"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Certificate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Modal Component
interface EditCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  certData: PumpExperienceCertificate;
  currentData: PumpExperienceCertificate[];
  saveLocal: (data: PumpExperienceCertificate[]) => void;
}

const EditCertificateModal: React.FC<EditCertificateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  certData,
  currentData,
  saveLocal,
}) => {
  const [clientName, setClientName] = useState(certData.client_name);
  const [workOrderNo, setWorkOrderNo] = useState(certData.work_order_no);
  const [issueDate, setIssueDate] = useState(certData.issue_date);
  const [workName, setWorkName] = useState(certData.work_name);
  const [pumpCapacity, setPumpCapacity] = useState(certData.pump_capacity);
  const [value, setValue] = useState(certData.value);

  // Newly Requested Fields
  const [companyName, setCompanyName] = useState(certData.company_name || '');
  const [scheme, setScheme] = useState(certData.scheme || '');
  const [department, setDepartment] = useState(certData.department || '');

  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState(certData.file_url ? 'Existing File' : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let fileUrl = certData.file_url || '';

    try {
      if (file) {
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `experience_certificates/pump/${Date.now()}_${cleanFileName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('insurance')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('insurance').getPublicUrl(uploadData.path);
        fileUrl = publicUrl;
      }

      // Try updating in Supabase
      const { error: updateError } = await supabase
        .from('pump_experience_certificates')
        .update({
          client_name: clientName,
          work_order_no: workOrderNo,
          issue_date: issueDate,
          work_name: workName,
          pump_capacity: pumpCapacity,
          value: value ? Number(value) : 0,
          file_url: fileUrl || undefined,
          company_name: companyName || undefined,
          scheme: scheme || undefined,
          department: department || undefined,
        })
        .eq('id', certData.id);

      if (updateError) throw updateError;

      toast.success('Experience Certificate updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.warn('Supabase update failed, using local storage:', error.message);
      // Local storage fallback
      const updated = currentData.map((item) =>
        item.id === certData.id
          ? {
              ...item,
              client_name: clientName,
              work_order_no: workOrderNo,
              issue_date: issueDate,
              work_name: workName,
              pump_capacity: pumpCapacity,
              value: value,
              file_url: fileUrl || undefined,
              company_name: companyName || undefined,
              scheme: scheme || undefined,
              department: department || undefined,
            }
          : item
      );

      saveLocal(updated);
      toast.success('Experience Certificate updated successfully (Local)');
      onSuccess();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-4 w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-800">Edit Pump Experience Certificate</h2>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Client Name *</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Work Order No *</label>
              <input
                type="text"
                required
                value={workOrderNo}
                onChange={(e) => setWorkOrderNo(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Issue Date *</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Work Name *</label>
              <input
                type="text"
                required
                value={workName}
                onChange={(e) => setWorkName(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Pump Capacity *</label>
              <input
                type="text"
                required
                value={pumpCapacity}
                onChange={(e) => setPumpCapacity(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Value (₹) *</label>
              <input
                type="number"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Newly Requested Fields */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. RBP Projects"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Scheme</label>
              <input
                type="text"
                value={scheme}
                onChange={(e) => setScheme(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Har Ghar Jal Scheme"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Water Resources Department"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Upload Certificate PDF</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="cert-edit-file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="cert-edit-file"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:border-indigo-500 hover:text-indigo-600 bg-white rounded-lg cursor-pointer text-xs font-semibold shadow-sm transition"
                >
                  <Upload size={14} />
                  Choose File
                </label>
                <span className="text-xs text-gray-500 truncate max-w-xs">{fileName || 'No file chosen'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 border rounded-xl font-semibold hover:bg-gray-100 transition text-sm text-gray-700 bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition text-sm"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Update Certificate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Share Modal Component
interface ShareCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'email' | 'whatsapp' | 'both' | null;
  item: PumpExperienceCertificate | null;
}

const ShareCertificateModal: React.FC<ShareCertificateModalProps> = ({
  isOpen,
  onClose,
  type,
  item,
}) => {
  const [recipientName, setRecipientName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setRecipientName('');
      setEmail('');
      setWhatsapp('');
      setSubject(`Sharing Pump Experience Certificate: ${item.client_name}`);
      setMessage(`Please find the link for the shared Pump Experience Certificate: ${item.work_name} (${item.pump_capacity}).`);
      setEmailSent(false);
      setIsSending(false);
    }
  }, [isOpen, item]);

  if (!isOpen || !type || !item) return null;

  const handleShareWhatsApp = async (): Promise<boolean> => {
    if (!whatsapp.trim()) {
      toast.error('Please enter WhatsApp number');
      return false;
    }

    const rawDigits = whatsapp.replace(/\D/g, '');
    const to = rawDigits.startsWith('91') && rawDigits.length === 12 ? rawDigits : `91${rawDigits}`;
    const docName = `Pump Experience Certificate (${item.client_name})`;
    const docLink = item.file_url || 'N/A';

    try {
      await sendWhatsAppMessage({
        to,
        name: recipientName || 'there',
        documentName: docName,
        category: 'Experience Certificates',
        company: item.client_name,
        type: 'Pump Experience Certificate',
        link: docLink,
      });

      // Log to Supabase Shared_Documents
      const { error } = await supabase.from('Shared_Documents').insert([
        {
          name: recipientName,
          document_name: docName,
          document_type: 'Pump Experience Certificate',
          category: 'Experience Certificates',
          serial_no: item.serial_no,
          image: docLink !== 'N/A' ? docLink : null,
          share_method: 'WhatsApp',
          number: whatsapp,
          source_sheet: 'Pump Experience Certificates',
        },
      ]);
      if (error) console.error('Error logging WhatsApp share:', error);

      toast.success('WhatsApp message sent successfully ✅');
      return true;
    } catch (error: any) {
      console.error(error);
      toast.error(`WhatsApp failed: ${error?.message || 'Unknown error'} ❌`);
      return false;
    }
  };

  const handleSendEmail = async (): Promise<boolean> => {
    if (!email.trim()) {
      toast.error('Please enter email');
      return false;
    }

    const docName = `Pump Experience Certificate (${item.client_name})`;
    const docLink = item.file_url || '';

    try {
      await emailjs.send(
        'service_mkdtlae',
        'template_1912vpj',
        {
          recipient_name: recipientName,
          email: email,
          document_name: docName,
          category: 'Experience Certificates',
          document_type: 'Pump Experience Certificate',
          document_link: docLink,
          message: message,
          serial_no: item.serial_no,
          company: item.client_name || '',
        },
        'JN3T3k1LsQ0KSOn-A'
      );

      // Log to Supabase Shared_Documents
      const { error } = await supabase.from('Shared_Documents').insert([
        {
          name: recipientName,
          email: email,
          document_name: docName,
          document_type: 'Pump Experience Certificate',
          category: 'Experience Certificates',
          serial_no: item.serial_no,
          image: docLink || null,
          share_method: 'Email',
          source_sheet: 'Pump Experience Certificates',
        },
      ]);
      if (error) console.error('Error logging email share:', error);

      toast.success('Email sent successfully ✅');
      setEmailSent(true);
      return true;
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to send email ❌');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    let emailSuccess = false;
    let whatsappOpened = false;

    if (type === 'email' || type === 'both') {
      emailSuccess = await handleSendEmail();
      if (!emailSuccess && type === 'email') {
        setIsSending(false);
        return;
      }
    }

    if (type === 'whatsapp' || type === 'both') {
      whatsappOpened = await handleShareWhatsApp();
      if (!whatsappOpened && type === 'whatsapp') {
        setIsSending(false);
        return;
      }
    }

    setIsSending(false);
    if (
      (type === 'email' && emailSuccess) ||
      (type === 'whatsapp' && whatsappOpened) ||
      (type === 'both' && (emailSuccess || whatsappOpened))
    ) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  const isEmail = type === 'email' || type === 'both';
  const isWhatsapp = type === 'whatsapp' || type === 'both';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-800">
              {type === 'email' ? 'Share via Email' : type === 'whatsapp' ? 'Share via WhatsApp' : 'Share Options'}
            </h2>
          </div>
          <button onClick={onClose} disabled={isSending} className="p-1 hover:bg-gray-100 rounded-full transition text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Document</label>
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700 font-medium truncate">
              📄 Certificate: {item.client_name} ({item.pump_capacity})
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient Name</label>
            <input
              type="text"
              required
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-700"
              placeholder="Enter recipient name"
              disabled={isSending || emailSent}
            />
          </div>

          {isEmail && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                required={isEmail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700"
                placeholder="john@example.com"
                disabled={isSending || emailSent}
              />
            </div>
          )}

          {isWhatsapp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Number</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 bg-gray-50 rounded-l-lg text-gray-500 text-sm">+91</span>
                <input
                  type="tel"
                  required={isWhatsapp}
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="flex-1 w-full px-3 py-2 border border-gray-200 rounded-r-lg focus:ring-2 focus:ring-green-500 outline-none text-sm text-gray-700"
                  placeholder="98765 43210"
                  disabled={isSending}
                />
              </div>
            </div>
          )}

          {isEmail && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                <input
                  type="text"
                  required={isEmail}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm text-gray-700"
                  disabled={isSending || emailSent}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none text-sm text-gray-700"
                  disabled={isSending || emailSent}
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || (isEmail && emailSent)}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition"
            >
              {isSending ? 'Sending...' : emailSent ? 'Sent!' : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PumpExperience;
