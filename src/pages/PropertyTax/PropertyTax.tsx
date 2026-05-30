// PropertyTax/PropertyTax.tsx
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  FileText,
  Building2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import supabase from '../../utils/supabase';
import useHeaderStore from '../../store/headerStore';
import AddPropertyTax from './AddPropertyTax';
import EditPropertyTax from './EditPropertyTax';

interface PropertyTax {
  id: string;
  serial_no: string;
  property_name: string;
  property_address: string;
  property_id: string;
  authority_name: string;
  financial_year: string;
  due_date: string;
  amount_paid: number;
  payment_date: string;
  receipt_number: string;
  document_url: string;
  remarks: string;
  created_at: string;
}

const PropertyTax = () => {
  const { setTitle } = useHeaderStore();

  const [data, setData] = useState<PropertyTax[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterAuthority, setFilterAuthority] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTax, setSelectedTax] = useState<PropertyTax | null>(null);

  useEffect(() => {
    setTitle('Property Tax');
    fetchPropertyTax();
  }, []);

  const fetchPropertyTax = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('property_tax')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setData(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load property tax records');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this record?'
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('property_tax')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Deleted Successfully');
      fetchPropertyTax();
    } catch (error) {
      console.error(error);
      toast.error('Delete failed');
    }
  };

  const handleViewDocument = (item: PropertyTax) => {
    const documentLink = item.document_url;
    
    if (documentLink) {
      window.open(documentLink, '_blank');
    } else {
      toast.error('No document available');
    }
  };

  const handleEdit = (item: PropertyTax) => {
    setSelectedTax(item);
    setIsEditModalOpen(true);
  };

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.property_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.property_id
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.authority_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.financial_year
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesAuthority = filterAuthority
      ? item.authority_name === filterAuthority
      : true;

    return matchesSearch && matchesAuthority;
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

  const authorities = [
    ...new Set(
      data
        .map((item) => item.authority_name)
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

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="text-indigo-600" size={24} />
                  Property Tax
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  Manage Property Tax Records
                </p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm hover:shadow-md"
              >
                <Plus size={18} />
                Add New Property Tax
              </button>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="p-6 bg-gray-50 rounded-b-xl">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search Property Tax..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <select
                value={filterAuthority}
                onChange={(e) => setFilterAuthority(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition min-w-[200px]"
              >
                <option value="">All Authorities</option>
                {authorities.map((authority) => (
                  <option key={authority} value={authority}>
                    {authority}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs uppercase text-gray-600 font-semibold tracking-wider">
                  <th className="px-6 py-4 text-left">S.NO</th>
                  <th className="px-6 py-4 text-left">PROPERTY NAME</th>
                  <th className="px-6 py-4 text-left">PROPERTY ADDRESS</th>
                  <th className="px-6 py-4 text-left">PROPERTY ID</th>
                  <th className="px-6 py-4 text-left">AUTHORITY NAME</th>
                  <th className="px-6 py-4 text-left">FINANCIAL YEAR</th>
                  <th className="px-6 py-4 text-left">DUE DATE</th>
                  <th className="px-6 py-4 text-right">AMOUNT PAID</th>
                  <th className="px-6 py-4 text-left">PAYMENT DATE</th>
                  <th className="px-6 py-4 text-left">RECEIPT NUMBER</th>
                  <th className="px-6 py-4 text-center">DOCUMENT</th>
                  <th className="px-6 py-4 text-left">REMARKS</th>
                  <th className="px-6 py-4 text-center">ACTION</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-indigo-50/30 transition">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-indigo-600 whitespace-nowrap">
                        {item.serial_no}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.property_name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.property_address}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.property_id}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.authority_name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.financial_year}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(item.due_date)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {formatAmount(item.amount_paid)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.payment_date ? formatDate(item.payment_date) : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.receipt_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.document_url ? (
                        <button
                          onClick={() => handleViewDocument(item)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition text-sm font-medium"
                        >
                          <FileText size={14} />
                          View
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                      {item.remarks || '-'}
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
                  </tr>
                ))}

                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={13} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 size={48} className="text-gray-300" />
                        <p>No Property Tax Records Found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddPropertyTax
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchPropertyTax}
      />

      <EditPropertyTax
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTax(null);
        }}
        onSuccess={fetchPropertyTax}
        taxData={selectedTax}
      />
    </>
  );
};

export default PropertyTax;