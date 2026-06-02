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
} from 'lucide-react';
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
                  <th className="px-4 py-4 text-center">Document</th>
                  <th className="px-4 py-4 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-indigo-50/30 transition">
                    <td className="px-4 py-4 whitespace-nowrap font-semibold text-indigo-600">
                      {row.master.serial_no}
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
    </>
  );
};

export default EmailRenewal;
