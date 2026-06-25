// Vehicle.tsx (Updated)
import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Car,
  Edit,
  Trash2,
  FileText,
  X,
  Mail,
  MessageCircle,
  Share2,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import emailjs from 'emailjs-com';
import { sendWhatsAppMessage } from '../../../utils/whatsappService';
import { toast } from 'react-hot-toast';
import supabase from '../../../utils/supabase';
import useHeaderStore from '../../../store/headerStore';
import AddVehicleInsurance from './AddVehicleInsurance';
import EditVehicleInsurance from './EditVehicleInsurance';

interface VehicleInsurance {
  id: number;
  serial_no: string;
  company_name: string;
  registration_no: string;
  make: string;
  model: string;
  insurance_agent: string;
  period_from: string;
  period_to: string;
  premium_paid: number;
  add_on: string;
  policy_link: string;
  file_url?: string;
  created_at: string;
  need_renewal?: boolean;
  renewal_date?: string;
  concern_person_name?: string;
  concern_person_mobile?: string;
  concern_person_department?: string;
}

const Vehicle = () => {
  const { setTitle } = useHeaderStore();

  const [data, setData] = useState<VehicleInsurance[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState<VehicleInsurance | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareType, setShareType] = useState<'email' | 'whatsapp' | 'both' | null>(null);
  const [selectedItem, setSelectedItem] = useState<VehicleInsurance | null>(null);

  useEffect(() => {
    setTitle('Vehicle Insurance');
    fetchVehicleInsurance();
  }, []);

  const fetchVehicleInsurance = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('vehicle_insurance')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      setData(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load vehicle insurance');
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
        .from('vehicle_insurance')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Deleted Successfully');
      fetchVehicleInsurance();
    } catch (error) {
      console.error(error);
      toast.error('Delete failed');
    }
  };

  const handleViewFile = (item: VehicleInsurance) => {
    const fileLink = item.file_url || item.policy_link;
    
    if (fileLink) {
      window.open(fileLink, '_blank');
    } else {
      toast.error('No file or policy link available');
    }
  };

  const handleEdit = (item: VehicleInsurance) => {
    setSelectedInsurance(item);
    setIsEditModalOpen(true);
  };

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.company_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.registration_no
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.make
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.model
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.concern_person_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.concern_person_mobile
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesCompany = filterCompany
      ? item.company_name === filterCompany
      : true;

    return matchesSearch && matchesCompany;
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

  const companies = [
    ...new Set(
      data
        .map((item) => item.company_name)
        .filter(Boolean)
    ),
  ];

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

        {/* Header - UI Refinement */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Car className="text-indigo-600" size={24} />
                  Vehicle Insurance
                </h1>
                <p className="text-gray-500 text-xs mt-1">
                  Manage all vehicle insurance records
                </p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm hover:shadow-md"
              >
                <Plus size={18} />
                Add New Insurance
              </button>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="p-4 bg-gray-50 rounded-b-xl">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search by company, registration, make or model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition min-w-[200px]"
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Table - UI Refinement */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
           <div className="overflow-auto max-h-[400px]">
            <table className="w-full">
               <thead className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
                <tr className="text-xs uppercase text-gray-600 font-semibold tracking-wider">
                  <th className="px-6 py-4 text-left">S.NO</th>
                  <th className="px-6 py-4 text-center">ACTION</th>
                  <th className="px-6 py-4 text-center">SHARE</th>
                  <th className="px-6 py-4 text-center">DOCUMENT</th>
                  <th className="px-6 py-4 text-left">COMPANY NAME</th>
                  <th className="px-6 py-4 text-left">REGISTRATION NO.</th>
                  <th className="px-6 py-4 text-left">MAKE</th>
                  <th className="px-6 py-4 text-left">MODEL</th>
                  <th className="px-6 py-4 text-left">INSURANCE AGENT</th>
                  <th className="px-6 py-4 text-left">PERIOD</th>
                  <th className="px-6 py-4 text-left">RENEWAL DATE</th>
                  <th className="px-6 py-4 text-right">PREMIUM</th>
                  <th className="px-6 py-4 text-left">ADD ON</th>
                  <th className="px-6 py-4 text-left">CONCERN PERSON</th>
                  <th className="px-6 py-4 text-left">CONCERN MOBILE</th>
                  <th className="px-6 py-4 text-left">CONCERN DEPT</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-indigo-50/30 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-indigo-600">
                        {item.serial_no || `VEH-${item.id}`}
                      </span>
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
                      {(item.file_url || item.policy_link) ? (
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
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap text-sm">
                      {item.company_name}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {item.registration_no}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {item.make}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {item.model}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {item.insurance_agent}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(item.period_from)}
                      <br />
                      to
                      <br />
                      {formatDate(item.period_to)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.need_renewal ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {formatDate(item.renewal_date || '')}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 text-sm">
                      {formatAmount(item.premium_paid)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {item.add_on || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {item.concern_person_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {item.concern_person_mobile || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {item.concern_person_department || '-'}
                    </td>
                  </tr>
                ))}

                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={13} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Car size={48} className="text-gray-300" />
                        <p>No Vehicle Insurance Records Found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddVehicleInsurance
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchVehicleInsurance}
      />

      <EditVehicleInsurance
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedInsurance(null);
        }}
        onSuccess={fetchVehicleInsurance}
        insuranceData={selectedInsurance}
      />

      <ShareVehicleModal
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
  item: VehicleInsurance;
  onShare: (type: 'email' | 'whatsapp' | 'both', item: VehicleInsurance) => void;
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

interface ShareVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'email' | 'whatsapp' | 'both' | null;
  item: VehicleInsurance | null;
}

