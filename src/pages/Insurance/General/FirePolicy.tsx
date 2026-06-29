import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Shield,
  Edit,
  Trash2,
  FileText,
  ChevronDown,
  X,
  Check,
  Loader2,
  Save,
  Mail,
  MessageCircle,
  Share2,
  MoreVertical,


} from 'lucide-react';


import { toast } from 'react-hot-toast';
import supabase from '../../../utils/supabase';
import useHeaderStore from '../../../store/headerStore';
import emailjs from 'emailjs-com';
import { sendWhatsAppMessage } from '../../../utils/whatsappService';

interface FirePolicy {
  id: number;
  serial_no: string;
  company_name: string;
  policy_holder_company_name: string;
  policy_no: string;
  policy_name: string;
  start_date: string;
  end_date: string;
  final_premium_amt: number;
  sum_to_be_insured: number;
  agent_name: string;
  contact_no: string;
  document_url: string;
  created_at: string;
}

interface SearchableDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = 'Search...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2.5 text-left border border-gray-300 rounded-lg bg-white shadow-sm flex justify-between items-center text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        >
          <span className="truncate">{value || placeholder}</span>
          <span className="flex items-center gap-1.5 ml-2 shrink-0">
            {value && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex items-center justify-center"
                title="Clear"
              >
                <X size={14} />
              </span>
            )}
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 flex flex-col overflow-hidden animate-fade-in-down">
          <div className="p-2 border-b border-gray-100 bg-white flex items-center gap-2">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full text-sm outline-none border-none p-1 bg-transparent text-gray-700"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors shrink-0 flex items-center justify-center"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50/50 flex items-center justify-between transition-colors ${
                !value ? 'text-indigo-600 font-semibold bg-indigo-50/30' : 'text-gray-700'
              }`}
            >
              <span>{placeholder}</span>
              {!value && <Check size={14} className="text-indigo-600 shrink-0" />}
            </button>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50/50 flex items-center justify-between transition-colors ${
                    value === option ? 'text-indigo-600 font-semibold bg-indigo-50/30' : 'text-gray-700'
                  }`}
                >
                  <span className="truncate">{option}</span>
                  {value === option && <Check size={14} className="text-indigo-600 shrink-0" />}
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-gray-400">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FirePolicyPage = () => {
  const { setTitle } = useHeaderStore();

  const [data, setData] = useState<FirePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileSizes, setFileSizes] = useState<Record<number, string>>({});

  const formatBytes = (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  useEffect(() => {
    if (data.length === 0) return;

    let active = true;

    const fetchSizes = async () => {
      const bucketSizes: Record<string, number> = {};
      
      // Step 1: List files in general/fire_policy folder under insurance bucket
      try {
        const { data: files, error } = await supabase.storage
          .from("insurance")
          .list("general/fire_policy", { limit: 1000 });
        if (!error && files) {
          files.forEach((file) => {
            if (file.name && file.metadata?.size) {
              bucketSizes[`general/fire_policy/${file.name}`] = file.metadata.size;
            }
          });
        }
      } catch (e) {
        console.error("Failed to list storage bucket for general/fire_policy folder:", e);
      }

      if (!active) return;

      const newSizes: Record<number, string> = {};

      const promises = data.map(async (item) => {
        const url = item.document_url;
        if (!url) {
          newSizes[item.id] = "-";
          return;
        }

        // 1. Check if it's base64 data URL
        if (url.startsWith("data:")) {
          const base64Data = url.split(",")[1];
          if (base64Data) {
            const size = Math.round((base64Data.length * 3) / 4);
            newSizes[item.id] = formatBytes(size);
          } else {
            newSizes[item.id] = "-";
          }
          return;
        }

        // 2. Try extracting filename if it's stored in insurance bucket
        let size: number | null = null;
        if (url.includes("/storage/v1/object/public/insurance/general/fire_policy/")) {
          const parts = url.split("/storage/v1/object/public/insurance/general/fire_policy/");
          const fileName = parts[parts.length - 1];
          const fullPath = `general/fire_policy/${fileName}`;
          if (bucketSizes[fullPath] !== undefined) {
            size = bucketSizes[fullPath];
          }
        }

        // 3. Fallback to HTTP HEAD request if not in list or for external URLs
        if (size === null) {
          try {
            const response = await fetch(url, { method: "HEAD" });
            const contentLength = response.headers.get("content-length");
            if (contentLength) {
              size = parseInt(contentLength, 10);
            }
          } catch (e) {
            console.error(`Failed to fetch HEAD for ${url}:`, e);
          }
        }

        if (size !== null) {
          newSizes[item.id] = formatBytes(size);
        } else {
          newSizes[item.id] = "-";
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

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterHolderCompany, setFilterHolderCompany] = useState('');

  const [shareOpen, setShareOpen] = useState(false);
  const [shareType, setShareType] = useState<'email' | 'whatsapp' | 'both' | null>(null);
  const [selectedItem, setSelectedItem] = useState<FirePolicy | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FirePolicy | null>(null);

  useEffect(() => {
    setTitle('Fire Policy');
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fire_policy')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      setData(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load Fire Policy records');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this record?'
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('fire_policy')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Deleted Successfully');
      fetchRecords();
    } catch (error) {
      console.error(error);
      toast.error('Delete failed');
    }
  };

  const handleViewFile = (item: FirePolicy) => {
    const fileLink = item.document_url;
    if (fileLink) {
      window.open(fileLink, '_blank');
    } else {
      toast.error('No document available');
    }
  };

  const handleEdit = (item: FirePolicy) => {
    setSelectedRecord(item);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedRecord(null);
    setIsModalOpen(true);
  };

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.policy_holder_company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.policy_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.policy_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.agent_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCompany = filterCompany ? item.company_name === filterCompany : true;
    const matchesHolderCompany = filterHolderCompany ? item.policy_holder_company_name === filterHolderCompany : true;

    return matchesSearch && matchesCompany && matchesHolderCompany;
  });

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN');
  };

  const formatAmount = (amount: number) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const companies = Array.from(
    new Set(data.map((item) => item.company_name).filter(Boolean))
  ).sort();

  const holderCompanies = Array.from(
    new Set(data.map((item) => item.policy_holder_company_name).filter(Boolean))
  ).sort();

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
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="text-indigo-600" size={24} />
                  Fire Policy
                </h1>
                <p className="text-gray-500 text-xs mt-1">
                  Manage fire policy insurance records
                </p>
              </div>

              <button
                onClick={handleAdd}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm hover:shadow-md"
              >
                <Plus size={18} />
                Add New Record
              </button>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="p-4 bg-gray-50 rounded-b-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative w-full">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search by company, holder, policy no/name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 py-2.5 w-full border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-700"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center"
                    title="Clear Search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Company Name */}
              <SearchableDropdown
                value={filterCompany}
                onChange={setFilterCompany}
                placeholder="All Companies"
                searchPlaceholder="Search Company..."
                options={companies}
              />

              {/* Policy Holder Company */}
              <SearchableDropdown
                value={filterHolderCompany}
                onChange={setFilterHolderCompany}
                placeholder="All Policy Holders"
                searchPlaceholder="Search Policy Holder..."
                options={holderCompanies}
              />
            </div>

            {(searchTerm || filterCompany || filterHolderCompany) && (
              <div className="flex justify-end pt-2 border-t border-gray-200/50">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterCompany('');
                    setFilterHolderCompany('');
                  }}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-100"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs uppercase text-gray-600 font-semibold tracking-wider">
                  <th className="px-6 py-4 text-left">S.NO</th>
                  <th className="px-6 py-4 text-center">ACTION</th>
                  <th className="px-6 py-4 text-center">SHARE</th>
                  <th className="px-6 py-4 text-center">DOCUMENT</th>
                  <th className="px-6 py-4 text-center">File Size</th>
                  <th className="px-6 py-4 text-left">COMPANY NAME</th>
                  <th className="px-6 py-4 text-left">POLICY HOLDER COMPANY</th>
                  <th className="px-6 py-4 text-left">POLICY NO.</th>
                  <th className="px-6 py-4 text-left">POLICY NAME</th>
                  <th className="px-6 py-4 text-left">PERIOD OF INSURANCE</th>
                  <th className="px-6 py-4 text-right">FINAL PREMIUM AMT</th>
                  <th className="px-6 py-4 text-right">SUM TO BE INSURED</th>
                  <th className="px-6 py-4 text-left">AGENT NAME</th>
                  <th className="px-6 py-4 text-left">CONTACT NO.</th>
                  
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-indigo-50/30 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-indigo-600 text-sm">
                        {item.serial_no || `FP-${String(item.id).padStart(3, '0')}`}
                      </span>
                    </td>
                   
                    <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                      {item.document_url ? (
                        <button
                          onClick={() => handleViewFile(item)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition text-sm font-medium"
                        >
                          <FileText size={14} />
                          View
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-700 text-xs font-medium whitespace-nowrap">
                      {item.document_url ? (fileSizes[item.id] || "Loading...") : "-"}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap text-sm">
                      {item.company_name}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap text-sm">
                      {item.policy_holder_company_name}
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap font-mono text-sm">
                      {item.policy_no}
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap text-sm">
                      {item.policy_name}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(item.start_date)}
                      <br />
                      to
                      <br />
                      {formatDate(item.end_date)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900 whitespace-nowrap text-sm">
                      {formatAmount(item.final_premium_amt)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 whitespace-nowrap text-sm">
                      {formatAmount(item.sum_to_be_insured)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap text-sm">
                      {item.agent_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap text-sm">
                      {item.contact_no || '-'}
                    </td>
                   
                  </tr>
                ))}

                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={14} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Shield size={48} className="text-gray-300" />
                        <p>No Fire Policy Records Found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FirePolicyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRecord(null);
        }}
        onSuccess={fetchRecords}
        selectedRecord={selectedRecord}
      />

      <ShareFirePolicyModal
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

interface FirePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedRecord: FirePolicy | null;
}



const ShareDropdown = ({
  item,
  onShare,
}: {
  item: FirePolicy;
  onShare: (type: 'email' | 'whatsapp' | 'both', item: FirePolicy) => void;
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
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
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

interface ShareFirePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'email' | 'whatsapp' | 'both' | null;
  item: FirePolicy | null;
}

const ShareFirePolicyModal: React.FC<ShareFirePolicyModalProps> = ({
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
      setSubject(`Sharing Fire Policy: ${item.policy_name}`);
      setMessage(`Please find the link for the shared Fire Policy document: ${item.policy_name}.`);
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
    const to = rawDigits.startsWith('91') && rawDigits.length === 12
      ? rawDigits
      : `91${rawDigits}`;

    try {
      await sendWhatsAppMessage({
        to,
        name: recipientName || 'there',
        documentName: item.policy_name,
        category: 'Insurance',
        company: item.company_name,
        type: 'Fire Policy',
        link: item.document_url || 'N/A',
      });

      // Log to Supabase
      const { error } = await supabase.from('Shared_Documents').insert([{
        name: recipientName,
        document_name: item.policy_name,
        document_type: 'Fire Policy',
        category: 'Insurance',
        serial_no: item.serial_no,
        image: item.document_url,
        share_method: 'WhatsApp',
        number: whatsapp,
        source_sheet: 'Fire Policy',
      }]);

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

    try {
      await emailjs.send(
        'service_mkdtlae',
        'template_1912vpj',
        {
          recipient_name: recipientName,
          email: email,
          document_name: item.policy_name,
          category: 'Insurance',
          document_type: 'Fire Policy',
          document_link: item.document_url || '',
          message: message,
          serial_no: item.serial_no || '',
          company: item.company_name || '',
        },
        'JN3T3k1LsQ0KSOn-A'
      );

      // Log to Supabase
      const { error } = await supabase.from('Shared_Documents').insert([{
        name: recipientName,
        email: email,
        document_name: item.policy_name,
        document_type: 'Fire Policy',
        category: 'Insurance',
        serial_no: item.serial_no,
        image: item.document_url,
        share_method: 'Email',
        source_sheet: 'Fire Policy',
      }]);

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

    if ((type === 'email' && emailSuccess) || (type === 'whatsapp' && whatsappOpened) || (type === 'both' && (emailSuccess || whatsappOpened))) {
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
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            {type === 'email' && <Mail className="text-blue-600" size={20} />}
            {type === 'whatsapp' && <MessageCircle className="text-green-600" size={20} />}
            {type === 'both' && <Share2 className="text-purple-600" size={20} />}
            <h2 className="text-lg font-semibold text-gray-800">
              {type === 'email' ? 'Share via Email' : type === 'whatsapp' ? 'Share via WhatsApp' : 'Share Options'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Document selection preview */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Document
            </label>
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700 font-medium truncate">
              📄 {item.policy_name} ({item.serial_no})
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Recipient Name
            </label>
            <input
              type="text"
              required
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm text-gray-700"
              placeholder="Enter recipient name"
              disabled={isSending || emailSent}
            />
          </div>

          {isEmail && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required={isEmail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-gray-700"
                placeholder="john@example.com"
                disabled={isSending || emailSent}
              />
            </div>
          )}

          {isWhatsapp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                WhatsApp Number
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 bg-gray-50 rounded-l-lg text-gray-500 text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  required={isWhatsapp}
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="flex-1 w-full px-3 py-2 border border-gray-200 rounded-r-lg focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm text-gray-700"
                  placeholder="98765 43210"
                  disabled={isSending}
                />
              </div>
            </div>
          )}

          {isEmail && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  required={isEmail}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm text-gray-700"
                  placeholder="Enter email subject"
                  disabled={isSending || emailSent}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Message
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none text-sm text-gray-700"
                  placeholder="Add a message..."
                  disabled={isSending || emailSent}
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || (isEmail && emailSent)}
              className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 text-sm
                ${type === 'email' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : ''}
                ${type === 'whatsapp' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : ''}
                ${type === 'both' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : ''}
                ${emailSent ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : ''}
              `}
            >
              {isSending ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Sending...
                </>
              ) : emailSent ? (
                'Sent!'
              ) : (
                <>
                  {type === 'email' && <Mail size={18} />}
                  {type === 'whatsapp' && <MessageCircle size={18} />}
                  {type === 'both' && <Share2 size={18} />}
                  Share
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FirePolicyModal: React.FC<FirePolicyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedRecord,
}) => {
  const [formData, setFormData] = useState({
    company_name: '',
    policy_holder_company_name: '',
    policy_no: '',
    policy_name: '',
    start_date: '',
    end_date: '',
    final_premium_amt: '',
    sum_to_be_insured: '',
    agent_name: '',
    contact_no: '',
  });

  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedRecord) {
      setFormData({
        company_name: selectedRecord.company_name || '',
        policy_holder_company_name: selectedRecord.policy_holder_company_name || '',
        policy_no: selectedRecord.policy_no || '',
        policy_name: selectedRecord.policy_name || '',
        start_date: selectedRecord.start_date || '',
        end_date: selectedRecord.end_date || '',
        final_premium_amt: selectedRecord.final_premium_amt ? selectedRecord.final_premium_amt.toString() : '',
        sum_to_be_insured: selectedRecord.sum_to_be_insured ? selectedRecord.sum_to_be_insured.toString() : '',
        agent_name: selectedRecord.agent_name || '',
        contact_no: selectedRecord.contact_no || '',
      });
      setFileName('');
      setFileUpload(null);
    } else {
      setFormData({
        company_name: '',
        policy_holder_company_name: '',
        policy_no: '',
        policy_name: '',
        start_date: '',
        end_date: '',
        final_premium_amt: '',
        sum_to_be_insured: '',
        agent_name: '',
        contact_no: '',
      });
      setFileName('');
      setFileUpload(null);
    }
  }, [selectedRecord, isOpen]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      let documentUrl = selectedRecord?.document_url || '';

      // Upload File if selected
      if (fileUpload) {
        const cleanFileName = fileUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `general/fire_policy/${Date.now()}_${cleanFileName}`;

        const { data, error } = await supabase.storage
          .from('insurance')
          .upload(filePath, fileUpload, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from('insurance').getPublicUrl(data.path);

        documentUrl = publicUrl;
      }

      if (selectedRecord) {
        // Edit Mode
        const { error: updateError } = await supabase
          .from('fire_policy')
          .update({
            company_name: formData.company_name,
            policy_holder_company_name: formData.policy_holder_company_name,
            policy_no: formData.policy_no,
            policy_name: formData.policy_name,
            start_date: formData.start_date,
            end_date: formData.end_date,
            final_premium_amt: Number(formData.final_premium_amt),
            sum_to_be_insured: Number(formData.sum_to_be_insured),
            agent_name: formData.agent_name || null,
            contact_no: formData.contact_no || null,
            document_url: documentUrl || null,
          })
          .eq('id', selectedRecord.id);

        if (updateError) throw updateError;
        toast.success('Record Updated Successfully');
      } else {
        // Add Mode
        const { data: inserted, error: insertError } = await supabase
          .from('fire_policy')
          .insert([
            {
              company_name: formData.company_name,
              policy_holder_company_name: formData.policy_holder_company_name,
              policy_no: formData.policy_no,
              policy_name: formData.policy_name,
              start_date: formData.start_date,
              end_date: formData.end_date,
              final_premium_amt: Number(formData.final_premium_amt),
              sum_to_be_insured: Number(formData.sum_to_be_insured),
              agent_name: formData.agent_name || null,
              contact_no: formData.contact_no || null,
              document_url: documentUrl || null,
            },
          ])
          .select('id')
          .single();

        if (insertError) throw insertError;

        const serialNo = `FP-${String(inserted.id).padStart(3, '0')}`;

        await supabase
          .from('fire_policy')
          .update({
            serial_no: serialNo,
          })
          .eq('id', inserted.id);

        toast.success(`Record Added (${serialNo})`);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg animate-pulse">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {selectedRecord ? 'Edit Fire Policy' : 'Add Fire Policy'}
              </h2>
              <p className="text-xs text-gray-500">
                {selectedRecord ? `Edit details for ${selectedRecord.serial_no}` : 'Fill insurance details'}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 rounded-full hover:bg-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <form id="fire-policy-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Policy Info */}
            <div>
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700">Policy Information</h3>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm text-gray-700"
                    placeholder="e.g. TATA AIG"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Policy Holder Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.policy_holder_company_name}
                    onChange={(e) => setFormData({ ...formData, policy_holder_company_name: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm text-gray-700"
                    placeholder="e.g. ABC Corp Pvt Ltd"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Policy No. *</label>
                  <input
                    type="text"
                    required
                    value={formData.policy_no}
                    onChange={(e) => setFormData({ ...formData, policy_no: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm text-gray-700"
                    placeholder="e.g. FPP12345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Policy Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.policy_name}
                    onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm text-gray-700"
                    placeholder="e.g. Standard Fire and Special Perils Policy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Final Premium Amt. *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.final_premium_amt}
                    onChange={(e) => setFormData({ ...formData, final_premium_amt: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm text-gray-700"
                    placeholder="e.g. 25000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Sum To Be Insured *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.sum_to_be_insured}
                    onChange={(e) => setFormData({ ...formData, sum_to_be_insured: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm text-gray-700"
                    placeholder="e.g. 5000000"
                  />
                </div>
              </div>
            </div>

            {/* Dates & Agent Info */}
            <div>
              <h3 className="text-sm font-semibold uppercase border-b pb-2 text-gray-700">Dates & Agent Details</h3>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={formData.agent_name}
                    onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm text-gray-700"
                    placeholder="Agent name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Contact No.</label>
                  <input
                    type="text"
                    value={formData.contact_no}
                    onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm text-gray-700"
                    placeholder="Contact number"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Upload Document</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm text-gray-700"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  {fileName && (
                    <div className="mt-2 text-sm text-green-600 font-medium">
                      {fileName}
                    </div>
                  )}
                  {selectedRecord?.document_url && !fileName && (
                    <div className="mt-1 text-xs text-gray-500">
                      Current file:{' '}
                      <a
                        href={selectedRecord.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        View File
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 border rounded-xl font-semibold hover:bg-gray-100 transition-colors text-sm text-gray-700 bg-white"
          >
            Cancel
          </button>
          <button
            form="fire-policy-form"
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Record
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FirePolicyPage;