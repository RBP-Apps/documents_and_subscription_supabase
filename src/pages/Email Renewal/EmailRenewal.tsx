import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  ChevronDown,
  X,
  Check,
  MailWarning,
  Mail,
  MessageCircle,
  Share2,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import emailjs from 'emailjs-com';
import { sendWhatsAppMessage } from '../../utils/whatsappService';
import { toast } from 'react-hot-toast';
import supabase from '../../utils/supabase';
import useHeaderStore from '../../store/headerStore';
import AddEmailRenewal from './AddEmailRenewal';
import EditEmailRenewal from './EditEmailRenewal';

interface DetailRow {
  id: number;
  master_id: number;
  sub_serial_no: number;
  description: string;
  domain_name: string;
  start_date: string;
  end_date: string;
  quantity: number;
  total_amount: number;
}

interface MasterRecord {
  id: number;
  serial_no: string;
  invoice_no: string;
  invoice_date: string;
  service_provider: string;
  remarks: string;
  document_url: string;
  created_at: string;
  email_renewal_details: DetailRow[];
}

interface FlattenedRow {
  id: number; // detail id
  sub_serial_no: number;
  description: string;
  domain_name: string;
  start_date: string;
  end_date: string;
  quantity: number;
  total_amount: number;
  master: MasterRecord;
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

const EmailRenewal = () => {
  const { setTitle } = useHeaderStore();

  const [masters, setMasters] = useState<MasterRecord[]>([]);
  const [flatData, setFlatData] = useState<FlattenedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [filterDomain, setFilterDomain] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState<MasterRecord | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareType, setShareType] = useState<'email' | 'whatsapp' | 'both' | null>(null);
  const [selectedItem, setSelectedItem] = useState<FlattenedRow | null>(null);

  useEffect(() => {
    setTitle('Email Renewal');
    fetchEmailRenewals();
  }, []);

  const fetchEmailRenewals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_renewal_master')
        .select(`
          *,
          email_renewal_details (*)
        `)
        .order('id', { ascending: false });

      if (error) throw error;

      const masterRecords: MasterRecord[] = data || [];
      setMasters(masterRecords);

      // Flatten detail records for display in main table
      const flattened: FlattenedRow[] = [];
      masterRecords.forEach((master) => {
        if (master.email_renewal_details && master.email_renewal_details.length > 0) {
          // Sort details by sub_serial_no ascending
          const sortedDetails = [...master.email_renewal_details].sort(
            (a, b) => a.sub_serial_no - b.sub_serial_no
          );
          sortedDetails.forEach((detail) => {
            flattened.push({
              id: detail.id,
              sub_serial_no: detail.sub_serial_no,
              description: detail.description,
              domain_name: detail.domain_name,
              start_date: detail.start_date,
              end_date: detail.end_date,
              quantity: detail.quantity,
              total_amount: detail.total_amount,
              master: master,
            });
          });
        }
      });

      setFlatData(flattened);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load email renewal records');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMaster = async (masterId: number) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this renewal entry? This will delete all its service details.'
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('email_renewal_master')
        .delete()
        .eq('id', masterId);

      if (error) throw error;