const ShareVehicleModal: React.FC<ShareVehicleModalProps> = ({
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
      setSubject(`Sharing Vehicle Insurance: ${item.company_name} (${item.registration_no})`);
      setMessage(`Please find the link for the shared Vehicle Insurance document: ${item.company_name} (${item.registration_no}).`);
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

    const docName = `${item.company_name} Vehicle Insurance (${item.registration_no})`;
    const docLink = item.file_url || item.policy_link || 'N/A';

    try {
      await sendWhatsAppMessage({
        to,
        name: recipientName || 'there',
        documentName: docName,
        category: 'Insurance',
        company: item.company_name,
        type: 'Vehicle Insurance',
        link: docLink,
      });

      // Log to Supabase
      const { error } = await supabase.from('Shared_Documents').insert([{
        name: recipientName,
        document_name: docName,
        document_type: 'Vehicle Insurance',
        category: 'Insurance',
        serial_no: item.serial_no || `VEH-${item.id}`,
        image: docLink !== 'N/A' ? docLink : null,
        share_method: 'WhatsApp',
        number: whatsapp,
        source_sheet: 'Vehicle Insurance',
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

    const docName = `${item.company_name} Vehicle Insurance (${item.registration_no})`;
    const docLink = item.file_url || item.policy_link || '';

    try {
      await emailjs.send(
        'service_mkdtlae',
        'template_1912vpj',
        {
          recipient_name: recipientName,
          email: email,
          document_name: docName,
          category: 'Insurance',
          document_type: 'Vehicle Insurance',
          document_link: docLink,
          message: message,
          serial_no: item.serial_no || `VEH-${item.id}`,
          company: item.company_name || '',
        },
        'JN3T3k1LsQ0KSOn-A'
      );

      // Log to Supabase
      const { error } = await supabase.from('Shared_Documents').insert([{
        name: recipientName,
        email: email,
        document_name: docName,
        document_type: 'Vehicle Insurance',
        category: 'Insurance',
        serial_no: item.serial_no || `VEH-${item.id}`,
        image: docLink || null,
        share_method: 'Email',
        source_sheet: 'Vehicle Insurance',
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
              📄 {item.company_name} Vehicle Insurance ({item.registration_no})
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

export default Vehicle;