      toast.success('Deleted Successfully');
      fetchEmailRenewals();
    } catch (error) {
      console.error(error);
      toast.error('Delete failed');
    }
  };

  const handleViewFile = (item: MasterRecord) => {
    const fileLink = item.document_url;
    if (fileLink) {
      window.open(fileLink, '_blank');
    } else {
      toast.error('No document available');
    }
  };

  const handleEdit = (master: MasterRecord) => {
    setSelectedMaster(master);
    setIsEditModalOpen(true);
  };

  const filteredData = flatData.filter((row) => {
    const matchesSearch =
      row.master.serial_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.master.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.master.service_provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.domain_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProvider = filterProvider
      ? row.master.service_provider === filterProvider
      : true;

    const matchesDomain = filterDomain ? row.domain_name === filterDomain : true;

    return matchesSearch && matchesProvider && matchesDomain;
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

  // Get distinct service providers
  const providers = Array.from(
    new Set(masters.map((m) => m.service_provider).filter(Boolean))
  ).sort();

  // Get distinct domains
  const domains = Array.from(
    new Set(flatData.map((d) => d.domain_name).filter(Boolean))
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
        {/* Header Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <MailWarning className="text-indigo-600 animate-pulse" size={24} />
                  Email & Expense Renewal Entry
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  Manage domain subscriptions, hostings, and SSL certificate renewals
                </p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm hover:shadow-md animate-fade-in"
              >
                <Plus size={18} />
                Add Renewal Entry
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 bg-gray-50 rounded-b-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search input */}
              <div className="relative w-full">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search by SR No, provider, domain, desc..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 py-2.5 w-full border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
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

              {/* Service Provider */}
              <SearchableDropdown
                value={filterProvider}
                onChange={setFilterProvider}
                placeholder="All Providers"
                searchPlaceholder="Search Provider..."
                options={providers}
              />

              {/* Domain Name */}
              <SearchableDropdown
                value={filterDomain}
                onChange={setFilterDomain}
                placeholder="All Domains"
                searchPlaceholder="Search Domain..."
                options={domains}
              />
            </div>

            {(searchTerm || filterProvider || filterDomain) && (
              <div className="flex justify-end pt-2 border-t border-gray-200/50">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterProvider('');
                    setFilterDomain('');
                  }}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-100"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs uppercase text-gray-600 font-semibold tracking-wider">
                  <th className="px-4 py-4 text-left">SR No</th>
                  <th className="px-4 py-4 text-center">Action</th>
                  <th className="px-4 py-4 text-center">Share</th>
                  <th className="px-4 py-4 text-center">Document</th>
                  <th className="px-4 py-4 text-left">Sub SR No</th>
                  <th className="px-4 py-4 text-left">Invoice No</th>
                  <th className="px-4 py-4 text-left">Invoice Date</th>
                  <th className="px-4 py-4 text-left">Service Provider</th>
                  <th className="px-4 py-4 text-left">Description of Services</th>
                  <th className="px-4 py-4 text-left">Domain Name</th>
                  <th className="px-4 py-4 text-left">Subscription Start</th>
                  <th className="px-4 py-4 text-left">Subscription End</th>
                  <th className="px-4 py-4 text-center">Qty</th>
                  <th className="px-4 py-4 text-right">Total Amount</th>
                  <th className="px-4 py-4 text-left">Remarks</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-indigo-50/30 transition">
                    <td className="px-4 py-4 whitespace-nowrap font-semibold text-indigo-600">
                      {row.master.serial_no}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => handleEdit(row.master)}
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition"
                          title="Edit Entire Entry"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteMaster(row.master.id)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"
                          title="Delete Entire Entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <ShareDropdown
                        item={row}
                        onShare={(type, record) => {
                          setShareType(type);
                          setSelectedItem(record);
                          setShareOpen(true);
                        }}
                      />
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      {row.master.document_url ? (
                        <button
                          onClick={() => handleViewFile(row.master)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition text-xs font-semibold"
                        >
                          <FileText size={12} />
                          View
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-500 font-medium">
                      {row.sub_serial_no}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-900 font-medium">
                      {row.master.invoice_no}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                      {formatDate(row.master.invoice_date)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-900 font-medium">
                      {row.master.service_provider}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {row.description}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-900 font-mono">
                      {row.domain_name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-500 text-xs">
                      {formatDate(row.start_date)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-500 text-xs">
                      {formatDate(row.end_date)}
                    </td>
                    <td className="px-4 py-4 text-center text-gray-900 font-medium">
                      {row.quantity}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-gray-900 whitespace-nowrap">
                      {formatAmount(row.total_amount)}
                    </td>
                    <td className="px-4 py-4 text-gray-500 max-w-xs truncate" title={row.master.remarks}>
                      {row.master.remarks || '-'}
                    </td>
                  </tr>
                ))}

                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={14} className="text-center py-16 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <MailWarning size={48} className="text-gray-300 animate-bounce" />
                        <p className="font-medium text-gray-600">No Email Renewal Entries Found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddEmailRenewal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchEmailRenewals}
      />

      <EditEmailRenewal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedMaster(null);
        }}
        onSuccess={fetchEmailRenewals}
        masterData={selectedMaster}
      />

      <ShareEmailRenewalModal
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

const ShareDropdown = ({
  item,
  onShare,
}: {
  item: FlattenedRow;
  onShare: (type: 'email' | 'whatsapp' | 'both', item: FlattenedRow) => void;
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

interface ShareEmailRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'email' | 'whatsapp' | 'both' | null;
  item: FlattenedRow | null;
}

const ShareEmailRenewalModal: React.FC<ShareEmailRenewalModalProps> = ({
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
      setSubject(`Sharing Email Renewal Invoice: ${item.master.service_provider} (${item.master.invoice_no})`);
      setMessage(`Please find the link for the shared Email Renewal document: ${item.master.service_provider} (${item.master.invoice_no}).`);
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

    const docName = `${item.master.service_provider} Email Renewal (${item.master.invoice_no})`;
    const docLink = item.master.document_url || 'N/A';

    try {
      await sendWhatsAppMessage({
        to,
        name: recipientName || 'there',
        documentName: docName,
        category: 'Email Renewal',
        company: item.master.service_provider,
        type: 'Invoice/Receipt',
        link: docLink,
      });

      // Log to Supabase
      const { error } = await supabase.from('Shared_Documents').insert([{
        name: recipientName,
        document_name: docName,
        document_type: 'Invoice/Receipt',
        category: 'Email Renewal',
        serial_no: item.master.serial_no,
        image: docLink !== 'N/A' ? docLink : null,
        share_method: 'WhatsApp',
        number: whatsapp,
        source_sheet: 'Email Renewal',
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

    const docName = `${item.master.service_provider} Email Renewal (${item.master.invoice_no})`;
    const docLink = item.master.document_url || '';

    try {
      await emailjs.send(
        'service_mkdtlae',
        'template_1912vpj',
        {
          recipient_name: recipientName,
          email: email,
          document_name: docName,
          category: 'Email Renewal',
          document_type: 'Invoice/Receipt',
          document_link: docLink,
          message: message,
          serial_no: item.master.serial_no,
          company: item.master.service_provider || '',
        },
        'JN3T3k1LsQ0KSOn-A'
      );

      // Log to Supabase
      const { error } = await supabase.from('Shared_Documents').insert([{
        name: recipientName,
        email: email,
        document_name: docName,
        document_type: 'Invoice/Receipt',
        category: 'Email Renewal',
        serial_no: item.master.serial_no,
        image: docLink || null,
        share_method: 'Email',
        source_sheet: 'Email Renewal',
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
              📄 {item.master.service_provider} Email Renewal ({item.master.invoice_no})
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

export default EmailRenewal;
